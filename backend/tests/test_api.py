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
