import time
from pathlib import Path

import pytest

import solver_stubs as stubs
from algo.solver import SolverError, run_solvers, solve_vrp
from fixtures import edge_list_from_payload, payload_from_workbook

TEMPLATES = sorted((Path(__file__).resolve().parent.parent / "algo" / "templts").glob("*.xlsx"))


def _args(workbook_bytes):
    file_bytes = workbook_bytes("TestCase_TC03.xlsx")
    payload = payload_from_workbook(file_bytes)
    return payload, edge_list_from_payload(payload), file_bytes


def test_hanging_solver_is_killed_and_the_rest_still_win(workbook_bytes):
    payload, edges, file_bytes = _args(workbook_bytes)
    started = time.monotonic()
    best, _score, winner = solve_vrp(payload, edges, file_bytes, solvers={"GOOD": stubs.ok, "HANG": stubs.hang},
                                     time_limit=1, grace=2, max_workers=2)
    elapsed = time.monotonic() - started
    assert winner == "GOOD"
    assert best["summary"]["solvers"] == {"GOOD": "ok", "HANG": "timed out"}
    assert elapsed < 12, f"hung solver held the job for {elapsed:.1f}s"


def test_crashing_solvers_are_reported_without_internals(workbook_bytes):
    payload, edges, file_bytes = _args(workbook_bytes)
    best, _score, winner = solve_vrp(payload, edges, file_bytes,
                                     solvers={"GOOD": stubs.ok, "BOOM": stubs.boom, "EXIT": stubs.hard_exit},
                                     time_limit=5, grace=5, max_workers=3)
    assert winner == "GOOD"
    assert best["summary"]["solvers"] == {"GOOD": "ok", "BOOM": "failed", "EXIT": "failed"}
    assert "secret" not in str(best)


def test_all_solvers_failing_raises(workbook_bytes):
    payload, edges, file_bytes = _args(workbook_bytes)
    with pytest.raises(SolverError):
        solve_vrp(payload, edges, file_bytes, solvers={"BOOM": stubs.boom}, time_limit=5, grace=5, max_workers=1)


@pytest.mark.parametrize("max_workers,overlap", [(1, False), (2, True)])
def test_max_workers_limits_concurrent_solver_processes(max_workers, overlap):
    results, failures = run_solvers({"A": stubs.slow_ok, "B": stubs.slow_ok}, (None, [], b""),
                                    time_limit=10, grace=10, max_workers=max_workers)
    assert not failures
    a, b = results["A"]["summary"], results["B"]["summary"]
    overlapped = a["started"] < b["finished"] and b["started"] < a["finished"]
    assert overlapped is overlap


@pytest.mark.parametrize("path", TEMPLATES, ids=lambda p: p.name)
def test_real_solvers_finish_within_budget_on_every_template(path):
    file_bytes = path.read_bytes()
    payload = payload_from_workbook(file_bytes, path.name)
    edges = edge_list_from_payload(payload)
    time_limit, grace = 8, 15

    started = time.monotonic()
    best, score, winner = solve_vrp(payload, edges, file_bytes, time_limit=time_limit, grace=grace, max_workers=3)
    elapsed = time.monotonic() - started

    statuses = best["summary"]["solvers"]
    assert set(statuses) == {"LNS", "ALNS", "VROOM"}
    assert statuses["VROOM"] == "ok"
    if len(payload["employees"]) <= 20:
        assert statuses == {"LNS": "ok", "ALNS": "ok", "VROOM": "ok"}
    # A timed-out solver is killed at limit + grace; the job never waits longer than that.
    assert elapsed < time_limit + grace + 10
    assert winner in {"LNS", "ALNS", "VROOM"}
    assert score["served_count"] > 0
