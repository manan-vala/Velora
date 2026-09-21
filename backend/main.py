from fastapi import FastAPI, HTTPException, Depends, UploadFile, File, Form, Query
from fastapi.middleware.cors import CORSMiddleware
from models import OptimizationRequest
from auth import router as auth_router, get_current_user
from test_routes import router as test_router
from config import MAX_PENDING_JOBS, JOB_RESULT_TTL_S
from database import get_db, init_db
from db_models import OptimizationRunLog
from jobs import JobQueue, QueueFull
from pipeline import run_optimization
from sqlalchemy.orm import Session
from contextlib import asynccontextmanager
import json
import logging

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("fastapi_main")

job_queue = JobQueue(max_pending=MAX_PENDING_JOBS, result_ttl_s=JOB_RESULT_TTL_S)


@asynccontextmanager
async def lifespan(_app: FastAPI):
    init_db()
    job_queue.start()
    yield


app = FastAPI(lifespan=lifespan)

# For Auth
app.include_router(auth_router)

# For Testing
# Remove in production
app.include_router(test_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health_check():
    return {"status": "ok", "queue_depth": job_queue.depth()}


# Endpoint 1: Receive the payload and queue the optimization job
# Auth in testing phase:
# @app.post("/process-routes/start", dependencies=[Depends(get_current_user)])
@app.post("/process-routes/start")
async def start_processing(
    json_data: str = Form(...),
    file: UploadFile = File(...)
):
    logger.info(f"[API] /process-routes/start called. File: {file.filename}")

    try:
        raw = json.loads(json_data)
        payload = OptimizationRequest(**raw)
        logger.info(f"[API] Parsed payload: {len(payload.employees)} employees, {len(payload.vehicles)} vehicles")
    except json.JSONDecodeError as e:
        logger.error(f"[API] JSON parse error: {e}")
        raise HTTPException(status_code=400, detail=f"Invalid JSON in json_data: {e}")
    except Exception as e:
        logger.error(f"[API] Validation error: {e}")
        raise HTTPException(status_code=422, detail=f"Validation error: {e}")

    file_bytes = await file.read()

    try:
        task_id = job_queue.submit(lambda job_id: run_optimization(job_id, payload, file_bytes))
    except QueueFull:
        raise HTTPException(
            status_code=429,
            detail=f"Server is at capacity ({MAX_PENDING_JOBS} jobs queued). Please try again later."
        )
    logger.info(f"[API] Job queued. task_id={task_id}")

    return {
        "status": "queued",
        "task_id": task_id,
        "message": "Optimization task started in the background."
    }


# Endpoint 2: Poll for the status of the job
# Auth in testing phase:
# @app.get("/process-routes/status/{task_id}", dependencies=[Depends(get_current_user)])
@app.get("/process-routes/status/{task_id}")
def get_processing_status(task_id: str):
    job = job_queue.get(task_id)
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
):
    """Return recent optimization run logs, newest first."""
    rows = (
        db.query(OptimizationRunLog)
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