"""Build API payloads and offline distance matrices from a test workbook, without OSRM."""

import math
from datetime import datetime, time as dtime
from io import BytesIO

import pandas as pd

ROAD_FACTOR = 1.3
REFERENCE_SPEED_KMPH = 30.0


def _time_str(value) -> str:
    if isinstance(value, (dtime, datetime)):
        return value.strftime("%H:%M")
    if isinstance(value, float) and 0.0 <= value < 1.0:
        minutes = round(value * 24 * 60)
        return f"{minutes // 60:02d}:{minutes % 60:02d}"
    return str(value).strip()[:5]


def payload_from_workbook(file_bytes: bytes, filename: str = "fixture.xlsx") -> dict:
    """Return the dict the frontend sends as `json_data` for this workbook."""
    xls = pd.ExcelFile(BytesIO(file_bytes), engine="openpyxl")
    employees = pd.read_excel(xls, "employees")
    vehicles = pd.read_excel(xls, "vehicles")
    return {
        "filename": filename,
        "employees": [
            {
                "employee_id": str(r["employee_id"]).strip(),
                "pickup_lat": float(r["pickup_lat"]),
                "pickup_lng": float(r["pickup_lng"]),
                "drop_lat": float(r["drop_lat"]),
                "drop_lng": float(r["drop_lng"]),
                "priority": int(r["priority"]),
                "earliest_pickup": _time_str(r["earliest_pickup"]),
                "latest_drop": _time_str(r["latest_drop"]),
                "vehicle_preference": str(r["vehicle_preference"]),
                "sharing_preference": str(r["sharing_preference"]),
            }
            for _, r in employees.iterrows()
        ],
        "vehicles": [
            {
                "vehicle_id": str(r["vehicle_id"]).strip(),
                "current_lat": float(r["current_lat"]),
                "current_lng": float(r["current_lng"]),
                "fuel_type": str(r["fuel_type"]),
                "vehicle_type": str(r["vehicle_type"]),
                "capacity": int(r["capacity"]),
                "cost_per_km": float(r["cost_per_km"]),
                "avg_speed_kmph": float(r["avg_speed_kmph"]),
                "available_from": _time_str(r["available_from"]),
                "category": str(r["category"]),
            }
            for _, r in vehicles.iterrows()
        ],
    }


def haversine_km(lat1, lng1, lat2, lng2) -> float:
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = (math.sin(dlat / 2) ** 2
         + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlng / 2) ** 2)
    return 2 * 6371.0 * math.asin(math.sqrt(a))


class HaversineMatrix:
    """Stand-in for router.MatrixService: same get_pair() contract, road-factored haversine values."""

    def __init__(self, payload: dict):
        self.coords = {}
        employees = payload["employees"]
        if employees:
            self.coords["office"] = (employees[0]["drop_lat"], employees[0]["drop_lng"])
        for v in payload["vehicles"]:
            self.coords[v["vehicle_id"]] = (v["current_lat"], v["current_lng"])
        for e in employees:
            self.coords[e["employee_id"]] = (e["pickup_lat"], e["pickup_lng"])

    def get_pair(self, id_from, id_to):
        if id_from not in self.coords or id_to not in self.coords:
            return None
        km = haversine_km(*self.coords[id_from], *self.coords[id_to]) * ROAD_FACTOR
        return {
            "distance_meters": km * 1000.0,
            "duration_seconds": km / REFERENCE_SPEED_KMPH * 3600.0,
        }


def edge_list_from_payload(payload: dict) -> list:
    """Edge list in the shape logic.generate_routes produces, from haversine distances."""
    from logic import generate_routes
    from models import OptimizationRequest

    request = OptimizationRequest(**payload)
    return generate_routes(request, HaversineMatrix(payload))
