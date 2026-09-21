import httpx
import pytest
from sqlalchemy import select

import database
import geometry_processor
import pipeline
import router
import solver_stubs as stubs
from algo import solver
from database import SessionLocal, init_db
from db_models import OptimizationRunLog
from fixtures import payload_from_workbook
from jobs import JobError
from models import OptimizationRequest
from test_osrm import FakeOSRM


class FakeRouteService:
    def __init__(self, max_concurrency=50):
        pass

    async def fetch_geometry_safe(self, tag, src, dst):
        return tag, [[src[1], src[0]], [dst[1], dst[0]]]

    async def close(self):
        pass


@pytest.fixture
def offline(monkeypatch):
    """Point the pipeline at a fake OSRM and give the real solvers a short budget."""
    osrm = FakeOSRM()

    class Matrix(router.MatrixService):
        def __init__(self, employees, vehicles):
            super().__init__(employees, vehicles, transport=httpx.MockTransport(osrm))

    monkeypatch.setattr(pipeline, "MatrixService", Matrix)
    monkeypatch.setattr(geometry_processor, "RouteService", FakeRouteService)
    monkeypatch.setattr(router, "MATRIX_RETRY_BACKOFF_S", 0)
    monkeypatch.setattr(solver, "SOLVER_TIME_LIMIT_S", 3)
    monkeypatch.setattr(solver, "SOLVER_MAX_WORKERS", 3)
    return osrm


def _request(workbook_bytes, name="TestCase_TC03.xlsx"):
    file_bytes = workbook_bytes(name)
    return OptimizationRequest(**payload_from_workbook(file_bytes, name)), file_bytes


def test_full_pipeline_returns_routes_with_geometry_and_logs_the_run(offline, workbook_bytes):
    database.Base.metadata.drop_all(bind=database.engine)
    init_db()
    request, file_bytes = _request(workbook_bytes)

    result = pipeline.run_optimization("job-123", request, file_bytes, "alice")

    assert result["vehicles"]
    for vehicle in result["vehicles"]:
        assert "routes" not in vehicle
        assert vehicle["route_geometry"] and all(seg["geometry"] for seg in vehicle["route_geometry"])
    assert result["summary"]["solvers"] == {"LNS": "ok", "ALNS": "ok", "VROOM": "ok"}
    assert result["summary"]["total_algo_time_seconds"] > 0

    with SessionLocal() as session:
        row = session.scalars(select(OptimizationRunLog).where(OptimizationRunLog.task_id == "job-123")).one()
        assert row.filename == "TestCase_TC03.xlsx"
        assert row.num_employees == 15 and row.winner_algorithm in {"LNS", "ALNS", "VROOM"}
        assert row.username == "alice"


def test_unreachable_osrm_fails_with_a_user_facing_message(offline, workbook_bytes):
    offline.fail_first = 10**6
    request, file_bytes = _request(workbook_bytes)
    with pytest.raises(JobError, match="routing service is unavailable"):
        pipeline.run_optimization("job-osrm", request, file_bytes, "alice")


def test_all_solvers_failing_is_a_job_error(offline, monkeypatch, workbook_bytes):
    monkeypatch.setattr(solver, "SOLVERS", {"BOOM": stubs.boom})
    request, file_bytes = _request(workbook_bytes)
    with pytest.raises(JobError, match="No route plan"):
        pipeline.run_optimization("job-solvers", request, file_bytes, "alice")
