from pydantic import BaseModel, Field, field_validator, model_validator
from typing import List, Optional, Any

class MetaInfo(BaseModel):
    generated_at: str
    source_files: List[str]
    format: str

class Metadata(BaseModel):
    test_case_id: str
    city: str
    distance_method: str
    allow_external_maps: bool
    priority_1_max_delay_min: int
    priority_2_max_delay_min: int
    priority_3_max_delay_min: int
    priority_4_max_delay_min: int
    priority_5_max_delay_min: int
    objective_cost_weight: float
    objective_time_weight: float

class Baseline(BaseModel):
    employee_id: str
    baseline_cost: float
    baseline_time_min: float

OFFICE_ID = "office"  # reserved: the solvers use it as the shared drop-off location
DROP_TOLERANCE_DEG = 1e-4  # ~11 m; one office is assumed for every employee


def normalize_id(v: Any) -> Any:
    """Excel numeric ID cells arrive as JSON numbers; the solvers use str() of the cell."""
    if isinstance(v, bool):
        return v
    if isinstance(v, int):
        return str(v)
    if isinstance(v, str):
        return v.strip()
    return v


def normalize_time(v: str) -> str:
    """Validator to convert HH:MM:SS to HH:MM to prevent solver.py crashes."""
    if v and v.count(':') == 2:
        return v.rsplit(':', 1)[0]
    return v

class Employee(BaseModel):
    employee_id: str = Field(min_length=1)
    pickup_lat: float
    pickup_lng: float
    drop_lat: float
    drop_lng: float
    priority: int
    earliest_pickup: str  # Format "HH:MM"
    latest_drop: str      # Format "HH:MM"
    vehicle_preference: str
    sharing_preference: str

    @field_validator('employee_id', mode='before')
    @classmethod
    def normalize_employee_id(cls, v: Any) -> Any:
        return normalize_id(v)

    @field_validator('earliest_pickup', 'latest_drop', mode='before')
    @classmethod
    def trim_seconds(cls, v: Any) -> Any:
        if isinstance(v, str):
            return normalize_time(v)
        return v

class Vehicle(BaseModel):
    vehicle_id: str = Field(min_length=1)
    current_lat: float
    current_lng: float
    fuel_type: str
    vehicle_type: str
    capacity: int
    cost_per_km: float
    avg_speed_kmph: float
    available_from: str   # Format "HH:MM"
    category: str

    @field_validator('vehicle_id', mode='before')
    @classmethod
    def normalize_vehicle_id(cls, v: Any) -> Any:
        return normalize_id(v)

    @field_validator('available_from', mode='before')
    @classmethod
    def trim_seconds(cls, v: Any) -> Any:
        if isinstance(v, str):
            return normalize_time(v)
        return v

class OptimizationRequest(BaseModel):
    employees: List[Employee] = Field(min_length=1)
    vehicles: List[Vehicle] = Field(min_length=1)
    
    filename: Optional[str] = "unknown_case"
    
    # New fields (optional for backward compatibility)
    meta_info: Optional[MetaInfo] = None
    metadata: Optional[Metadata] = None
    baseline: Optional[List[Baseline]] = None

    @model_validator(mode="after")
    def check_ids_and_office(self):
        ids = [e.employee_id for e in self.employees] + [v.vehicle_id for v in self.vehicles]
        if any(i.lower() == OFFICE_ID for i in ids):
            raise ValueError(f'"{OFFICE_ID}" is reserved and cannot be used as an employee or vehicle ID')
        seen, dupes = set(), set()
        for i in ids:
            (dupes if i in seen else seen).add(i)
        if dupes:
            raise ValueError(f"IDs must be unique across employees and vehicles; duplicated: {', '.join(sorted(dupes))}")

        first = self.employees[0]
        for e in self.employees[1:]:
            if abs(e.drop_lat - first.drop_lat) > DROP_TOLERANCE_DEG or abs(e.drop_lng - first.drop_lng) > DROP_TOLERANCE_DEG:
                raise ValueError(
                    f"All employees must share one drop-off (office) location; {e.employee_id} differs from {first.employee_id}")
        return self
