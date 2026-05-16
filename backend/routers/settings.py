from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
import auth, database, models, schemas

router = APIRouter(prefix="/settings", tags=["settings"])

def get_or_create_settings(db: Session) -> models.ClinicSettings:
    settings = db.query(models.ClinicSettings).first()
    if settings:
        return settings

    settings = models.ClinicSettings(
        clinic_name="Psychiatric Clinic",
        clinic_address="",
        clinic_phone="",
        doctor_name="",
        doctor_qualification="",
        doctor_registration_number="",
        prescription_footer="",
        signature_image_optional="",
    )
    db.add(settings)
    db.commit()
    db.refresh(settings)
    return settings

@router.get("/clinic", response_model=schemas.ClinicSettingsResponse)
def get_clinic_settings(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    return get_or_create_settings(db)

@router.put("/clinic", response_model=schemas.ClinicSettingsResponse)
def update_clinic_settings(
    payload: schemas.ClinicSettingsUpdate,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    settings = get_or_create_settings(db)
    for field, value in payload.model_dump().items():
        setattr(settings, field, value)
    db.commit()
    db.refresh(settings)
    return settings
