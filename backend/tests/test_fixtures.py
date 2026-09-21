from pathlib import Path

import pytest

from fixtures import edge_list_from_payload, payload_from_workbook
from models import OptimizationRequest

TEMPLATES = sorted((Path(__file__).resolve().parent.parent / "algo" / "templts").glob("*.xlsx"))


@pytest.mark.parametrize("path", TEMPLATES, ids=lambda p: p.name)
def test_every_template_converts_to_a_valid_request(path):
    payload = payload_from_workbook(path.read_bytes(), path.name)
    OptimizationRequest(**payload)

    edges = edge_list_from_payload(payload)
    n_emp, n_veh = len(payload["employees"]), len(payload["vehicles"])
    # emp-emp permutations + veh-emp + emp<->office + veh<->office
    assert len(edges) == n_emp * (n_emp - 1) + n_veh * n_emp + 2 * n_emp + 2 * n_veh
