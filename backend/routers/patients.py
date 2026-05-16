from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import String
from sqlalchemy.orm import Session
from typing import List
import auth, models, schemas, database
from audit import log_action

router = APIRouter(prefix="/patients", tags=["patients"])


def patient_snapshot(patient: models.Patient) -> dict:
    return {
        "patient_id": patient.patient_id,
        "full_name": patient.full_name,
        "date_of_birth": patient.date_of_birth,
        "gender": patient.gender,
        "phone": patient.phone,
        "address": patient.address,
        "guardian_name": patient.guardian_name,
        "guardian_phone": patient.guardian_phone,
        "emergency_contact": patient.emergency_contact,
        "allergies": patient.allergies,
        "medical_conditions": patient.medical_conditions,
        "created_at": patient.created_at,
        "updated_at": patient.updated_at,
    }

@router.post("/", response_model=schemas.PatientResponse)
def create_patient(
    patient: schemas.PatientCreate,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    db_patient = models.Patient(**patient.model_dump())
    db.add(db_patient)
    db.flush()
    log_action(
        db,
        current_user.user_id,
        "CREATE",
        "patients",
        db_patient.patient_id,
        new_value=patient_snapshot(db_patient),
    )
    db.commit()
    db.refresh(db_patient)
    return db_patient

@router.get("/", response_model=List[schemas.PatientResponse])
def search_patients(
    query: str = "",
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    if query:
        patients = db.query(models.Patient).filter(
            models.Patient.full_name.contains(query) | 
            models.Patient.phone.contains(query) |
            models.Patient.patient_id.cast(String).contains(query) |
            models.Patient.date_of_birth.cast(String).contains(query) |
            models.Patient.address.contains(query)
        ).offset(skip).limit(limit).all()
    else:
        patients = db.query(models.Patient).offset(skip).limit(limit).all()
    return patients

@router.get("/{patient_id}", response_model=schemas.PatientResponse)
def get_patient(
    patient_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    db_patient = db.query(models.Patient).filter(models.Patient.patient_id == patient_id).first()
    if db_patient is None:
        raise HTTPException(status_code=404, detail="Patient not found")
    return db_patient
