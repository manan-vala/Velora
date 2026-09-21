import asyncio
import math

import httpx
import pytest

import router
from conftest import import_in_subprocess
from fixtures import haversine_km, payload_from_workbook
from logic import generate_routes
from models import OptimizationRequest

OSRM_DEFAULT_MAX_TABLE = 100


class FakeOSRM:
    """Answers /table like osrm-routed, including its sources x destinations size limit."""

    def __init__(self, fail_first=0, fail_with=503, unroutable=None):
        self.calls = 0
        self.fail_first = fail_first
        self.fail_with = fail_with
        self.unroutable = unroutable or set()

    def __call__(self, request: httpx.Request) -> httpx.Response:
        self.calls += 1
        if self.calls <= self.fail_first:
            if self.fail_with == "connect":
                raise httpx.ConnectError("refused", request=request)
            return httpx.Response(self.fail_with, text="upstream error")
        coords = [tuple(map(float, c.split(","))) for c in request.url.path.rsplit("/", 1)[1].split(";")]
        sources = [int(i) for i in request.url.params["sources"].split(";")]
        dests = [int(i) for i in request.url.params["destinations"].split(";")]
        if len(sources) * len(dests) > OSRM_DEFAULT_MAX_TABLE ** 2:
            return httpx.Response(400, json={"code": "TooBig"})

        def km(i, j):
            (lng1, lat1), (lng2, lat2) = coords[i], coords[j]
            return haversine_km(lat1, lng1, lat2, lng2)

        def cell(i, j, scale):
            if (coords[i], coords[j]) in self.unroutable:
                return None
            return km(i, j) * scale

        return httpx.Response(200, json={
            "code": "Ok",
            "distances": [[cell(i, j, 1000.0) for j in dests] for i in sources],
            "durations": [[cell(i, j, 120.0) for j in dests] for i in sources],
        })


@pytest.fixture(autouse=True)
def no_backoff(monkeypatch):
    monkeypatch.setattr(router, "MATRIX_RETRY_BACKOFF_S", 0)


def _request(workbook_bytes):
    return OptimizationRequest(**payload_from_workbook(workbook_bytes("TestCase_TC03.xlsx")))


def _fetch(request, osrm):
    service = router.MatrixService(request.employees, request.vehicles, transport=httpx.MockTransport(osrm))
    return service, asyncio.run(service.fetch_matrix())


def test_blocked_requests_assemble_the_same_matrix_as_one_request(monkeypatch, workbook_bytes):
    request = _request(workbook_bytes)
    whole, ok = _fetch(request, FakeOSRM())
    assert ok

    monkeypatch.setattr(router, "OSRM_TABLE_BLOCK", 4)
    osrm = FakeOSRM()
    blocked, ok = _fetch(request, osrm)
    assert ok
    n = len(blocked.coords_list)
    assert osrm.calls == math.ceil(n / 4) ** 2
    assert blocked.durations == whole.durations
    assert blocked.distances == whole.distances


def test_large_input_stays_within_osrm_default_table_size(monkeypatch, workbook_bytes):
    request = OptimizationRequest(**payload_from_workbook(workbook_bytes("TestCase_TC08.xlsx")))
    osrm = FakeOSRM()
    service, ok = _fetch(request, osrm)
    assert ok, "a 334-point table must be split into requests OSRM accepts"
    assert osrm.calls == math.ceil(len(service.coords_list) / router.OSRM_TABLE_BLOCK) ** 2
    assert all(v is not None for row in service.durations for v in row)


@pytest.mark.parametrize("fail_with", [503, 429, "connect"])
def test_transient_failures_are_retried(workbook_bytes, fail_with):
    osrm = FakeOSRM(fail_first=2, fail_with=fail_with)
    _, ok = _fetch(_request(workbook_bytes), osrm)
    assert ok
    assert osrm.calls == 3


def test_gives_up_after_three_attempts(workbook_bytes):
    osrm = FakeOSRM(fail_first=99)
    _, ok = _fetch(_request(workbook_bytes), osrm)
    assert not ok
    assert osrm.calls == router.MATRIX_ATTEMPTS


def test_client_errors_are_not_retried(workbook_bytes):
    osrm = FakeOSRM(fail_first=99, fail_with=400)
    _, ok = _fetch(_request(workbook_bytes), osrm)
    assert not ok
    assert osrm.calls == 1


def test_unroutable_pairs_are_left_out_of_the_edge_list(workbook_bytes):
    request = _request(workbook_bytes)
    emp = request.employees[0]
    office = (emp.drop_lng, emp.drop_lat)
    pickup = (emp.pickup_lng, emp.pickup_lat)
    service, ok = _fetch(request, FakeOSRM(unroutable={(pickup, office)}))
    assert ok
    assert service.get_pair(emp.employee_id, "office") is None
    edge_ids = {e["id"] for e in generate_routes(request, service)}
    assert f"{emp.employee_id}_office" not in edge_ids
    assert f"office_{emp.employee_id}" in edge_ids


def test_osrm_url_is_required():
    out = import_in_subprocess("router", drop=("OSRM_URL",))
    assert out.returncode != 0
    assert "Missing required environment variables: OSRM_URL" in out.stderr
