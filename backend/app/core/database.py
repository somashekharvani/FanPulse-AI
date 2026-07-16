import logging
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.core.config import settings

logger = logging.getLogger("fanpulse.database")

db_url = settings.DATABASE_URL
connect_args = {}
engine = None

if db_url.startswith("postgresql"):
    try:
        # Attempt to connect to PostgreSQL
        temp_engine = create_engine(db_url, pool_pre_ping=True)
        conn = temp_engine.connect()
        conn.close()
        engine = temp_engine
        logger.info("Successfully connected to PostgreSQL database.")
    except Exception as e:
        logger.warning(f"Failed to connect to PostgreSQL database: {e}. Falling back to SQLite.")
        db_url = "sqlite:///./fanpulse.db"

if not engine:
    if db_url.startswith("sqlite"):
        connect_args = {"check_same_thread": False}
    engine = create_engine(
        db_url,
        connect_args=connect_args,
        pool_pre_ping=True
    )
    logger.info(f"Database connection initialized with URL: {db_url}")

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    # Import models here to register them with Base metadata
    from app.models.models import Base as ModelBase
    ModelBase.metadata.create_all(bind=engine)
