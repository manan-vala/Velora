from contextlib import asynccontextmanager
from io import BytesIO
import json
import logging
import zipfile

import openpyxl
from fastapi import FastAPI, HTTPException, Depends, UploadFile, File, Form, Query, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import ValidationError
from sqlalchemy.orm import Session

from admin import router as admin_router
from auth import ensure_superadmin, router as auth_router, get_current_user
from config import MAX_PENDING_JOBS, JOB_RESULT_TTL_S, MAX_UPLOAD_BYTES
from database import get_db, init_db
from db_models import OptimizationRunLog, User
from jobs import JobQueue, QueueFull
from models import OptimizationRequest
from pipeline import run_optimization

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("fastapi_main")

REQUIRED_SHEETS = ("employees", "vehicles", "metadata")

job_queue = JobQueue(max_pending=MAX_PENDING_JOBS, result_ttl_s=JOB_RESULT_TTL_S)


@asynccontextmanager
async def lifespan(_app: FastAPI):
    if init_db():
        ensure_superadmin()
    job_queue.start()
    yield


# No CORS middleware: only server-side callers (the Vercel API routes, via the Worker) reach this API.
app = FastAPI(lifespan=lifespan)
app.include_router(auth_router)
app.include_router(admin_router)


@app.exception_handler(RequestValidationError)
async def validation_error_handler(_request: Request, exc: RequestValidationError):
    # FastAPI's default echoes each offending value back ("input"), which would include passwords.
    return JSONResponse(status_code=422, content={"detail": [
        {"loc": list(err["loc"]), "msg": err["msg"]} for err in exc.errors()
    ]})


@app.get("/health")
def health_check():
    return {"status": "ok", "queue_depth": job_queue.depth()}


async def _read_upload(file: UploadFile) -> bytes:
    data = await file.read(MAX_UPLOAD_BYTES + 1)
    if len(data) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail=f"File is larger than {MAX_UPLOAD_BYTES // (1024 * 1024)} MB.")
    return data


def _check_workbook(file_bytes: bytes) -> None:
    """Fail fast on files the solvers can't read, instead of after the OSRM call."""
    try:
        wb = openpyxl.load_workbook(BytesIO(file_bytes), read_only=True)
    except (zipfile.BadZipFile, KeyError, OSError, ValueError):
        raise HTTPException(status_code=422, detail="The uploaded file is not a readable .xlsx workbook.")
    try:
        missing = [name for name in REQUIRED_SHEETS if name not in wb.sheetnames]
    finally:
        wb.close()
    if missing:
        raise HTTPException(status_code=422, detail=f"Workbook is missing sheet(s): {', '.join(missing)}.")


@app.post("/process-routes/start")
async def start_processing(
    json_data: str = Form(...),
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
):
    try:
        payload = OptimizationRequest(**json.loads(json_data))
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="json_data is not valid JSON.")
    except TypeError:
        raise HTTPException(status_code=422, detail="json_data must be a JSON object.")
    except ValidationError as e:
        raise HTTPException(status_code=422, detail=[
            {"loc": list(err["loc"]), "msg": err["msg"]} for err in e.errors(include_url=False)
        ])

    file_bytes = await _read_upload(file)
    _check_workbook(file_bytes)

    try:
        username = user.username
        task_id = job_queue.submit(
            lambda job_id: run_optimization(job_id, payload, file_bytes, username), owner=username)
    except QueueFull:
        raise HTTPException(
            status_code=429,
            detail=f"Server is at capacity ({MAX_PENDING_JOBS} jobs queued). Please try again later."
        )
    logger.info(f"[API] Job {task_id} queued by {username}: {len(payload.employees)} employees, "
                f"{len(payload.vehicles)} vehicles, {len(file_bytes)} bytes")

    return {
        "status": "queued",
        "task_id": task_id,
        "message": "Optimization task started in the background."
    }


@app.get("/process-routes/status/{task_id}")
def get_processing_status(task_id: str, user: User = Depends(get_current_user)):
    # Another user's task looks exactly like an unknown one.
    job = job_queue.get(task_id, owner=user.username)
    if job is None:
        raise HTTPException(status_code=404, detail="Unknown or expired task.")

    if job.status == "completed":
        return {"status": "completed", "result": job.result}
    if job.status == "failed":
        return {"status": "failed", "error": job.error}
    return {"status": "processing"}


# --- Optimization Run Logs ---
@app.get("/optimization-logs")
def get_optimization_logs(
    limit: int = Query(default=50, ge=1, le=1000),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Return the caller's recent optimization runs, newest first."""
    rows = (
        db.query(OptimizationRunLog)
        .filter(OptimizationRunLog.username == user.username)
        .order_by(OptimizationRunLog.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )
    return [
        {
            "id": r.id,
            "created_at": r.created_at.isoformat() if r.created_at else None,
            "filename": r.filename,
            "num_employees": r.num_employees,
            "num_vehicles": r.num_vehicles,
            "winner_algorithm": r.winner_algorithm,
            "employees_served": r.employees_served,
            "hard_violations": r.hard_violations,
            "soft_violations": r.soft_violations,
            "objective_score": r.objective_score,
            "total_cost": r.total_cost,
            "total_time_min": r.total_time_min,
            "algo_duration_seconds": r.algo_duration_seconds,
            "total_duration_seconds": r.total_duration_seconds,
            "task_id": r.task_id,
            "vehicles_in_solution": r.vehicles_in_solution,
        }
        for r in rows
    ]