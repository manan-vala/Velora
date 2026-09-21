"""
run_solver.py  –  Run the solver tournament on a workbook without the API or OSRM.

Usage (from backend/):
    python scripts/run_solver.py --excel algo/templts/TestCase_TC03.xlsx
                                 [--matrix matrix_edge_list.json]
                                 [--time-limit 40] [--workers 3]
                                 [--output solver_output.json]

Without --matrix, distances come from road-factored haversine (scripts/fixtures.py),
so results match what the solvers see when OSRM has no data. Pass an edge list saved
from a real run to use OSRM distances.
"""

import argparse
import json
import logging
import os
import sys
import time

BACKEND = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BACKEND)

from algo.solver import solve_vrp  # noqa: E402
from fixtures import edge_list_from_payload, payload_from_workbook  # noqa: E402


def main():
    parser = argparse.ArgumentParser(description="Run LNS / ALNS / VROOM on a workbook and keep the best.")
    parser.add_argument("--excel", "-e", required=True, help="Workbook with employees, vehicles and metadata sheets.")
    parser.add_argument("--matrix", "-m", help="Edge list JSON (as produced by logic.generate_routes).")
    parser.add_argument("--time-limit", type=float, default=None, help="Per-solver budget in seconds.")
    parser.add_argument("--workers", type=int, default=3, help="Solver processes to run at once.")
    parser.add_argument("--output", "-o", default="solver_output.json")
    args = parser.parse_args()

    logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")

    with open(args.excel, "rb") as f:
        file_bytes = f.read()
    payload = payload_from_workbook(file_bytes, os.path.basename(args.excel))
    if args.matrix:
        with open(args.matrix, encoding="utf-8") as f:
            edges = json.load(f)
    else:
        edges = edge_list_from_payload(payload)

    started = time.time()
    result, score, winner = solve_vrp(payload, edges, file_bytes, time_limit=args.time_limit,
                                      max_workers=args.workers)

    with open(args.output, "w", encoding="utf-8") as f:
        json.dump(result, f, indent=2)

    print(f"Winner       : {winner} ({time.time() - started:.1f}s)")
    print(f"Solvers      : {result['summary']['solvers']}")
    print(f"Served       : {score['served_count']}/{len(payload['employees'])}")
    print(f"Hard / soft  : {score['hard_violations']} / {score['soft_violations']}")
    print(f"Objective    : {score['objective']:.2f}")
    print(f"Result saved : {os.path.abspath(args.output)}")


if __name__ == "__main__":
    main()
