import subprocess
import sys
from pathlib import Path

from sqlalchemy import inspect, select, func

import database
from database import Base, SessionLocal, init_db
from db_models import OptimizationRunLog
import optimization_logger
from optimization_logger import log_optimization_run

BACKEND = Path(__file__).resolve().parent.parent


def _reset_schema():
    import db_models  # noqa: F401
    Base.metadata.drop_all(bind=database.engine)


def _log(i: int):
    log_optimization_run(
        filename=f"run{i}.xlsx", num_employees=10, num_vehicles=2, winner_algorithm="LNS",
        employees_served=10, hard_violations=0, soft_violations=1, objective_score=1.0,
        total_cost=2.0, total_time_min=3.0, task_id=f"task-{i}", vehicles_in_solution=2,
    )


def test_init_db_creates_every_table():
    _reset_schema()
    assert init_db() is True
    tables = set(inspect(database.engine).get_table_names())
    assert {"users", "optimization_run_logs"} <= tables


def test_importing_auth_does_not_touch_the_database():
    code = "import auth; import database; from sqlalchemy import inspect; print(inspect(database.engine).get_table_names())"
    env = {"DATABASE_URL": "sqlite://", "PATH": ""}
    out = subprocess.run([sys.executable, "-c", code], cwd=BACKEND, env=env, capture_output=True, text=True)
    assert out.returncode == 0, out.stderr
    assert out.stdout.strip() == "[]"


def test_init_db_reports_unreachable_database(monkeypatch):
    from sqlalchemy import create_engine
    monkeypatch.setattr(database, "engine", create_engine("postgresql+psycopg2://u:p@127.0.0.1:1/x"))
    assert init_db() is False


def test_run_log_is_written_and_capped(monkeypatch):
    _reset_schema()
    init_db()
    monkeypatch.setattr(optimization_logger, "MAX_LOG_ROWS", 3)
    original = optimization_logger._enforce_log_limit
    monkeypatch.setattr(optimization_logger, "_enforce_log_limit", lambda s: original(s, max_rows=3))
    for i in range(5):
        _log(i)
    with SessionLocal() as session:
        assert session.scalar(select(func.count()).select_from(OptimizationRunLog)) == 3
        names = {r.filename for r in session.query(OptimizationRunLog).all()}
        assert names == {"run2.xlsx", "run3.xlsx", "run4.xlsx"}
        assert session.query(OptimizationRunLog).first().task_id.startswith("task-")


def test_missing_database_url_fails_with_clear_message():
    out = subprocess.run([sys.executable, "-c", "import database"], cwd=BACKEND,
                         env={"PATH": ""}, capture_output=True, text=True)
    assert out.returncode != 0
    assert "Missing required environment variables: DATABASE_URL" in out.stderr
