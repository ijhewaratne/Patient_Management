from pydantic import BaseModel
from typing import Optional, List
from datetime import date, datetime

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    user_id: int
    role: str

class UserBase(BaseModel):
    name: str
    role: str

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    user_id: int
    is_active: bool
    created_at: datetime
    class Config:
        from_attributes = True

class PatientBase(BaseModel):
    full_name: str
    date_of_birth: date
    gender: str
    phone: str
    address: str
    guardian_name: Optional[str] = None
    guardian_phone: Optional[str] = None
    emergency_contact: Optional[str] = None
    allergies: Optional[str] = None
    medical_conditions: Optional[str] = None

class PatientCreate(PatientBase):
    pass

class PatientResponse(PatientBase):
    patient_id: int
    created_at: datetime
    updated_at: datetime
    class Config:
        from_attributes = True

class ConsultationBase(BaseModel):
    patient_id: int
    visit_type: str
    age_at_visit: int
    chief_complaint: Optional[str] = None
    diagnosis_impression: Optional[str] = None
    next_review_date: Optional[date] = None
    status: str = "draft"

class ConsultationCreate(ConsultationBase):
    pass

class ConsultationResponse(ConsultationBase):
    consultation_id: int
    doctor_id: int
    visit_date: datetime
    confirmed_by: Optional[int] = None
    confirmed_at: Optional[datetime] = None
    created_at: datetime
    class Config:
        from_attributes = True

class ClinicalNoteBase(BaseModel):
    consultation_id: int
    patient_id: int
    raw_transcript: Optional[str] = None
    ai_cleaned_draft: Optional[str] = None
    structured_note_json: Optional[str] = None
    final_confirmed_note: Optional[str] = None
    note_type: str
    status: str = "draft"

class ClinicalNoteCreate(ClinicalNoteBase):
    pass

class ClinicalNoteResponse(ClinicalNoteBase):
    note_id: int
    confirmed_by: Optional[int] = None
    confirmed_at: Optional[datetime] = None
    created_at: datetime
    class Config:
        from_attributes = True

class ConsultationDetailResponse(ConsultationResponse):
    clinical_notes: List[ClinicalNoteResponse] = []
        
class PrescriptionItemBase(BaseModel):
    medication_id: int
    medicine_name_snapshot: str
    generic_name_snapshot: str
    brand_name_snapshot: Optional[str] = None
    strength_snapshot: Optional[str] = None
    dose: str
    frequency: str
    timing: str
    duration: str
    route: str
    instructions: Optional[str] = None
    quantity: Optional[str] = None
    medicine_status: str
    change_reason: Optional[str] = None

class PrescriptionItemCreate(PrescriptionItemBase):
    pass

class PrescriptionItemResponse(PrescriptionItemBase):
    item_id: int
    prescription_id: int
    created_at: datetime
    class Config:
        from_attributes = True

class PrescriptionBase(BaseModel):
    patient_id: int
    consultation_id: int
    age_at_prescription: int
    status: str = "draft"
    next_review_date: Optional[date] = None

class PrescriptionCreate(PrescriptionBase):
    items: List[PrescriptionItemCreate]

class PrescriptionResponse(PrescriptionBase):
    prescription_id: int
    prescription_number: str
    doctor_id: int
    prescription_date: datetime
    confirmed_by: Optional[int] = None
    confirmed_at: Optional[datetime] = None
    printed_at: Optional[datetime] = None
    items: List[PrescriptionItemResponse] = []
    class Config:
        from_attributes = True

class PrescriptionPrintResponse(BaseModel):
    prescription_id: int
    status: str
    printed_at: datetime

class ClinicSettingsBase(BaseModel):
    clinic_name: Optional[str] = None
    clinic_address: Optional[str] = None
    clinic_phone: Optional[str] = None
    doctor_name: Optional[str] = None
    doctor_qualification: Optional[str] = None
    doctor_registration_number: Optional[str] = None
    prescription_footer: Optional[str] = None
    signature_image_optional: Optional[str] = None

class ClinicSettingsUpdate(ClinicSettingsBase):
    pass

class ClinicSettingsResponse(ClinicSettingsBase):
    clinic_id: int
    updated_at: datetime

    class Config:
        from_attributes = True

class PatientSummaryBase(BaseModel):
    active_diagnosis: Optional[str] = None
    key_history_summary: Optional[str] = None
    current_clinical_status: Optional[str] = None
    active_risk_flags: Optional[str] = None
    current_medication_summary: Optional[str] = None
    last_visit_summary: Optional[str] = None
    latest_plan: Optional[str] = None
    next_review_reason: Optional[str] = None

class PatientSummaryUpdate(PatientSummaryBase):
    doctor_confirmed: bool = True
    last_updated_consultation_id: Optional[int] = None

class PatientSummaryResponse(PatientSummaryBase):
    summary_id: int
    patient_id: int
    last_updated_consultation_id: Optional[int] = None
    doctor_confirmed: bool
    confirmed_by: Optional[int] = None
    updated_at: datetime

    class Config:
        from_attributes = True

class PatientSummaryVersionResponse(PatientSummaryBase):
    version_id: int
    patient_id: int
    summary_id: int
    last_updated_consultation_id: Optional[int] = None
    confirmed_by: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True

class NoteProcessingRequest(BaseModel):
    raw_transcript: str
    visit_type: str
    chief_complaint: Optional[str] = None
    diagnosis_impression: Optional[str] = None

class NoteProcessingResponse(BaseModel):
    cleaned_transcript: str
    ai_cleaned_draft: str
    final_draft_note: str
    structured_note_json: str
    extracted_chief_complaint: Optional[str] = None
    extracted_diagnosis_impression: Optional[str] = None
    processing_mode: str

class AudioTranscriptionResponse(BaseModel):
    transcript: str
    processing_mode: str
