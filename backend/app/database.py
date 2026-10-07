from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.config import settings

# SQLite configuration: connect_args={"check_same_thread": False} is required for SQLite with FastAPI multi-threading
engine = create_engine(
    settings.DATABASE_URL,
    connect_args={"check_same_thread": False} if "sqlite" in settings.DATABASE_URL else {}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    """Dependency for obtaining a database session per request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
