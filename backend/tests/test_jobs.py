import threading
import time
import uuid

import pytest

import jobs
from jobs import GENERIC_FAILURE, JobError, JobQueue, QueueFull

OWNER = "alice"


def _submit(q, work, owner=OWNER):
    return q.submit(work, owner)


def _get(q, job_id, owner=OWNER):
    return q.get(job_id, owner)


def _wait(q: JobQueue, job_id: str, timeout=5.0):
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        job = _get(q, job_id)
        if job and job.status in ("completed", "failed"):
            return job
        time.sleep(0.01)
    raise AssertionError(f"job {job_id} did not finish")


def test_job_ids_are_uuid4():
    q = JobQueue(max_pending=5, result_ttl_s=60)
    job_id = _submit(q, lambda _id: {})
    assert uuid.UUID(job_id).version == 4


def test_jobs_run_one_at_a_time_in_order():
    q = JobQueue(max_pending=10, result_ttl_s=60)
    q.start()
    running, peak, order = [0], [0], []
    lock = threading.Lock()

    def work(n):
        def run(_job_id):
            with lock:
                running[0] += 1
                peak[0] = max(peak[0], running[0])
            time.sleep(0.05)
            order.append(n)
            with lock:
                running[0] -= 1
            return {"n": n}
        return run

    ids = [_submit(q, work(n)) for n in range(4)]
    results = [_wait(q, i).result["n"] for i in ids]
    assert results == [0, 1, 2, 3]
    assert order == [0, 1, 2, 3]
    assert peak[0] == 1


def test_status_moves_from_queued_to_running_to_completed():
    q = JobQueue(max_pending=5, result_ttl_s=60)
    release = threading.Event()
    started = threading.Event()

    def work(_job_id):
        started.set()
        release.wait(5)
        return {"ok": True}

    job_id = _submit(q, work)
    assert _get(q, job_id).status == "queued"
    q.start()
    assert started.wait(5)
    assert _get(q, job_id).status == "running"
    release.set()
    assert _wait(q, job_id).result == {"ok": True}


def test_job_error_message_is_kept_but_unexpected_errors_are_hidden():
    q = JobQueue(max_pending=5, result_ttl_s=60)
    q.start()

    def user_facing(_id):
        raise JobError("The routing service is unavailable.")

    def crash(_id):
        raise RuntimeError("password=hunter2 at /app/secret.py")

    assert _wait(q, _submit(q, user_facing)).error == "The routing service is unavailable."
    crashed = _wait(q, _submit(q, crash))
    assert crashed.status == "failed"
    assert crashed.error == GENERIC_FAILURE


def test_worker_survives_a_crashing_job():
    q = JobQueue(max_pending=5, result_ttl_s=60)
    q.start()
    _wait(q, _submit(q, lambda _id: 1 / 0))
    assert _wait(q, _submit(q, lambda _id: {"after": "crash"})).result == {"after": "crash"}


def test_queue_limit_counts_queued_and_running_jobs():
    q = JobQueue(max_pending=2, result_ttl_s=60)
    _submit(q, lambda _id: {})
    _submit(q, lambda _id: {})
    assert q.depth() == 2
    with pytest.raises(QueueFull):
        _submit(q, lambda _id: {})


def test_finished_jobs_free_their_slot():
    q = JobQueue(max_pending=1, result_ttl_s=60)
    q.start()
    _wait(q, _submit(q, lambda _id: {}))
    assert q.depth() == 0
    _submit(q, lambda _id: {})


def test_finished_jobs_expire_after_ttl(monkeypatch):
    now = [1000.0]
    monkeypatch.setattr(jobs.time, "monotonic", lambda: now[0])
    q = JobQueue(max_pending=5, result_ttl_s=10)
    job_id = _submit(q, lambda _id: {})
    q._update(job_id, status="completed", finished_at=now[0])
    now[0] += 9
    assert _get(q, job_id) is not None
    now[0] += 2
    assert _get(q, job_id) is None


def test_unfinished_jobs_never_expire(monkeypatch):
    now = [1000.0]
    monkeypatch.setattr(jobs.time, "monotonic", lambda: now[0])
    q = JobQueue(max_pending=5, result_ttl_s=10)
    job_id = _submit(q, lambda _id: {})
    now[0] += 10_000
    assert _get(q, job_id).status == "queued"


def test_jobs_are_only_visible_to_their_owner():
    q = JobQueue(max_pending=5, result_ttl_s=60)
    job_id = _submit(q, lambda _id: {}, owner="alice")
    assert _get(q, job_id, owner="alice").owner == "alice"
    assert _get(q, job_id, owner="bob") is None


def test_pending_limit_is_shared_across_users():
    q = JobQueue(max_pending=2, result_ttl_s=60)
    _submit(q, lambda _id: {}, owner="alice")
    _submit(q, lambda _id: {}, owner="bob")
    with pytest.raises(QueueFull):
        _submit(q, lambda _id: {}, owner="carol")
