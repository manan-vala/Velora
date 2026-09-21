import json
import threading
import time
import uuid

import pytest
from fastapi.testclient import TestClient

import main
from fixtures import payload_from_workbook
from jobs import JobError, JobQueue


@pytest.fixture
def client(monkeypatch):
    monkeypatch.setattr(main, "job_queue", JobQueue(max_pending=2, result_ttl_s=60))
    with TestClient(main.app) as c:
        yield c


@pytest.fixture
def fake_pipeline(monkeypatch):
    calls = []

    def run(job_id, payload, file_bytes):
        calls.append((job_id, payload, file_bytes))
        return {"vehicles": [{"vehicle_id": payload.vehicles[0].vehicle_id}], "summary": {}}

    monkeypatch.setattr(main, "run_optimization", run)
    return calls


def _form(workbook_bytes, payload=None, name="TestCase_TC03.xlsx"):
    file_bytes = workbook_bytes(name)
    payload = payload if payload is not None else payload_from_workbook(file_bytes, name)
    return {"json_data": json.dumps(payload) if not isinstance(payload, str) else payload}, {
        "file": (name, file_bytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}


def _poll(client, task_id, timeout=5.0):
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        body = client.get(f"/process-routes/status/{task_id}").json()
        if body["status"] != "processing":
            return body
        time.sleep(0.02)
    raise AssertionError("job never finished")


def test_start_then_poll_until_completed(client, fake_pipeline, workbook_bytes):
    data, files = _form(workbook_bytes)
    resp = client.post("/process-routes/start", data=data, files=files)
    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "queued"
    assert uuid.UUID(body["task_id"]).version == 4

    done = _poll(client, body["task_id"])
    job_id, payload, file_bytes = fake_pipeline[0]
    assert done == {"status": "completed",
                    "result": {"vehicles": [{"vehicle_id": payload.vehicles[0].vehicle_id}], "summary": {}}}
    assert job_id == body["task_id"]
    assert file_bytes == workbook_bytes("TestCase_TC03.xlsx")
    assert len(payload.employees) == 15


def test_status_is_processing_while_the_job_runs(client, monkeypatch, workbook_bytes):
    release = threading.Event()
    monkeypatch.setattr(main, "run_optimization", lambda *a: release.wait(5) and {"vehicles": []})
    data, files = _form(workbook_bytes)
    task_id = client.post("/process-routes/start", data=data, files=files).json()["task_id"]
    assert client.get(f"/process-routes/status/{task_id}").json() == {"status": "processing"}
    release.set()
    assert _poll(client, task_id)["status"] == "completed"


def test_failed_job_reports_its_message(client, monkeypatch, workbook_bytes):
    def fail(*_args):
        raise JobError("The routing service is unavailable. Please try again later.")

    monkeypatch.setattr(main, "run_optimization", fail)
    data, files = _form(workbook_bytes)
    task_id = client.post("/process-routes/start", data=data, files=files).json()["task_id"]
    assert _poll(client, task_id) == {"status": "failed",
                                      "error": "The routing service is unavailable. Please try again later."}


@pytest.mark.parametrize("task_id", [str(uuid.uuid4()), "not-a-uuid"])
def test_unknown_task_is_404(client, task_id):
    resp = client.get(f"/process-routes/status/{task_id}")
    assert resp.status_code == 404


def test_invalid_json_is_400(client, fake_pipeline, workbook_bytes):
    data, files = _form(workbook_bytes, payload="{not json")
    assert client.post("/process-routes/start", data=data, files=files).status_code == 400
    assert not fake_pipeline


def test_invalid_payload_is_422(client, fake_pipeline, workbook_bytes):
    payload = payload_from_workbook(workbook_bytes("TestCase_TC03.xlsx"))
    payload["employees"][0]["employee_id"] = "office"
    data, files = _form(workbook_bytes, payload=payload)
    assert client.post("/process-routes/start", data=data, files=files).status_code == 422
    assert not fake_pipeline


def test_full_queue_is_429(client, monkeypatch, workbook_bytes):
    release = threading.Event()
    monkeypatch.setattr(main, "run_optimization", lambda *a: release.wait(5) and {})
    data, files = _form(workbook_bytes)
    codes = [client.post("/process-routes/start", data=data, files=files).status_code for _ in range(3)]
    release.set()
    assert codes == [200, 200, 429]


def test_health_reports_queue_depth(client):
    assert client.get("/health").json() == {"status": "ok", "queue_depth": 0}


# --- hardening -----------------------------------------------------------------

def _blank_workbook(sheets):
    import openpyxl
    from io import BytesIO
    wb = openpyxl.Workbook()
    wb.active.title = sheets[0]
    for name in sheets[1:]:
        wb.create_sheet(name)
    out = BytesIO()
    wb.save(out)
    return out.getvalue()


def test_oversized_upload_is_413(client, monkeypatch, fake_pipeline, workbook_bytes):
    monkeypatch.setattr(main, "MAX_UPLOAD_BYTES", 1024)
    data, files = _form(workbook_bytes)
    resp = client.post("/process-routes/start", data=data, files=files)
    assert resp.status_code == 413
    assert not fake_pipeline


@pytest.mark.parametrize("content,expected", [
    (b"employee_id,priority\n1,2\n", "not a readable .xlsx"),
    (_blank_workbook(["employees", "vehicles"]), "missing sheet(s): metadata"),
])
def test_unreadable_or_incomplete_workbooks_are_422(client, fake_pipeline, workbook_bytes, content, expected):
    data, _ = _form(workbook_bytes)
    resp = client.post("/process-routes/start", data=data, files={"file": ("upload.xlsx", content)})
    assert resp.status_code == 422
    assert expected in resp.json()["detail"]
    assert not fake_pipeline


def test_validation_errors_are_structured_and_do_not_echo_input(client, fake_pipeline, workbook_bytes):
    payload = payload_from_workbook(workbook_bytes("TestCase_TC03.xlsx"))
    payload["vehicles"][0]["capacity"] = "SECRET-VALUE"
    data, files = _form(workbook_bytes, payload=payload)
    resp = client.post("/process-routes/start", data=data, files=files)
    assert resp.status_code == 422
    detail = resp.json()["detail"]
    assert detail[0]["loc"] == ["vehicles", 0, "capacity"]
    assert "SECRET-VALUE" not in resp.text


@pytest.mark.parametrize("json_data", ["[]", "null", "3"])
def test_json_that_is_not_an_object_is_422(client, fake_pipeline, workbook_bytes, json_data):
    data, files = _form(workbook_bytes, payload=json_data)
    assert client.post("/process-routes/start", data=data, files=files).status_code == 422


def test_invalid_json_error_does_not_echo_the_parser_message(client, workbook_bytes):
    data, files = _form(workbook_bytes, payload="{not json")
    assert client.post("/process-routes/start", data=data, files=files).json() == {
        "detail": "json_data is not valid JSON."}


def test_test_solver_route_is_gone(client):
    assert client.get("/test/run-solver").status_code == 404


def test_no_cors_headers(client):
    preflight = client.options("/process-routes/start", headers={
        "Origin": "https://evil.example", "Access-Control-Request-Method": "POST"})
    assert "access-control-allow-origin" not in preflight.headers
    health = client.get("/health", headers={"Origin": "https://evil.example"})
    assert "access-control-allow-origin" not in health.headers


def test_secret_key_is_required():
    from conftest import import_in_subprocess
    out = import_in_subprocess("main", drop=("SECRET_KEY",))
    assert out.returncode != 0
    assert "Missing required environment variables: SECRET_KEY" in out.stderr
