import os
import tempfile
from pathlib import Path

import pytest

TEST_DB = Path(tempfile.gettempdir()) / "velora-pytest.db"
TEST_DB.unlink(missing_ok=True)

# Set before any app module is imported: they read configuration at import time.
os.environ.setdefault("DATABASE_URL", f"sqlite:///{TEST_DB.as_posix()}")
os.environ.setdefault("OSRM_URL", "http://osrm.test:5000")
os.environ.setdefault("SECRET_KEY", "test-secret-key")

TEMPLATES = Path(__file__).resolve().parent.parent / "algo" / "templts"
BACKEND = Path(__file__).resolve().parent.parent

REQUIRED_ENV = {"DATABASE_URL": "sqlite://", "OSRM_URL": "http://osrm.test:5000", "SECRET_KEY": "k"}


def import_in_subprocess(module: str, drop=(), code: str = ""):
    """Import a backend module in a fresh interpreter with the required env minus `drop`."""
    import subprocess
    import sys

    env = {k: v for k, v in REQUIRED_ENV.items() if k not in drop}
    env["PATH"] = os.environ.get("PATH", "")
    return subprocess.run([sys.executable, "-c", f"import {module}\n{code}"], cwd=BACKEND,
                          env=env, capture_output=True, text=True)


@pytest.fixture
def workbook_bytes():
    def load(name="TestCase_TC03.xlsx") -> bytes:
        return (TEMPLATES / name).read_bytes()
    return load
