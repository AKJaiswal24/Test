import os

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

DB_PATH = os.environ.get("IDS_DB_PATH", os.path.join(BASE_DIR, "ids.db"))
API_HOST = os.environ.get("IDS_API_HOST", "0.0.0.0")
API_PORT = int(os.environ.get("IDS_API_PORT", "8000"))

ALERT_DEDUP_WINDOW_SEC = int(os.environ.get("IDS_ALERT_DEDUP_SEC", "60"))
