from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker

SQLALCHEMY_DATABASE_URL = "sqlite:///./patient_management.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def run_startup_migrations():
    with engine.begin() as connection:
        clinical_note_columns = {
            row[1] for row in connection.execute(text("PRAGMA table_info(clinical_notes)"))
        }
        if "structured_note_json" not in clinical_note_columns:
            connection.execute(
                text("ALTER TABLE clinical_notes ADD COLUMN structured_note_json TEXT")
            )

        patient_summary_columns = {
            row[1] for row in connection.execute(text("PRAGMA table_info(patient_summary)"))
        }
        if "last_visit_summary" not in patient_summary_columns:
            connection.execute(
                text("ALTER TABLE patient_summary ADD COLUMN last_visit_summary TEXT")
            )
        if "next_review_reason" not in patient_summary_columns:
            connection.execute(
                text("ALTER TABLE patient_summary ADD COLUMN next_review_reason TEXT")
            )

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
