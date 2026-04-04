import argparse
import queue
import socket
import threading
import time
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

import psutil
import requests
from scapy.all import DNS, DNSQR, IP, TCP, UDP, sniff  # type: ignore


def iso_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def get_local_ip() -> str:
    try:
        hostname = socket.gethostname()
        return socket.gethostbyname(hostname)
    except Exception:
        return "127.0.0.1"


class EventSender:
    def __init__(self, api_url: str, batch_size: int = 25, flush_sec: float = 1.5):
        self.api_url = api_url.rstrip("/")
        self.batch_size = batch_size
        self.flush_sec = flush_sec
        self.queue: "queue.Queue[Dict[str, Any]]" = queue.Queue()
        self._stop = threading.Event()

    def start(self) -> None:
        thread = threading.Thread(target=self._run, daemon=True)
        thread.start()

    def stop(self) -> None:
        self._stop.set()

    def send(self, event: Dict[str, Any]) -> None:
        self.queue.put(event)

    def _run(self) -> None:
        buffer: List[Dict[str, Any]] = []
        last_flush = time.time()
        while not self._stop.is_set():
            try:
                event = self.queue.get(timeout=0.2)
                buffer.append(event)
            except queue.Empty:
                pass

            now = time.time()
            if buffer and (len(buffer) >= self.batch_size or (now - last_flush) >= self.flush_sec):
                payload = {"events": buffer}
                try:
                    requests.post(
                        f"{self.api_url}/ingest/batch",
                        json=payload,
                        timeout=1.5,
                    )
                except requests.RequestException:
                    pass
                buffer = []
                last_flush = now


class NetworkSensor:
    def __init__(self, sender: EventSender, iface: Optional[str]):
        self.sender = sender
        self.iface = iface

    def start(self) -> None:
        thread = threading.Thread(target=self._sniff_loop, daemon=True)
        thread.start()

    def _sniff_loop(self) -> None:
        sniff(prn=self._handle_packet, iface=self.iface, store=False)

    def _handle_packet(self, pkt) -> None:
        if IP not in pkt:
            return

        ip_layer = pkt[IP]
        event: Dict[str, Any] = {
            "ts": iso_now(),
            "ts_epoch": float(pkt.time),
            "type": "net",
            "src_ip": ip_layer.src,
            "dst_ip": ip_layer.dst,
            "bytes": len(pkt),
        }

        if TCP in pkt:
            tcp = pkt[TCP]
            event.update(
                {
                    "proto": "TCP",
                    "src_port": int(tcp.sport),
                    "dst_port": int(tcp.dport),
                    "flags": str(tcp.flags),
                }
            )
        elif UDP in pkt:
            udp = pkt[UDP]
            event.update(
                {
                    "proto": "UDP",
                    "src_port": int(udp.sport),
                    "dst_port": int(udp.dport),
                }
            )

        if DNS in pkt and DNSQR in pkt:
            dns = pkt[DNSQR]
            try:
                query = dns.qname.decode(errors="ignore").strip(".")
            except Exception:
                query = None
            if query:
                event["dns_query"] = query

        self.sender.send(event)


class HostSensor:
    def __init__(self, sender: EventSender, interval_sec: float = 3.0):
        self.sender = sender
        self.interval_sec = interval_sec
        self._seen_pids: set[int] = set()
        self._seen_conns: set[str] = set()

    def start(self) -> None:
        thread = threading.Thread(target=self._loop, daemon=True)
        thread.start()

    def _loop(self) -> None:
        while True:
            self._collect_processes()
            self._collect_connections()
            self._collect_metrics()
            time.sleep(self.interval_sec)

    def _collect_processes(self) -> None:
        for proc in psutil.process_iter(["pid", "name", "username", "cmdline"]):
            pid = proc.info.get("pid")
            if pid in self._seen_pids:
                continue
            self._seen_pids.add(pid)
            self.sender.send(
                {
                    "ts": iso_now(),
                    "type": "host_process",
                    "pid": pid,
                    "process_name": proc.info.get("name"),
                    "user": proc.info.get("username"),
                    "cmdline": " ".join(proc.info.get("cmdline") or []),
                }
            )

    def _collect_connections(self) -> None:
        try:
            conns = psutil.net_connections(kind="inet")
        except Exception:
            return
        for conn in conns:
            if not conn.raddr:
                continue
            laddr = f"{conn.laddr.ip}:{conn.laddr.port}"
            raddr = f"{conn.raddr.ip}:{conn.raddr.port}"
            key = f"{conn.pid}:{laddr}->{raddr}"
            if key in self._seen_conns:
                continue
            self._seen_conns.add(key)
            name = None
            if conn.pid:
                try:
                    name = psutil.Process(conn.pid).name()
                except Exception:
                    name = None
            self.sender.send(
                {
                    "ts": iso_now(),
                    "type": "host_connection",
                    "pid": conn.pid,
                    "process_name": name,
                    "laddr": laddr,
                    "raddr": raddr,
                    "status": conn.status,
                }
            )

    def _collect_metrics(self) -> None:
        cpu = psutil.cpu_percent(interval=None)
        mem = psutil.virtual_memory().percent
        self.sender.send(
            {
                "ts": iso_now(),
                "type": "host_metric",
                "cpu": cpu,
                "mem": mem,
            }
        )


def run_demo(sender: EventSender) -> None:
    local_ip = get_local_ip()
    while True:
        now = iso_now()
        sender.send(
            {
                "ts": now,
                "type": "net",
                "src_ip": local_ip,
                "dst_ip": "203.0.113.10",
                "dst_port": 22,
                "src_port": 53211,
                "proto": "TCP",
                "bytes": 4200,
                "flags": "S",
            }
        )
        sender.send(
            {
                "ts": now,
                "type": "net",
                "src_ip": local_ip,
                "dst_ip": "198.51.100.42",
                "dst_port": 53,
                "src_port": 53311,
                "proto": "UDP",
                "bytes": 1600,
                "dns_query": "very.long.subdomain.demo.attack.example.com",
            }
        )
        sender.send(
            {
                "ts": now,
                "type": "host_process",
                "pid": 4242,
                "process_name": "powershell.exe",
                "cmdline": "powershell -enc ZABlAG0Abw==",
            }
        )
        time.sleep(3)


def main() -> None:
    parser = argparse.ArgumentParser(description="IntruShield IDS Sensor")
    parser.add_argument("--api", default="http://127.0.0.1:8000", help="Backend API base URL")
    parser.add_argument("--iface", default=None, help="Network interface name for sniffing")
    parser.add_argument("--demo", action="store_true", help="Emit demo events")
    args = parser.parse_args()

    sender = EventSender(args.api)
    sender.start()

    if args.demo:
        run_demo(sender)
        return

    NetworkSensor(sender, args.iface).start()
    HostSensor(sender).start()

    while True:
        time.sleep(1)


if __name__ == "__main__":
    main()
