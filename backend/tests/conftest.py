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
os.environ.setdefault("SUPERADMIN_USERNAME", "root")
os.environ.setdefault("SUPERADMIN_PASSWORD", "superadmin-password")

TEMPLATES = Path(__file__).resolve().parent.parent / "algo" / "templts"
BACKEND = Path(__file__).resolve().parent.parent

REQUIRED_ENV = {"DATABASE_URL": "sqlite://", "OSRM_URL": "http://osrm.test:5000", "SECRET_KEY": "k",
                "SUPERADMIN_USERNAME": "root", "SUPERADMIN_PASSWORD": "superadmin-password"}


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


@pytest.fixture
def make_account():
    """Create an account straight in the database (there is no signup endpoint)."""
    import uuid

    from auth import get_password_hash
    from database import SessionLocal, init_db
    from db_models import User

    def create(username=None, password="correct horse battery", is_admin=False, is_active=True):
        init_db()
        username = (username or f"user-{uuid.uuid4().hex[:8]}").lower()
        with SessionLocal() as session:
            session.query(User).filter(User.username == username).delete()
            session.add(User(username=username, hashed_password=get_password_hash(password),
                             is_admin=is_admin, is_active=is_active))
            session.commit()
        return username, password

    return create
