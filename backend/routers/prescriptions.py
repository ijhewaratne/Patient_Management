from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import auth, models, schemas, database
import uuid

router = APIRouter(prefix="/prescriptions", tags=["prescriptions"])

@router.post("/", response_model=schemas.PrescriptionResponse)
def create_prescription(
    prescription: schemas.PrescriptionCreate,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    patient = db.query(models.Patient).filter(models.Patient.patient_id == prescription.patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    consultation = db.query(models.Consultation).filter(
        models.Consultation.consultation_id == prescription.consultation_id
    ).first()
    if not consultation:
        raise HTTPException(status_code=404, detail="Consultation not found")
    if consultation.patient_id != prescription.patient_id:
        raise HTTPException(status_code=400, detail="Prescription consultation does not belong to patient")

    if prescription.status not in {"draft", "confirmed"}:
        raise HTTPException(status_code=400, detail="Prescription must be created as draft or confirmed")

    # Generate a unique prescription number
    presc_number = f"RX-{uuid.uuid4().hex[:8].upper()}"
    confirmed_at = datetime.utcnow() if prescription.status == "confirmed" else None

    db_prescription = models.Prescription(
        prescription_number=presc_number,
        patient_id=prescription.patient_id,
        consultation_id=prescription.consultation_id,
        doctor_id=current_user.user_id,
        age_at_prescription=prescription.age_at_prescription,
        status=prescription.status,
        next_review_date=prescription.next_review_date,
        confirmed_by=current_user.user_id if confirmed_at else None,
        confirmed_at=confirmed_at,
    )
    db.add(db_prescription)
    db.commit()
    db.refresh(db_prescription)
    
    for item in prescription.items:
        db_item = models.PrescriptionItem(
            prescription_id=db_prescription.prescription_id,
            **item.model_dump()
        )
        db.add(db_item)
        
    db.commit()
    db.refresh(db_prescription)
    return db_prescription

@router.get("/{patient_id}", response_model=List[schemas.PrescriptionResponse])
def get_patient_prescriptions(
    patient_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    return db.query(models.Prescription).filter(models.Prescription.patient_id == patient_id).order_by(models.Prescription.prescription_date.desc()).all()

@router.get("/detail/{prescription_id}", response_model=schemas.PrescriptionResponse)
def get_prescription(
    prescription_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    presc = db.query(models.Prescription).filter(models.Prescription.prescription_id == prescription_id).first()
    if not presc:
        raise HTTPException(status_code=404, detail="Prescription not found")
    return presc

@router.post("/{prescription_id}/mark-printed", response_model=schemas.PrescriptionPrintResponse)
def mark_prescription_printed(
    prescription_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    presc = db.query(models.Prescription).filter(models.Prescription.prescription_id == prescription_id).first()
    if not presc:
        raise HTTPException(status_code=404, detail="Prescription not found")
    if presc.status != "confirmed":
        raise HTTPException(status_code=400, detail="Only confirmed prescriptions can be printed")

    presc.status = "printed"
    presc.printed_at = datetime.utcnow()
    db.commit()
    return schemas.PrescriptionPrintResponse(
        prescription_id=presc.prescription_id,
        status=presc.status,
        printed_at=presc.printed_at,
    )
