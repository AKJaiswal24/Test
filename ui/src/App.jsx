import React, { useEffect, useMemo, useState } from "react";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";

const fallbackStats = {
  totals: {
    total_alerts: 0,
    active_rules: 7,
    events_seen: 0,
    hosts_seen: 0
  },
  severity: { LOW: 0, MEDIUM: 0, HIGH: 0 },
  top_talkers: [],
  protocols: [],
  recent_alerts: []
};

function useLiveStats() {
  const [stats, setStats] = useState(fallbackStats);
  const [alerts, setAlerts] = useState([]);
  const [rules, setRules] = useState([]);
  const [status, setStatus] = useState("Connecting");

  useEffect(() => {
    let mounted = true;

    const fetchStats = async () => {
      try {
        const res = await fetch(`${API_BASE}/stats`);
        const data = await res.json();
        if (mounted) {
          setStats(data);
          setStatus("Live");
        }
      } catch (err) {
        if (mounted) setStatus("Offline");
      }
    };

    const fetchAlerts = async () => {
      try {
        const res = await fetch(`${API_BASE}/alerts?limit=50`);
        const data = await res.json();
        if (mounted) setAlerts(data);
      } catch (err) {
        if (mounted) setAlerts([]);
      }
    };

    const fetchRules = async () => {
      try {
        const res = await fetch(`${API_BASE}/rules`);
        const data = await res.json();
        if (mounted) setRules(data);
      } catch (err) {
        if (mounted) setRules([]);
      }
    };

    fetchStats();
    fetchAlerts();
    fetchRules();
    const interval = setInterval(fetchStats, 2000);
    const alertInterval = setInterval(fetchAlerts, 4000);

    return () => {
      mounted = false;
      clearInterval(interval);
      clearInterval(alertInterval);
    };
  }, []);

  useEffect(() => {
    let ws;
    try {
      const wsUrl = API_BASE.replace("https://", "wss://")
        .replace("http://", "ws://")
        .concat("/stream");
      ws = new WebSocket(wsUrl);
      ws.onopen = () => setStatus("Live");
      ws.onmessage = (event) => {
        const alert = JSON.parse(event.data);
        setAlerts((prev) => [alert, ...prev].slice(0, 50));
      };
      ws.onclose = () => setStatus("Offline");
    } catch (err) {
      setStatus("Offline");
    }
    return () => {
      if (ws) ws.close();
    };
  }, []);

  const toggleRule = async (id, enabled) => {
    try {
      const res = await fetch(`${API_BASE}/rules/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled })
      });
      const data = await res.json();
      setRules((prev) => prev.map((rule) => (rule.id === data.id ? data : rule)));
    } catch (err) {
      // ignore
    }
  };

  return { stats, alerts, rules, status, toggleRule };
}

function severityTone(sev) {
  switch (sev) {
    case "HIGH":
      return "sev-high";
    case "MEDIUM":
      return "sev-med";
    default:
      return "sev-low";
  }
}

function App() {
  const { stats, alerts, rules, status, toggleRule } = useLiveStats();
  const alertTrend = useMemo(() => {
    const samples = new Array(18).fill(0);
    alerts.forEach((alert, idx) => {
      samples[idx % samples.length] += 1;
    });
    return samples.reverse();
  }, [alerts]);

  return (
    <div className="app">
      <header className="hero">
        <div>
          <p className="tag">IntruShield IDS</p>
          <h1>Unified Network + Host Intrusion Detection</h1>
          <p className="subtitle">
            Live telemetry, adaptive rules, and real-time alerts on your laptop.
          </p>
        </div>
        <div className="status-card">
          <span className={`status-dot ${status === "Live" ? "live" : "offline"}`} />
          <div>
            <p className="status-label">Engine Status</p>
            <p className="status-value">{status}</p>
            <p className="status-meta">Streaming alerts over WebSocket</p>
          </div>
        </div>
      </header>

      <section className="kpis">
        <div className="card">
          <p>Total Alerts</p>
          <h2>{stats.totals.total_alerts}</h2>
          <span className="muted">Last 24h</span>
        </div>
        <div className="card">
          <p>Active Rules</p>
          <h2>{stats.totals.active_rules}</h2>
          <span className="muted">Signature + anomaly</span>
        </div>
        <div className="card">
          <p>Events Seen</p>
          <h2>{stats.totals.events_seen}</h2>
          <span className="muted">Packets + host signals</span>
        </div>
        <div className="card">
          <p>Hosts Observed</p>
          <h2>{stats.totals.hosts_seen}</h2>
          <span className="muted">Unique source IPs</span>
        </div>
      </section>

      <section className="grid">
        <div className="card chart">
          <div className="card-header">
            <h3>Alert Pulse</h3>
            <span className="muted">Most recent 18 signals</span>
          </div>
          <div className="bars">
            {alertTrend.map((value, idx) => (
              <span
                key={idx}
                className="bar"
                style={{ height: `${Math.min(100, 20 + value * 12)}%` }}
              />
            ))}
          </div>
          <div className="legend">
            <span className="chip high">High {stats.severity.HIGH}</span>
            <span className="chip med">Medium {stats.severity.MEDIUM}</span>
            <span className="chip low">Low {stats.severity.LOW}</span>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3>Top Talkers</h3>
            <span className="muted">Most active source IPs</span>
          </div>
          <div className="list">
            {stats.top_talkers.length === 0 && (
              <p className="muted">No traffic yet. Start the sensor.</p>
            )}
            {stats.top_talkers.map((item) => (
              <div className="list-row" key={item.ip}>
                <span>{item.ip}</span>
                <strong>{item.count}</strong>
              </div>
            ))}
          </div>
          <div className="proto">
            {stats.protocols.map((proto) => (
              <div className="proto-row" key={proto.name}>
                <span>{proto.name}</span>
                <div className="proto-bar">
                  <div
                    style={{
                      width: `${Math.min(100, proto.count * 6)}%`
                    }}
                  />
                </div>
                <strong>{proto.count}</strong>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid wide">
        <div className="card">
          <div className="card-header">
            <h3>Live Alerts</h3>
            <span className="muted">Newest first</span>
          </div>
          <div className="table">
            <div className="table-head">
              <span>Severity</span>
              <span>Title</span>
              <span>Source</span>
              <span>Destination</span>
            </div>
            {alerts.length === 0 && (
              <div className="table-row muted">No alerts yet. Try demo mode.</div>
            )}
            {alerts.map((alert) => (
              <div className="table-row" key={alert.id}>
                <span className={`pill ${severityTone(alert.severity)}`}>
                  {alert.severity}
                </span>
                <span>{alert.title}</span>
                <span>{alert.src_ip || "Host"}</span>
                <span>{alert.dst_ip || alert.details?.raddr || "-"}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3>Rule Control</h3>
            <span className="muted">Toggle detection logic live</span>
          </div>
          <div className="rules">
            {rules.map((rule) => (
              <div className="rule" key={rule.id}>
                <div>
                  <p className="rule-title">{rule.name}</p>
                  <p className="muted">{rule.description}</p>
                </div>
                <button
                  className={`toggle ${rule.enabled ? "on" : "off"}`}
                  onClick={() => toggleRule(rule.id, !rule.enabled)}
                >
                  {rule.enabled ? "Enabled" : "Disabled"}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

export default App;
