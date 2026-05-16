from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import auth, models, schemas, database
import uuid
from audit import log_action
from routers.settings import get_or_create_settings

router = APIRouter(prefix="/prescriptions", tags=["prescriptions"])


def prescription_item_snapshot(item: models.PrescriptionItem) -> dict:
    return {
        "item_id": item.item_id,
        "medication_id": item.medication_id,
        "medicine_name_snapshot": item.medicine_name_snapshot,
        "generic_name_snapshot": item.generic_name_snapshot,
        "brand_name_snapshot": item.brand_name_snapshot,
        "strength_snapshot": item.strength_snapshot,
        "dose": item.dose,
        "frequency": item.frequency,
        "timing": item.timing,
        "duration": item.duration,
        "route": item.route,
        "instructions": item.instructions,
        "quantity": item.quantity,
        "medicine_status": item.medicine_status,
        "change_reason": item.change_reason,
    }


def prescription_snapshot(prescription: models.Prescription) -> dict:
    return {
        "prescription_id": prescription.prescription_id,
        "prescription_number": prescription.prescription_number,
        "patient_id": prescription.patient_id,
        "consultation_id": prescription.consultation_id,
        "doctor_id": prescription.doctor_id,
        "prescription_date": prescription.prescription_date,
        "age_at_prescription": prescription.age_at_prescription,
        "status": prescription.status,
        "next_review_date": prescription.next_review_date,
        "confirmed_by": prescription.confirmed_by,
        "confirmed_at": prescription.confirmed_at,
        "printed_at": prescription.printed_at,
        "items": [prescription_item_snapshot(item) for item in prescription.items],
    }


def prescription_snapshot_with_items(
    prescription: models.Prescription,
    items: list[models.PrescriptionItem],
) -> dict:
    snapshot = prescription_snapshot(prescription)
    snapshot["items"] = [prescription_item_snapshot(item) for item in items]
    return snapshot

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
    db.flush()
    
    created_items: list[models.PrescriptionItem] = []
    for item in prescription.items:
        db_item = models.PrescriptionItem(
            prescription_id=db_prescription.prescription_id,
            **item.model_dump()
        )
        db.add(db_item)
        created_items.append(db_item)
    db.flush()
    log_action(
        db,
        current_user.user_id,
        "CREATE",
        "prescriptions",
        db_prescription.prescription_id,
        new_value=prescription_snapshot_with_items(db_prescription, created_items),
    )
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


@router.get("/{prescription_id}/print", response_model=schemas.PrescriptionPrintData)
def get_prescription_print_data(
    prescription_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    presc = db.query(models.Prescription).filter(models.Prescription.prescription_id == prescription_id).first()
    if not presc:
        raise HTTPException(status_code=404, detail="Prescription not found")
    if presc.status not in {"confirmed", "printed"}:
        raise HTTPException(status_code=400, detail="Only confirmed or printed prescriptions can be rendered")

    patient = db.query(models.Patient).filter(models.Patient.patient_id == presc.patient_id).first()
    doctor = db.query(models.User).filter(models.User.user_id == presc.doctor_id).first()
    if not patient or not doctor:
        raise HTTPException(status_code=404, detail="Prescription context is incomplete")

    clinic = get_or_create_settings(db)

    return schemas.PrescriptionPrintData(
        prescription_id=presc.prescription_id,
        prescription_number=presc.prescription_number,
        consultation_id=presc.consultation_id,
        prescription_date=presc.prescription_date,
        age_at_prescription=presc.age_at_prescription,
        status=presc.status,
        next_review_date=presc.next_review_date,
        confirmed_at=presc.confirmed_at,
        printed_at=presc.printed_at,
        patient=schemas.PrescriptionPrintPatient(
            patient_id=patient.patient_id,
            full_name=patient.full_name,
            date_of_birth=patient.date_of_birth,
            gender=patient.gender,
            phone=patient.phone,
            address=patient.address,
        ),
        doctor=schemas.PrescriptionPrintDoctor(
            user_id=doctor.user_id,
            name=doctor.name,
            role=doctor.role,
        ),
        clinic=schemas.ClinicSettingsResponse.model_validate(clinic),
        items=[
            schemas.PrescriptionPrintItem(
                item_id=item.item_id,
                medication_id=item.medication_id,
                medicine_name_snapshot=item.medicine_name_snapshot,
                generic_name_snapshot=item.generic_name_snapshot,
                brand_name_snapshot=item.brand_name_snapshot,
                strength_snapshot=item.strength_snapshot,
                dose=item.dose,
                frequency=item.frequency,
                timing=item.timing,
                duration=item.duration,
                route=item.route,
                instructions=item.instructions,
                quantity=item.quantity,
                medicine_status=item.medicine_status,
                change_reason=item.change_reason,
            )
            for item in presc.items
        ],
    )

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

    previous_state = {
        "status": presc.status,
        "printed_at": presc.printed_at,
    }
    presc.status = "printed"
    presc.printed_at = datetime.utcnow()
    log_action(
        db,
        current_user.user_id,
        "PRINT",
        "prescriptions",
        presc.prescription_id,
        old_value=previous_state,
        new_value={
            "status": presc.status,
            "printed_at": presc.printed_at,
        },
    )
    db.commit()
    return schemas.PrescriptionPrintResponse(
        prescription_id=presc.prescription_id,
        status=presc.status,
        printed_at=presc.printed_at,
    )
