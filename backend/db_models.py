"""
db_models.py – SQLAlchemy ORM models for application data.

All models use the shared Base from database.py; database.init_db() imports this
module before calling create_all(), so every table here gets created.
"""

from sqlalchemy import Column, Integer, Float, String, DateTime, func
from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    hashed_password = Column(String)


class OptimizationRunLog(Base):
    """Stores summary data for each successful optimization run (capped at 1000)."""

    __tablename__ = "optimization_run_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # --- Input metadata ---
    filename = Column(String, nullable=False, default="unknown")
    num_employees = Column(Integer, nullable=False)
    num_vehicles = Column(Integer, nullable=False)

    # --- Result metadata ---
    winner_algorithm = Column(String, nullable=False)          # LNS | ALNS | VROOM
    employees_served = Column(Integer, nullable=False)
    hard_violations = Column(Integer, nullable=False, default=0)
    soft_violations = Column(Integer, nullable=False, default=0)
    objective_score = Column(Float, nullable=False)
    total_cost = Column(Float, nullable=False)
    total_time_min = Column(Float, nullable=False)

    # --- Timing ---
    algo_duration_seconds = Column(Float, nullable=True)       # Solver step only
    total_duration_seconds = Column(Float, nullable=True)      # Full pipeline

    # --- Traceability ---
    task_id = Column(String, nullable=True)
    username = Column(String, nullable=True, index=True)  # who ran it
    vehicles_in_solution = Column(Integer, nullable=True)

    def __repr__(self):
        return (
            f"<OptimizationRunLog id={self.id} file={self.filename!r} "
            f"winner={self.winner_algorithm} served={self.employees_served}>"
        )
