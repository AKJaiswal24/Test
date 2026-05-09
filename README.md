# Start2Rent

Start2Rent is a full-stack rental marketplace split into two apps:

- `backend/` — Express + MongoDB API
- `frontend/` — React (Create React App) UI

Payment method is currently **Cash on Delivery (COD)** (no payment gateway integrated yet).

## Run locally (recommended)

### Backend (API)

```bash
cd backend
npm install
copy .env.example .env
npm start
```

API runs on `http://localhost:5000`.

### Frontend (UI)

```bash
cd frontend
npm install
copy .env.example .env
npm start
```

Frontend runs on `http://localhost:3000`.

## Run via npm workspaces (optional)

From repo root:

```bash
npm -w backend start
npm -w frontend start
```

