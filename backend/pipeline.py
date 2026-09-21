"""The optimization job: OSRM matrix -> edge list -> solvers -> route geometry -> run log."""

import asyncio
import logging
import time

from algo.solver import SolverError, solve_vrp
from geometry_processor import enrich_with_geometries
from jobs import JobError
from logic import generate_routes
from models import OptimizationRequest
from optimization_logger import log_optimization_run
from router import MatrixService

logger = logging.getLogger(__name__)


def run_optimization(job_id: str, payload: OptimizationRequest, file_bytes: bytes) -> dict:
    task_start = time.time()
    logger.info(f"=== JOB {job_id} STARTED: {len(payload.employees)} employees, {len(payload.vehicles)} vehicles ===")

    logger.info("[Step 1/4] Fetching OSRM distance matrix...")
    step_start = time.time()
    matrix = MatrixService(payload.employees, payload.vehicles)
    if not asyncio.run(matrix.fetch_matrix()):
        raise JobError("The routing service is unavailable. Please try again later.")
    logger.info(f"[Step 1/4] Done ({time.time() - step_start:.1f}s)")

    matrix_edge_list = generate_routes(payload, matrix)
    logger.info(f"[Step 2/4] Generated {len(matrix_edge_list)} edges")

    logger.info("[Step 3/4] Running VRP solvers...")
    step_start = time.time()
    try:
        result_json, score, winner_algorithm = solve_vrp(payload.model_dump(), matrix_edge_list, file_bytes)
    except SolverError:
        logger.exception("No solver produced a result")
        raise JobError("No route plan could be produced for this input.")
    algo_elapsed = time.time() - step_start
    vehicles_count = len(result_json.get("vehicles", []))
    logger.info(f"[Step 3/4] {winner_algorithm} won with {vehicles_count} vehicles ({algo_elapsed:.1f}s)")

    logger.info("[Step 4/4] Fetching route geometries from OSRM...")
    step_start = time.time()
    final_json = asyncio.run(enrich_with_geometries(result_json, payload))
    logger.info(f"[Step 4/4] Done ({time.time() - step_start:.1f}s)")

    total_time = time.time() - task_start
    summary = final_json.setdefault("summary", {})
    summary["total_algo_time_seconds"] = round(total_time, 2)
    summary["total_vehicle_time_minutes"] = round(
        sum(v.get("total_time_minutes", 0) for v in final_json.get("vehicles", [])), 2)

    log_optimization_run(
        filename=payload.filename or "unknown",
        num_employees=len(payload.employees),
        num_vehicles=len(payload.vehicles),
        winner_algorithm=winner_algorithm,
        employees_served=score.get("served_count", 0),
        hard_violations=score.get("hard_violations", 0),
        soft_violations=score.get("soft_violations", 0),
        objective_score=score.get("objective", 0.0),
        total_cost=score.get("total_cost", 0.0),
        total_time_min=score.get("total_time_min", 0.0),
        algo_duration_seconds=round(algo_elapsed, 2),
        total_duration_seconds=round(total_time, 2),
        task_id=job_id,
        vehicles_in_solution=vehicles_count,
    )

    logger.info(f"=== JOB {job_id} COMPLETED in {total_time:.1f}s ===")
    return final_json
