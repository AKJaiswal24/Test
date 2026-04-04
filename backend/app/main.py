import asyncio
import json
from typing import Any, Dict, List

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from . import db
from .detectors import Detector
from .rules import DEFAULT_RULES
from .schemas import AlertOut, EventIn, EventsBatchIn, RuleOut, RuleUpdateIn, StatsOut


class RuleStore:
    def __init__(self):
        self._rules: Dict[str, Dict[str, Any]] = {}

    def load(self) -> None:
        rules = db.list_rules()
        if not rules:
            for rule in DEFAULT_RULES:
                db.upsert_rule(rule)
            rules = db.list_rules()
        self._rules = {rule["id"]: rule for rule in rules}

    def all(self) -> List[Dict[str, Any]]:
        return list(self._rules.values())

    def get(self, rule_id: str) -> Dict[str, Any]:
        return self._rules.get(rule_id)

    def update_enabled(self, rule_id: str, enabled: bool) -> None:
        db.update_rule_enabled(rule_id, enabled)
        rule = self._rules.get(rule_id)
        if rule:
            rule["enabled"] = enabled
        else:
            db_rule = db.get_rule(rule_id)
            if db_rule:
                self._rules[rule_id] = db_rule


class ConnectionManager:
    def __init__(self):
        self.active: List[WebSocket] = []

    async def connect(self, websocket: WebSocket) -> None:
        await websocket.accept()
        self.active.append(websocket)

    def disconnect(self, websocket: WebSocket) -> None:
        if websocket in self.active:
            self.active.remove(websocket)

    async def broadcast(self, message: Dict[str, Any]) -> None:
        if not self.active:
            return
        payload = json.dumps(message, ensure_ascii=True)
        living: List[WebSocket] = []
        for ws in self.active:
            try:
                await ws.send_text(payload)
                living.append(ws)
            except WebSocketDisconnect:
                continue
        self.active = living


db.init_db()
rule_store = RuleStore()
rule_store.load()
detector = Detector(rule_store.get)
manager = ConnectionManager()

app = FastAPI(title="IntruShield IDS", version="0.1")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> Dict[str, str]:
    return {"status": "ok"}


@app.post("/ingest")
async def ingest_event(event: EventIn) -> Dict[str, Any]:
    event_dict = event.dict()
    db.insert_event(event_dict)
    alerts = detector.process_event(event_dict)
    stored = []
    for alert in alerts:
        alert_id = db.insert_alert(alert)
        payload = {"id": alert_id, **alert}
        stored.append(payload)
        await manager.broadcast(payload)
    return {"stored": True, "alerts": stored}


@app.post("/ingest/batch")
async def ingest_batch(batch: EventsBatchIn) -> Dict[str, Any]:
    stored_alerts = []
    for event in batch.events:
        event_dict = event.dict()
        db.insert_event(event_dict)
        alerts = detector.process_event(event_dict)
        for alert in alerts:
            alert_id = db.insert_alert(alert)
            payload = {"id": alert_id, **alert}
            stored_alerts.append(payload)
            asyncio.create_task(manager.broadcast(payload))
    return {"stored": True, "alerts": stored_alerts}


@app.get("/alerts", response_model=List[AlertOut])
def get_alerts(limit: int = 100, offset: int = 0):
    return db.list_alerts(limit=limit, offset=offset)


@app.get("/events")
def get_events(limit: int = 200, offset: int = 0):
    return db.list_events(limit=limit, offset=offset)


@app.get("/rules", response_model=List[RuleOut])
def get_rules():
    return rule_store.all()


@app.post("/rules/{rule_id}", response_model=RuleOut)
def update_rule(rule_id: str, payload: RuleUpdateIn):
    rule_store.update_enabled(rule_id, payload.enabled)
    return rule_store.get(rule_id)


@app.get("/stats", response_model=StatsOut)
def get_stats():
    alerts = db.list_alerts(limit=200)
    events = db.list_events(limit=1000)
    severity: Dict[str, int] = {"LOW": 0, "MEDIUM": 0, "HIGH": 0}
    for alert in alerts:
        sev = (alert.get("severity") or "MEDIUM").upper()
        severity[sev] = severity.get(sev, 0) + 1

    top_talkers: Dict[str, int] = {}
    protocols: Dict[str, int] = {}
    for event in events:
        src = event.get("src_ip")
        if src:
            top_talkers[src] = top_talkers.get(src, 0) + 1
        proto = event.get("proto")
        if proto:
            protocols[proto] = protocols.get(proto, 0) + 1

    talker_list = [
        {"ip": ip, "count": count}
        for ip, count in sorted(top_talkers.items(), key=lambda item: item[1], reverse=True)[:5]
    ]
    proto_list = [
        {"name": name, "count": count}
        for name, count in sorted(protocols.items(), key=lambda item: item[1], reverse=True)
    ]

    totals = {
        "total_alerts": db.count_alerts(),
        "active_rules": db.count_rules_enabled(),
        "events_seen": len(events),
        "hosts_seen": len({event.get("src_ip") for event in events if event.get("src_ip")}),
    }
    return {
        "totals": totals,
        "severity": severity,
        "top_talkers": talker_list,
        "protocols": proto_list,
        "recent_alerts": alerts[:8],
    }


@app.websocket("/stream")
async def stream_alerts(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)
