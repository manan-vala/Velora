"""
Run LNS, ALNS and VROOM, each in its own process under a hard time limit, then
score every result with the shared feasibility checker and pick the best.

Processes (not threads) because the solvers are CPU-bound Python (the GIL made
threads alternate), and because a process is the only thing that can be killed
reliably when a solver overruns. "spawn" is used so the child never inherits the
API's threads and sockets.
"""

import logging
import multiprocessing as mp
import os
import time
from multiprocessing.connection import wait

from . import alns
from .feasibilityfinal import get_feasibility_score
from .lns_algo import LNSOptimizer
from .vroom_solver import solve_vroom

logger = logging.getLogger(__name__)

# Each solver's own search budget. It is killed if still running after limit + grace.
# Grace covers start-up, workbook parsing, formatting, and ALNS finishing its current
# iteration (it overshot its budget by ~20 s on the 96-employee PoisonPill workbook).
SOLVER_TIME_LIMIT_S = float(os.environ.get("SOLVER_TIME_LIMIT_S", "40"))
SOLVER_GRACE_S = float(os.environ.get("SOLVER_GRACE_S", "30"))
# How many solver processes may run at once. On the 2-OCPU VM this is 1 so OSRM stays responsive.
SOLVER_MAX_WORKERS = max(1, int(os.environ.get("SOLVER_MAX_WORKERS", "1")))

SOFT_VIOLATION_PENALTY = 50  # 1 soft violation = 50 objective cost when ranking


class SolverError(Exception):
    pass


def _run_lns(input_data, matrix_edge_list, file_bytes, time_limit):
    lns = LNSOptimizer(file_bytes, matrix_edge_list)
    lns.optimize(max_iterations=100, time_limit=time_limit)
    return lns.get_formatted_output()


def _run_alns(input_data, matrix_edge_list, file_bytes, time_limit):
    return alns.solve_alns(input_data, matrix_edge_list, file_bytes, time_limit=time_limit)


def _run_vroom(input_data, matrix_edge_list, file_bytes, time_limit):
    return solve_vroom(input_data, matrix_edge_list, file_bytes)


SOLVERS = {"LNS": _run_lns, "ALNS": _run_alns, "VROOM": _run_vroom}


def _child_main(conn, name, fn, args):
    logging.basicConfig(level=logging.INFO, format=f"%(asctime)s [%(levelname)s] [{name}] %(message)s")
    try:
        conn.send(("ok", fn(*args)))
    except BaseException as exc:
        logging.getLogger(__name__).exception("%s solver raised", name)
        conn.send(("error", f"{type(exc).__name__}: {exc}"))
    finally:
        conn.close()


def run_solvers(solvers, args, time_limit, grace, max_workers):
    """
    Run each solver function with (*args, time_limit) in a child process, at most
    max_workers at a time. Returns (results, failures): name -> solution, and
    name -> "failed" | "timed out" for solvers that produced nothing.
    """
    ctx = mp.get_context("spawn")
    pending = list(solvers.items())
    running = {}  # name -> (process, connection, deadline)
    results, failures = {}, {}

    def finish(name):
        proc, conn, _ = running.pop(name)
        conn.close()
        proc.join(5)
        if proc.is_alive():
            proc.kill()
            proc.join()

    while pending or running:
        while pending and len(running) < max_workers:
            name, fn = pending.pop(0)
            parent_conn, child_conn = ctx.Pipe(duplex=False)
            proc = ctx.Process(target=_child_main, args=(child_conn, name, fn, (*args, time_limit)),
                               name=f"solver-{name}", daemon=True)
            proc.start()
            child_conn.close()
            running[name] = (proc, parent_conn, time.monotonic() + time_limit + grace)

        next_deadline = min(deadline for _, _, deadline in running.values())
        ready = wait([conn for _, conn, _ in running.values()],
                     timeout=max(0.0, next_deadline - time.monotonic()))

        for name, (proc, conn, deadline) in list(running.items()):
            if conn in ready:
                try:
                    status, value = conn.recv()
                except EOFError:  # died without reporting (segfault, OOM kill)
                    status, value = "error", f"process exited with code {proc.exitcode}"
                if status == "ok":
                    results[name] = value
                else:
                    failures[name] = "failed"
                    logger.warning("%s solver failed: %s", name, value)
                finish(name)
            elif time.monotonic() >= deadline:
                proc.terminate()
                failures[name] = "timed out"
                logger.warning("%s solver killed after %.0fs", name, time_limit + grace)
                finish(name)

    return results, failures


def _effective_objective(score):
    return score["objective"] + score["soft_violations"] * SOFT_VIOLATION_PENALTY


def solve_vrp(input_data, matrix_edge_list, file_bytes, *, solvers=None, time_limit=None,
              grace=None, max_workers=None):
    """Return (best_solution, its_score, winner_name). Raises SolverError if no solver produced a result."""
    results, failures = run_solvers(
        solvers or SOLVERS,
        (input_data, matrix_edge_list, file_bytes),
        time_limit=SOLVER_TIME_LIMIT_S if time_limit is None else time_limit,
        grace=SOLVER_GRACE_S if grace is None else grace,
        max_workers=max_workers or SOLVER_MAX_WORKERS,
    )
    if not results:
        raise SolverError(f"All solvers failed: {failures}")

    scored = []
    for name, sol in results.items():
        score = get_feasibility_score(file_bytes, matrix_edge_list, sol)
        scored.append((name, sol, score))
        logger.info("Solver %s: served=%s hard=%s soft=%s objective=%.2f", name, score["served_count"],
                    score["hard_violations"], score["soft_violations"], score["objective"])

    # Ranking: zero hard violations first, then most employees served, then lowest
    # objective + soft-violation penalty. With no fully valid solution, fewest hard violations wins.
    valid = [s for s in scored if s[2]["hard_violations"] == 0]
    if valid:
        name, best, score = min(valid, key=lambda s: (-s[2]["served_count"], _effective_objective(s[2])))
    else:
        name, best, score = min(scored, key=lambda s: (s[2]["hard_violations"], -s[2]["served_count"],
                                                       _effective_objective(s[2])))

    best.setdefault("summary", {})["solvers"] = {n: failures.get(n, "ok") for n in (solvers or SOLVERS)}
    logger.info("Selected best solver: %s", name)
    return best, score, name
