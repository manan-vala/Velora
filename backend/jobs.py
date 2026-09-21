"""
In-process job queue. One worker thread runs optimization jobs one at a time
(the solvers inside a job already use the CPU via their own processes), and job
state lives in memory: jobs are lost on restart, and polling a lost or expired
job returns 404.
"""

import logging
import queue
import threading
import time
import uuid
from dataclasses import dataclass
from typing import Callable, Optional

logger = logging.getLogger(__name__)

GENERIC_FAILURE = "Optimization failed due to an internal error. Please try again later."


class JobError(Exception):
    """A job failure whose message is safe to show to the user."""


class QueueFull(Exception):
    pass


@dataclass
class Job:
    id: str
    status: str = "queued"  # queued | running | completed | failed
    result: Optional[dict] = None
    error: Optional[str] = None
    finished_at: Optional[float] = None


class JobQueue:
    def __init__(self, max_pending: int, result_ttl_s: float):
        self._max_pending = max_pending
        self._result_ttl_s = result_ttl_s
        self._jobs: dict[str, Job] = {}
        self._lock = threading.Lock()
        self._queue: "queue.Queue[tuple[str, Callable[[str], dict]]]" = queue.Queue()
        self._thread: Optional[threading.Thread] = None

    def start(self) -> None:
        if self._thread is None or not self._thread.is_alive():
            self._thread = threading.Thread(target=self._work, name="job-worker", daemon=True)
            self._thread.start()

    def submit(self, work: Callable[[str], dict]) -> str:
        """Queue work(job_id) -> result. Raises QueueFull when max_pending jobs are queued or running."""
        with self._lock:
            self._expire_locked()
            if self._active_locked() >= self._max_pending:
                raise QueueFull
            job = Job(id=str(uuid.uuid4()))
            self._jobs[job.id] = job
        self._queue.put((job.id, work))
        return job.id

    def get(self, job_id: str) -> Optional[Job]:
        with self._lock:
            self._expire_locked()
            return self._jobs.get(job_id)

    def depth(self) -> int:
        with self._lock:
            return self._active_locked()

    def _active_locked(self) -> int:
        return sum(1 for j in self._jobs.values() if j.status in ("queued", "running"))

    def _expire_locked(self) -> None:
        cutoff = time.monotonic() - self._result_ttl_s
        for job_id in [j.id for j in self._jobs.values() if j.finished_at is not None and j.finished_at < cutoff]:
            del self._jobs[job_id]

    def _update(self, job_id: str, **changes) -> None:
        with self._lock:
            job = self._jobs.get(job_id)
            if job is not None:
                for key, value in changes.items():
                    setattr(job, key, value)

    def _work(self) -> None:
        while True:
            job_id, work = self._queue.get()
            self._update(job_id, status="running")
            try:
                result = work(job_id)
                self._update(job_id, status="completed", result=result, finished_at=time.monotonic())
            except JobError as exc:
                logger.warning("Job %s failed: %s", job_id, exc)
                self._update(job_id, status="failed", error=str(exc), finished_at=time.monotonic())
            except Exception:
                logger.exception("Job %s crashed", job_id)
                self._update(job_id, status="failed", error=GENERIC_FAILURE, finished_at=time.monotonic())
            finally:
                self._queue.task_done()
