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


@pytest.fixture
def workbook_bytes():
    def load(name="TestCase_TC03.xlsx") -> bytes:
        return (TEMPLATES / name).read_bytes()
    return load
