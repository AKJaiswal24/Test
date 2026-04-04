from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class EventIn(BaseModel):
    ts: str = Field(..., description="ISO timestamp")
    ts_epoch: Optional[float] = None
    type: str = Field(..., description="Event type")
    src_ip: Optional[str] = None
    dst_ip: Optional[str] = None
    src_port: Optional[int] = None
    dst_port: Optional[int] = None
    proto: Optional[str] = None
    bytes: Optional[int] = None
    flags: Optional[str] = None
    dns_query: Optional[str] = None
    pid: Optional[int] = None
    process_name: Optional[str] = None
    user: Optional[str] = None
    cmdline: Optional[str] = None
    laddr: Optional[str] = None
    raddr: Optional[str] = None
    status: Optional[str] = None
    cpu: Optional[float] = None
    mem: Optional[float] = None
    data: Optional[Dict[str, Any]] = None


class EventsBatchIn(BaseModel):
    events: List[EventIn]


class AlertOut(BaseModel):
    id: int
    ts: str
    severity: str
    title: str
    rule_id: str
    src_ip: Optional[str]
    dst_ip: Optional[str]
    details: Optional[Dict[str, Any]] = None
    event: Optional[Dict[str, Any]] = None
    data: Dict[str, Any]


class RuleOut(BaseModel):
    id: str
    name: str
    enabled: bool
    severity: str
    description: str
    config: Dict[str, Any]


class RuleUpdateIn(BaseModel):
    enabled: bool


class StatsOut(BaseModel):
    totals: Dict[str, Any]
    severity: Dict[str, int]
    top_talkers: List[Dict[str, Any]]
    protocols: List[Dict[str, Any]]
    recent_alerts: List[Dict[str, Any]]
