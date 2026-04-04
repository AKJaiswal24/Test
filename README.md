# IntruShield IDS (Hackathon Build)

This is a laptop-first Network + Host IDS with a live dashboard, rule toggles, and real-time alerts.

## Quick Start (Windows PowerShell)

### 1) Backend API
```
cd D:\IntruShield\backend
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 2) Sensor (Network + Host)
Open a new PowerShell window **as Administrator**:
```
cd D:\IntruShield\sensor
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
python agent.py --api http://127.0.0.1:8000
```

If you need to specify a network interface:
```
python agent.py --api http://127.0.0.1:8000 --iface "Wi-Fi"
```

Demo mode (synthetic alerts):
```
python agent.py --api http://127.0.0.1:8000 --demo
```

### 3) UI Dashboard
```
cd D:\IntruShield\ui
npm install
npm run dev
```

Open `http://localhost:5173`

## What It Detects
- Port scan bursts
- High-risk port contacts
- Suspicious DNS queries
- Outbound traffic spikes
- Suspicious processes (mimikatz, netcat, encoded PowerShell)
- Suspicious outbound host connections
- High CPU utilization

## Demo Tips
- Use `--demo` to instantly populate the UI.
- Toggle rules in the UI to show live control.
