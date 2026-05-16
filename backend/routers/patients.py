from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import String
from sqlalchemy.orm import Session
from typing import List
import auth, models, schemas, database

router = APIRouter(prefix="/patients", tags=["patients"])

@router.post("/", response_model=schemas.PatientResponse)
def create_patient(
    patient: schemas.PatientCreate,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    db_patient = models.Patient(**patient.model_dump())
    db.add(db_patient)
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
