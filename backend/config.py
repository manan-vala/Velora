"""Runtime configuration, read once from the environment. Import fails fast if required values are missing."""

import os

REQUIRED = ("DATABASE_URL", "OSRM_URL", "SECRET_KEY", "SUPERADMIN_USERNAME", "SUPERADMIN_PASSWORD")

_missing = [name for name in REQUIRED if not os.environ.get(name, "").strip()]
if _missing:
    raise RuntimeError(f"Missing required environment variables: {', '.join(_missing)}")

DATABASE_URL = os.environ["DATABASE_URL"].strip()
OSRM_URL = os.environ["OSRM_URL"].strip().rstrip("/")
SECRET_KEY = os.environ["SECRET_KEY"].strip()

# The one account that can manage users. Created on startup, and kept in step with these
# values on every restart, so changing the password here rotates it.
SUPERADMIN_USERNAME = os.environ["SUPERADMIN_USERNAME"].strip().lower()
SUPERADMIN_PASSWORD = os.environ["SUPERADMIN_PASSWORD"]
# How long a login stays valid. The frontend's session cookie expires with the token.
# Revoking a user takes effect immediately regardless, since every request checks the account.
JWT_EXPIRE_MINUTES = int(os.environ.get("JWT_EXPIRE_MINUTES", str(24 * 60)))
OSRM_TABLE_BLOCK = int(os.environ.get("OSRM_TABLE_BLOCK", "100"))

# Jobs queued or running at once before /process-routes/start answers 429.
MAX_PENDING_JOBS = int(os.environ.get("MAX_PENDING_JOBS", "5"))
# How long a finished job's result stays available for polling.
JOB_RESULT_TTL_S = float(os.environ.get("JOB_RESULT_TTL_S", "3600"))

# Largest workbook /process-routes/start accepts. Vercel's proxy caps whole requests at 4 MB anyway.
MAX_UPLOAD_BYTES = int(os.environ.get("MAX_UPLOAD_BYTES", str(4 * 1024 * 1024)))
