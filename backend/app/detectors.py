import time
from collections import defaultdict, deque
from typing import Any, Deque, Dict, List, Optional

from .config import ALERT_DEDUP_WINDOW_SEC


class Detector:
    def __init__(self, rule_lookup):
        self.rule_lookup = rule_lookup
        self.port_scan_ports: Dict[str, Dict[int, float]] = defaultdict(dict)
        self.byte_windows: Dict[str, Deque[tuple[float, int]]] = defaultdict(deque)
        self.byte_baseline: Dict[str, float] = defaultdict(float)
        self.last_alert: Dict[str, float] = {}

    def _dedup(self, key: str) -> bool:
        now = time.time()
        last = self.last_alert.get(key)
        if last and (now - last) < ALERT_DEDUP_WINDOW_SEC:
            return True
        self.last_alert[key] = now
        return False

    def process_event(self, event: Dict[str, Any]) -> List[Dict[str, Any]]:
        alerts: List[Dict[str, Any]] = []
        event_type = event.get("type", "")
        if event_type == "net":
            alerts.extend(self._check_port_scan(event))
            alerts.extend(self._check_suspicious_port(event))
            alerts.extend(self._check_dns(event))
            alerts.extend(self._check_outbound_spike(event))
        elif event_type == "host_process":
            alert = self._check_suspicious_process(event)
            if alert:
                alerts.append(alert)
        elif event_type == "host_connection":
            alert = self._check_host_connection(event)
            if alert:
                alerts.append(alert)
        elif event_type == "host_metric":
            alert = self._check_host_metric(event)
            if alert:
                alerts.append(alert)
        return alerts

    def _check_port_scan(self, event: Dict[str, Any]) -> List[Dict[str, Any]]:
        rule = self.rule_lookup("rule_port_scan")
        if not rule or not rule["enabled"]:
            return []

        src_ip = event.get("src_ip")
        dst_port = event.get("dst_port")
        ts = _to_ts(event)
        if not src_ip or not dst_port:
            return []

        window = int(rule["config"].get("window_sec", 30))
        threshold = int(rule["config"].get("unique_ports", 12))

        ports = self.port_scan_ports[src_ip]
        ports[dst_port] = ts
        for port, seen in list(ports.items()):
            if ts - seen > window:
                ports.pop(port, None)

        if len(ports) >= threshold:
            key = f"portscan:{src_ip}"
            if self._dedup(key):
                return []
            return [
                _alert(
                    event,
                    rule,
                    title="Port scan suspected",
                    details={"unique_ports": len(ports), "window_sec": window},
                )
            ]
        return []

    def _check_suspicious_port(self, event: Dict[str, Any]) -> List[Dict[str, Any]]:
        rule = self.rule_lookup("rule_suspicious_port")
        if not rule or not rule["enabled"]:
            return []

        dst_port = event.get("dst_port")
        if dst_port is None:
            return []
        if dst_port in rule["config"].get("ports", []):
            key = f"susport:{event.get('src_ip')}:{dst_port}"
            if self._dedup(key):
                return []
            return [
                _alert(
                    event,
                    rule,
                    title="High-risk port contact",
                    details={"dst_port": dst_port},
                )
            ]
        return []

    def _check_dns(self, event: Dict[str, Any]) -> List[Dict[str, Any]]:
        rule = self.rule_lookup("rule_dns_tunnel")
        if not rule or not rule["enabled"]:
            return []

        query = event.get("dns_query")
        if not query:
            return []
        length_threshold = int(rule["config"].get("length_threshold", 35))
        dot_threshold = int(rule["config"].get("dot_threshold", 4))
        if len(query) >= length_threshold or query.count(".") >= dot_threshold:
            key = f"dns:{event.get('src_ip')}:{query[:20]}"
            if self._dedup(key):
                return []
            return [
                _alert(
                    event,
                    rule,
                    title="Suspicious DNS query",
                    details={"query": query},
                )
            ]
        return []

    def _check_outbound_spike(self, event: Dict[str, Any]) -> List[Dict[str, Any]]:
        rule = self.rule_lookup("rule_outbound_spike")
        if not rule or not rule["enabled"]:
            return []

        src_ip = event.get("src_ip")
        bytes_len = event.get("bytes")
        ts = _to_ts(event)
        if not src_ip or not bytes_len:
            return []

        window = int(rule["config"].get("window_sec", 60))
        multiplier = float(rule["config"].get("multiplier", 4.0))
        min_bytes = int(rule["config"].get("min_bytes", 200000))

        window_deque = self.byte_windows[src_ip]
        window_deque.append((ts, int(bytes_len)))
        while window_deque and (ts - window_deque[0][0]) > window:
            window_deque.popleft()

        current = sum(item[1] for item in window_deque)
        baseline = self.byte_baseline[src_ip]
        if baseline == 0:
            baseline = float(current)
        baseline = baseline * 0.9 + current * 0.1
        self.byte_baseline[src_ip] = baseline

        if current > max(min_bytes, baseline * multiplier):
            key = f"spike:{src_ip}"
            if self._dedup(key):
                return []
            return [
                _alert(
                    event,
                    rule,
                    title="Outbound traffic spike",
                    details={"window_bytes": current, "baseline": int(baseline)},
                )
            ]
        return []

    def _check_suspicious_process(self, event: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        rule = self.rule_lookup("rule_proc_suspicious")
        if not rule or not rule["enabled"]:
            return None

        name = (event.get("process_name") or "").lower()
        cmdline = (event.get("cmdline") or "").lower()
        keywords = [kw.lower() for kw in rule["config"].get("keywords", [])]
        flags = [flag.lower() for flag in rule["config"].get("powershell_flags", [])]

        matched = next((kw for kw in keywords if kw in name or kw in cmdline), None)
        flagged_ps = "powershell" in name and any(flag in cmdline for flag in flags)
        if matched or flagged_ps:
            key = f"proc:{event.get('pid')}:{matched or 'ps'}"
            if self._dedup(key):
                return None
            return _alert(
                event,
                rule,
                title="Suspicious process detected",
                details={
                    "process": event.get("process_name"),
                    "cmdline": event.get("cmdline"),
                    "match": matched or "encoded-powershell",
                },
            )
        return None

    def _check_host_connection(self, event: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        rule = self.rule_lookup("rule_host_suspicious_conn")
        if not rule or not rule["enabled"]:
            return None

        raddr = event.get("raddr") or ""
        rport = None
        if ":" in raddr:
            try:
                rport = int(raddr.split(":")[-1])
            except ValueError:
                rport = None
        if rport and rport in rule["config"].get("ports", []):
            key = f"hostconn:{event.get('pid')}:{rport}"
            if self._dedup(key):
                return None
            return _alert(
                event,
                rule,
                title="Suspicious outbound connection",
                details={
                    "process": event.get("process_name"),
                    "raddr": raddr,
                },
            )
        return None

    def _check_host_metric(self, event: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        rule = self.rule_lookup("rule_host_high_cpu")
        if not rule or not rule["enabled"]:
            return None

        threshold = float(rule["config"].get("threshold", 90))
        cpu = event.get("cpu")
        if cpu is None:
            return None
        if cpu >= threshold:
            key = f"cpu:{int(cpu)}"
            if self._dedup(key):
                return None
            return _alert(
                event,
                rule,
                title="High CPU utilization",
                details={"cpu": cpu, "mem": event.get("mem")},
            )
        return None


def _to_ts(event: Dict[str, Any]) -> float:
    ts = event.get("ts_epoch")
    if ts:
        return float(ts)
    try:
        return float(event.get("_ts", 0))
    except (TypeError, ValueError):
        return time.time()


def _alert(
    event: Dict[str, Any], rule: Dict[str, Any], title: str, details: Dict[str, Any]
) -> Dict[str, Any]:
    return {
        "ts": event.get("ts"),
        "severity": rule.get("severity", "MEDIUM"),
        "title": title,
        "rule_id": rule.get("id"),
        "src_ip": event.get("src_ip"),
        "dst_ip": event.get("dst_ip"),
        "details": details,
        "event": event,
    }
