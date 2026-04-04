import json
import sqlite3
import threading
from typing import Any, Dict, List, Optional

from .config import DB_PATH

_lock = threading.Lock()
_conn = sqlite3.connect(DB_PATH, check_same_thread=False)
_conn.row_factory = sqlite3.Row


def init_db() -> None:
    with _lock:
        _conn.execute(
            """
            CREATE TABLE IF NOT EXISTS events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                ts TEXT NOT NULL,
                type TEXT NOT NULL,
                src_ip TEXT,
                dst_ip TEXT,
                dst_port INTEGER,
                proto TEXT,
                bytes INTEGER,
                data TEXT NOT NULL
            );
            """
        )
        _conn.execute(
            """
            CREATE TABLE IF NOT EXISTS alerts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                ts TEXT NOT NULL,
                severity TEXT NOT NULL,
                title TEXT NOT NULL,
                rule_id TEXT NOT NULL,
                src_ip TEXT,
                dst_ip TEXT,
                data TEXT NOT NULL
            );
            """
        )
        _conn.execute(
            """
            CREATE TABLE IF NOT EXISTS rules (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                enabled INTEGER NOT NULL,
                severity TEXT NOT NULL,
                description TEXT NOT NULL,
                config TEXT NOT NULL
            );
            """
        )
        _conn.commit()


def insert_event(event: Dict[str, Any]) -> int:
    payload = json.dumps(event, ensure_ascii=True)
    with _lock:
        cur = _conn.execute(
            """
            INSERT INTO events (ts, type, src_ip, dst_ip, dst_port, proto, bytes, data)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?);
            """,
            (
                event.get("ts"),
                event.get("type"),
                event.get("src_ip"),
                event.get("dst_ip"),
                event.get("dst_port"),
                event.get("proto"),
                event.get("bytes"),
                payload,
            ),
        )
        _conn.commit()
        return int(cur.lastrowid)


def insert_alert(alert: Dict[str, Any]) -> int:
    payload = json.dumps(alert, ensure_ascii=True)
    with _lock:
        cur = _conn.execute(
            """
            INSERT INTO alerts (ts, severity, title, rule_id, src_ip, dst_ip, data)
            VALUES (?, ?, ?, ?, ?, ?, ?);
            """,
            (
                alert.get("ts"),
                alert.get("severity"),
                alert.get("title"),
                alert.get("rule_id"),
                alert.get("src_ip"),
                alert.get("dst_ip"),
                payload,
            ),
        )
        _conn.commit()
        return int(cur.lastrowid)


def list_alerts(limit: int = 100, offset: int = 0) -> List[Dict[str, Any]]:
    with _lock:
        cur = _conn.execute(
            """
            SELECT * FROM alerts
            ORDER BY id DESC
            LIMIT ? OFFSET ?;
            """,
            (limit, offset),
        )
        rows = cur.fetchall()
    alerts: List[Dict[str, Any]] = []
    for row in rows:
        base = dict(row)
        payload = json.loads(row["data"])
        base.update(payload)
        base["data"] = payload
        alerts.append(base)
    return alerts


def list_events(limit: int = 200, offset: int = 0) -> List[Dict[str, Any]]:
    with _lock:
        cur = _conn.execute(
            """
            SELECT * FROM events
            ORDER BY id DESC
            LIMIT ? OFFSET ?;
            """,
            (limit, offset),
        )
        rows = cur.fetchall()
    return [dict(row) | {"data": json.loads(row["data"])} for row in rows]


def list_rules() -> List[Dict[str, Any]]:
    with _lock:
        cur = _conn.execute("SELECT * FROM rules ORDER BY name ASC;")
        rows = cur.fetchall()
    rules: List[Dict[str, Any]] = []
    for row in rows:
        data = dict(row)
        data["enabled"] = bool(data["enabled"])
        data["config"] = json.loads(data["config"])
        rules.append(data)
    return rules


def get_rule(rule_id: str) -> Optional[Dict[str, Any]]:
    with _lock:
        cur = _conn.execute("SELECT * FROM rules WHERE id = ?;", (rule_id,))
        row = cur.fetchone()
    if not row:
        return None
    data = dict(row)
    data["enabled"] = bool(data["enabled"])
    data["config"] = json.loads(data["config"])
    return data


def upsert_rule(rule: Dict[str, Any]) -> None:
    with _lock:
        _conn.execute(
            """
            INSERT INTO rules (id, name, enabled, severity, description, config)
            VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                name = excluded.name,
                enabled = excluded.enabled,
                severity = excluded.severity,
                description = excluded.description,
                config = excluded.config;
            """,
            (
                rule["id"],
                rule["name"],
                int(rule.get("enabled", True)),
                rule["severity"],
                rule["description"],
                json.dumps(rule.get("config", {}), ensure_ascii=True),
            ),
        )
        _conn.commit()


def update_rule_enabled(rule_id: str, enabled: bool) -> None:
    with _lock:
        _conn.execute(
            "UPDATE rules SET enabled = ? WHERE id = ?;",
            (int(enabled), rule_id),
        )
        _conn.commit()


def count_alerts() -> int:
    with _lock:
        cur = _conn.execute("SELECT COUNT(*) AS cnt FROM alerts;")
        return int(cur.fetchone()["cnt"])


def count_rules_enabled() -> int:
    with _lock:
        cur = _conn.execute("SELECT COUNT(*) AS cnt FROM rules WHERE enabled = 1;")
        return int(cur.fetchone()["cnt"])
