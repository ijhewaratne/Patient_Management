from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

import auth
import database
import models
import schemas

router = APIRouter(prefix="/patients", tags=["patient-summary"])

def clip(value: Optional[str], limit: int = 280) -> Optional[str]:
    if not value:
        return None
    normalized = " ".join(value.split())
    return normalized[: limit - 1] + "…" if len(normalized) > limit else normalized

def get_or_create_summary(db: Session, patient_id: int) -> models.PatientSummary:
    summary = db.query(models.PatientSummary).filter(
        models.PatientSummary.patient_id == patient_id
    ).first()
    if summary:
        return summary

    summary = models.PatientSummary(patient_id=patient_id, doctor_confirmed=False)
    db.add(summary)
    db.commit()
    db.refresh(summary)
    return summary

def build_medication_summary(prescription: Optional[models.Prescription]) -> Optional[str]:
    if not prescription:
        return None

    active_items = [
        item for item in prescription.items
        if item.medicine_status != "stopped"
    ]
    if not active_items:
        return None

    return "; ".join(
        f"{item.medicine_name_snapshot} {item.dose} {item.frequency}".strip()
        for item in active_items
    )

def create_summary_version(
    db: Session,
    summary: models.PatientSummary,
    confirmed_by: Optional[int],
):
    version = models.PatientSummaryVersion(
        patient_id=summary.patient_id,
        summary_id=summary.summary_id,
        active_diagnosis=summary.active_diagnosis,
        key_history_summary=summary.key_history_summary,
        current_clinical_status=summary.current_clinical_status,
        active_risk_flags=summary.active_risk_flags,
        current_medication_summary=summary.current_medication_summary,
        last_visit_summary=summary.last_visit_summary,
        latest_plan=summary.latest_plan,
        next_review_reason=summary.next_review_reason,
        last_updated_consultation_id=summary.last_updated_consultation_id,
        confirmed_by=confirmed_by,
    )
    db.add(version)

@router.get("/{patient_id}/summary", response_model=schemas.PatientSummaryResponse)
def get_patient_summary(
    patient_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    patient = db.query(models.Patient).filter(models.Patient.patient_id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    return get_or_create_summary(db, patient_id)

@router.get("/{patient_id}/summary/suggest", response_model=schemas.PatientSummaryUpdate)
def suggest_patient_summary(
    patient_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    patient = db.query(models.Patient).filter(models.Patient.patient_id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    latest_consultation = db.query(models.Consultation).filter(
        models.Consultation.patient_id == patient_id,
        models.Consultation.status == "confirmed",
    ).order_by(models.Consultation.visit_date.desc()).first()

    latest_note = None
    initial_note = None
    if latest_consultation:
        latest_note = db.query(models.ClinicalNote).filter(
            models.ClinicalNote.consultation_id == latest_consultation.consultation_id,
            models.ClinicalNote.status == "confirmed",
        ).order_by(models.ClinicalNote.created_at.desc()).first()

    initial_note = db.query(models.ClinicalNote).join(
        models.Consultation,
        models.Consultation.consultation_id == models.ClinicalNote.consultation_id,
    ).filter(
        models.ClinicalNote.patient_id == patient_id,
        models.ClinicalNote.status == "confirmed",
        models.Consultation.visit_type == "initial",
    ).order_by(models.ClinicalNote.created_at.asc()).first()

    latest_prescription = db.query(models.Prescription).filter(
        models.Prescription.patient_id == patient_id,
        models.Prescription.status.in_(["confirmed", "printed"]),
    ).order_by(models.Prescription.prescription_date.desc()).first()

    return schemas.PatientSummaryUpdate(
        active_diagnosis=latest_consultation.diagnosis_impression if latest_consultation else None,
        key_history_summary=clip(
            initial_note.final_confirmed_note if initial_note else patient.medical_conditions
        ),
        current_clinical_status=clip(
            latest_note.final_confirmed_note if latest_note else latest_consultation.chief_complaint if latest_consultation else None
        ),
        active_risk_flags=clip(patient.allergies or patient.medical_conditions),
        current_medication_summary=build_medication_summary(latest_prescription),
        last_visit_summary=clip(
            latest_consultation.chief_complaint if latest_consultation else None
        ),
        latest_plan=clip(
            latest_note.final_confirmed_note if latest_note else latest_consultation.diagnosis_impression if latest_consultation else None
        ),
        next_review_reason=clip(
            f"Next review on {latest_consultation.next_review_date.isoformat()}"
            if latest_consultation and latest_consultation.next_review_date
            else None
        ),
        doctor_confirmed=False,
        last_updated_consultation_id=latest_consultation.consultation_id if latest_consultation else None,
    )

@router.put("/{patient_id}/summary", response_model=schemas.PatientSummaryResponse)
def update_patient_summary(
    patient_id: int,
    payload: schemas.PatientSummaryUpdate,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    patient = db.query(models.Patient).filter(models.Patient.patient_id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    summary = get_or_create_summary(db, patient_id)
    for field, value in payload.model_dump().items():
        setattr(summary, field, value)
    summary.confirmed_by = current_user.user_id if payload.doctor_confirmed else None
    if payload.doctor_confirmed:
        create_summary_version(db, summary, current_user.user_id)
    db.commit()
    db.refresh(summary)
    return summary

@router.get("/{patient_id}/summary/history", response_model=list[schemas.PatientSummaryVersionResponse])
def get_patient_summary_history(
    patient_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    patient = db.query(models.Patient).filter(models.Patient.patient_id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    return db.query(models.PatientSummaryVersion).filter(
        models.PatientSummaryVersion.patient_id == patient_id
    ).order_by(models.PatientSummaryVersion.created_at.desc()).all()
