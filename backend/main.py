from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from models import Base
from database import engine, run_startup_migrations

Base.metadata.create_all(bind=engine)
run_startup_migrations()

app = FastAPI(title="Patient Management System API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict this
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from routers import auth, patients, clinical_notes, medications, prescriptions, settings, summaries, note_tools

app.include_router(auth.router)
app.include_router(patients.router)
app.include_router(clinical_notes.router)
app.include_router(medications.router)
app.include_router(prescriptions.router)
app.include_router(settings.router)
app.include_router(summaries.router)
app.include_router(note_tools.router)

@app.get("/")
def read_root():
    return {"message": "Patient Management System API is running"}
