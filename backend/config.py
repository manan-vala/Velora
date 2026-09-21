"""Runtime configuration, read once from the environment. Import fails fast if required values are missing."""

import os

REQUIRED = ("DATABASE_URL", "OSRM_URL")

_missing = [name for name in REQUIRED if not os.environ.get(name, "").strip()]
if _missing:
    raise RuntimeError(f"Missing required environment variables: {', '.join(_missing)}")

DATABASE_URL = os.environ["DATABASE_URL"].strip()
OSRM_URL = os.environ["OSRM_URL"].strip().rstrip("/")
OSRM_TABLE_BLOCK = int(os.environ.get("OSRM_TABLE_BLOCK", "100"))
