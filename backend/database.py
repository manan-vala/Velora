import logging

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

from config import DATABASE_URL

logger = logging.getLogger(__name__)

# Dokku and Heroku use 'postgres://', but SQLAlchemy 2.0+ requires 'postgresql://'
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

# pool_pre_ping avoids errors with stale DB connections.
engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def init_db() -> bool:
    """Create any missing tables. Returns False (and logs) if the database is unreachable."""
    import db_models  # noqa: F401  registers every model on Base.metadata

    try:
        Base.metadata.create_all(bind=engine)
        return True
    except Exception:
        logger.exception("Could not create database tables; run logging and auth are unavailable")
        return False


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
