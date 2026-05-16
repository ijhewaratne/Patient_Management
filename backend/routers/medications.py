from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List, Optional
import auth, models, database
from pydantic import BaseModel

router = APIRouter(prefix="/medications", tags=["medications"])

class MedicationResponse(BaseModel):
    medication_id: int
    generic_name: str
    brand_name: Optional[str] = None
    drug_class: Optional[str] = None
    available_strengths: Optional[str] = None
    age_group: Optional[str] = None
    default_dose: Optional[str] = None
    default_frequency: Optional[str] = None
    default_timing: Optional[str] = None
    default_duration: Optional[str] = None
    route: Optional[str] = None
    default_instructions: Optional[str] = None
    warnings: Optional[str] = None
    max_dose_note: Optional[str] = None

    class Config:
        from_attributes = True

@router.get("/", response_model=List[MedicationResponse])
def get_medications(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    return db.query(models.MedicationMaster).filter(models.MedicationMaster.is_active == True).all()

@router.post("/seed")
def seed_medications(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    # Basic list of psychiatric medications for MVP
    meds = [
        {"generic_name": "Sertraline", "drug_class": "SSRI", "default_dose": "50 mg", "default_frequency": "Once daily", "default_timing": "Morning", "default_duration": "1 month", "route": "Oral"},
        {"generic_name": "Escitalopram", "drug_class": "SSRI", "default_dose": "10 mg", "default_frequency": "Once daily", "default_timing": "Morning", "default_duration": "1 month", "route": "Oral"},
        {"generic_name": "Fluoxetine", "drug_class": "SSRI", "default_dose": "20 mg", "default_frequency": "Once daily", "default_timing": "Morning", "default_duration": "1 month", "route": "Oral"},
        {"generic_name": "Mirtazapine", "drug_class": "NaSSA", "default_dose": "15 mg", "default_frequency": "Once daily", "default_timing": "Night", "default_duration": "1 month", "route": "Oral"},
        {"generic_name": "Venlafaxine", "drug_class": "SNRI", "default_dose": "75 mg", "default_frequency": "Once daily", "default_timing": "Morning", "default_duration": "1 month", "route": "Oral"},
        {"generic_name": "Quetiapine", "drug_class": "Atypical Antipsychotic", "default_dose": "25 mg", "default_frequency": "Once daily", "default_timing": "Night", "default_duration": "1 month", "route": "Oral"},
        {"generic_name": "Olanzapine", "drug_class": "Atypical Antipsychotic", "default_dose": "5 mg", "default_frequency": "Once daily", "default_timing": "Night", "default_duration": "1 month", "route": "Oral"},
        {"generic_name": "Risperidone", "drug_class": "Atypical Antipsychotic", "default_dose": "1 mg", "default_frequency": "Once daily", "default_timing": "Night", "default_duration": "1 month", "route": "Oral"},
        {"generic_name": "Clonazepam", "drug_class": "Benzodiazepine", "default_dose": "0.5 mg", "default_frequency": "As needed", "default_timing": "Custom", "default_duration": "2 weeks", "route": "Oral"}
    ]
    
    count = 0
    for med in meds:
        existing = db.query(models.MedicationMaster).filter(models.MedicationMaster.generic_name == med["generic_name"]).first()
        if not existing:
            db_med = models.MedicationMaster(**med)
            db.add(db_med)
            count += 1
            
    db.commit()
    return {"message": f"Seeded {count} medications"}
