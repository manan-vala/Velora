"""Module-level solver stand-ins: spawned solver processes must be able to import them."""

import os
import time


def _empty(started):
    return {"vehicles": [], "summary": {"started": started, "finished": time.time()}}


def ok(input_data, matrix_edge_list, file_bytes, time_limit):
    return _empty(time.time())


def slow_ok(input_data, matrix_edge_list, file_bytes, time_limit):
    started = time.time()
    time.sleep(1.0)
    return _empty(started)


def hang(input_data, matrix_edge_list, file_bytes, time_limit):
    while True:
        time.sleep(1)


def boom(input_data, matrix_edge_list, file_bytes, time_limit):
    raise ValueError("secret internal detail")


def hard_exit(input_data, matrix_edge_list, file_bytes, time_limit):
    os._exit(3)
