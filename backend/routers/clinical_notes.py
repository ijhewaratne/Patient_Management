from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import auth, models, schemas, database
from audit import log_action

router = APIRouter(prefix="/consultations", tags=["consultations"])


def consultation_snapshot(consultation: models.Consultation) -> dict:
    return {
        "consultation_id": consultation.consultation_id,
        "patient_id": consultation.patient_id,
        "doctor_id": consultation.doctor_id,
        "visit_date": consultation.visit_date,
        "visit_type": consultation.visit_type,
        "age_at_visit": consultation.age_at_visit,
        "chief_complaint": consultation.chief_complaint,
        "diagnosis_impression": consultation.diagnosis_impression,
        "next_review_date": consultation.next_review_date,
        "status": consultation.status,
        "confirmed_by": consultation.confirmed_by,
        "confirmed_at": consultation.confirmed_at,
    }


def clinical_note_snapshot(note: models.ClinicalNote) -> dict:
    return {
        "note_id": note.note_id,
        "consultation_id": note.consultation_id,
        "patient_id": note.patient_id,
        "raw_transcript": note.raw_transcript,
        "ai_cleaned_draft": note.ai_cleaned_draft,
        "structured_note_json": note.structured_note_json,
        "final_confirmed_note": note.final_confirmed_note,
        "note_type": note.note_type,
        "status": note.status,
        "confirmed_by": note.confirmed_by,
        "confirmed_at": note.confirmed_at,
    }

@router.post("/", response_model=schemas.ConsultationResponse)
def create_consultation(
    consultation: schemas.ConsultationCreate,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    patient = db.query(models.Patient).filter(models.Patient.patient_id == consultation.patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    payload = consultation.model_dump()
    payload["doctor_id"] = current_user.user_id
    if payload["status"] == "confirmed":
        payload["confirmed_by"] = current_user.user_id
        payload["confirmed_at"] = datetime.utcnow()

    db_consultation = models.Consultation(**payload)
    db.add(db_consultation)
    db.flush()
    log_action(
        db,
        current_user.user_id,
        "CREATE",
        "consultations",
        db_consultation.consultation_id,
        new_value=consultation_snapshot(db_consultation),
    )
    db.commit()
    db.refresh(db_consultation)
    return db_consultation

@router.post("/{consultation_id}/notes", response_model=schemas.ClinicalNoteResponse)
def create_clinical_note(
    consultation_id: int,
    note: schemas.ClinicalNoteCreate,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    db_consultation = db.query(models.Consultation).filter(models.Consultation.consultation_id == consultation_id).first()
    if not db_consultation:
        raise HTTPException(status_code=404, detail="Consultation not found")

    if db_consultation.patient_id != note.patient_id:
        raise HTTPException(status_code=400, detail="Clinical note patient does not match consultation patient")

    payload = note.model_dump()
    if payload["status"] == "confirmed":
        payload["confirmed_by"] = current_user.user_id
        payload["confirmed_at"] = datetime.utcnow()
        if db_consultation.status != "confirmed":
            db_consultation.status = "confirmed"
            db_consultation.confirmed_by = current_user.user_id
            db_consultation.confirmed_at = payload["confirmed_at"]

    db_note = models.ClinicalNote(**payload)
    db.add(db_note)
    db.flush()
    log_action(
        db,
        current_user.user_id,
        "CONFIRM" if db_note.status == "confirmed" else "CREATE",
        "clinical_notes",
        db_note.note_id,
        new_value=clinical_note_snapshot(db_note),
    )
    db.commit()
    db.refresh(db_note)
    return db_note

@router.get("/{patient_id}/history", response_model=List[schemas.ConsultationResponse])
def get_patient_consultations(
    patient_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    return db.query(models.Consultation).filter(models.Consultation.patient_id == patient_id).order_by(models.Consultation.visit_date.desc()).all()

@router.get("/{consultation_id}/notes", response_model=List[schemas.ClinicalNoteResponse])
def get_consultation_notes(
    consultation_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    return db.query(models.ClinicalNote).filter(models.ClinicalNote.consultation_id == consultation_id).all()

@router.get("/detail/{consultation_id}", response_model=schemas.ConsultationDetailResponse)
def get_consultation_detail(
    consultation_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    consultation = db.query(models.Consultation).filter(
        models.Consultation.consultation_id == consultation_id
    ).first()
    if not consultation:
        raise HTTPException(status_code=404, detail="Consultation not found")
    return consultation
