from fixtures import edge_list_from_payload, payload_from_workbook
from algo.feasibilityfinal import get_feasibility_score
from algo.vroom_solver import solve_vroom


def test_vroom_solves_in_process(workbook_bytes):
    file_bytes = workbook_bytes("TestCase_TC03.xlsx")
    payload = payload_from_workbook(file_bytes)
    edges = edge_list_from_payload(payload)

    result = solve_vroom(payload, edges, file_bytes)

    assert result["vehicles"], "VROOM returned no routes"
    for vehicle in result["vehicles"]:
        assert vehicle["route_sequence"][-1]["location"] == "office"
        assert len(vehicle["routes"]) == len(vehicle["route_sequence"]) - 1
    score = get_feasibility_score(file_bytes, edges, result)
    assert score["served_count"] + len(result["unassigned"]) == len(payload["employees"])
