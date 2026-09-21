"""Runtime configuration, read once from the environment. Import fails fast if required values are missing."""

import os

REQUIRED = ("DATABASE_URL", "OSRM_URL", "SECRET_KEY")

_missing = [name for name in REQUIRED if not os.environ.get(name, "").strip()]
if _missing:
    raise RuntimeError(f"Missing required environment variables: {', '.join(_missing)}")

DATABASE_URL = os.environ["DATABASE_URL"].strip()
OSRM_URL = os.environ["OSRM_URL"].strip().rstrip("/")
SECRET_KEY = os.environ["SECRET_KEY"].strip()
# How long a login stays valid. The frontend's session cookie expires with the token.
JWT_EXPIRE_MINUTES = int(os.environ.get("JWT_EXPIRE_MINUTES", str(7 * 24 * 60)))
OSRM_TABLE_BLOCK = int(os.environ.get("OSRM_TABLE_BLOCK", "100"))

# Jobs queued or running at once before /process-routes/start answers 429.
MAX_PENDING_JOBS = int(os.environ.get("MAX_PENDING_JOBS", "5"))
# How long a finished job's result stays available for polling.
JOB_RESULT_TTL_S = float(os.environ.get("JOB_RESULT_TTL_S", "3600"))

# Largest workbook /process-routes/start accepts. Vercel's proxy caps whole requests at 4 MB anyway.
MAX_UPLOAD_BYTES = int(os.environ.get("MAX_UPLOAD_BYTES", str(4 * 1024 * 1024)))
