from sqlalchemy import Boolean, Column, ForeignKey, Integer, String, Date, DateTime, Text, Float
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base

class User(Base):
    __tablename__ = "users"
    user_id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    role = Column(String) # doctor / assistant / admin
    password_hash = Column(String)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class Patient(Base):
    __tablename__ = "patients"
    patient_id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String, index=True)
    date_of_birth = Column(Date)
    gender = Column(String)
    phone = Column(String, index=True)
    address = Column(String)
    guardian_name = Column(String)
    guardian_phone = Column(String)
    emergency_contact = Column(String)
    allergies = Column(Text)
    medical_conditions = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    consultations = relationship("Consultation", back_populates="patient")
    prescriptions = relationship("Prescription", back_populates="patient")

class Consultation(Base):
    __tablename__ = "consultations"
    consultation_id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.patient_id"))
    doctor_id = Column(Integer, ForeignKey("users.user_id"))
    visit_date = Column(DateTime, default=datetime.utcnow)
    visit_type = Column(String) # initial / follow_up
    age_at_visit = Column(Integer)
    chief_complaint = Column(Text)
    diagnosis_impression = Column(Text)
    next_review_date = Column(Date)
    status = Column(String) # draft / confirmed
    confirmed_by = Column(Integer, ForeignKey("users.user_id"))
    confirmed_at = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    patient = relationship("Patient", back_populates="consultations")
    clinical_notes = relationship("ClinicalNote", back_populates="consultation")

class ClinicalNote(Base):
    __tablename__ = "clinical_notes"
    note_id = Column(Integer, primary_key=True, index=True)
    consultation_id = Column(Integer, ForeignKey("consultations.consultation_id"))
    patient_id = Column(Integer, ForeignKey("patients.patient_id"))
    raw_transcript = Column(Text)
    ai_cleaned_draft = Column(Text)
    structured_note_json = Column(Text)
    final_confirmed_note = Column(Text)
    note_type = Column(String) # initial_history / follow_up_progress
    status = Column(String) # draft / confirmed
    confirmed_by = Column(Integer, ForeignKey("users.user_id"))
    confirmed_at = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    consultation = relationship("Consultation", back_populates="clinical_notes")

class PatientSummary(Base):
    __tablename__ = "patient_summary"
    summary_id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.patient_id"))
    active_diagnosis = Column(Text)
    key_history_summary = Column(Text)
    current_clinical_status = Column(Text)
    active_risk_flags = Column(Text)
    current_medication_summary = Column(Text)
    last_visit_summary = Column(Text)
    latest_plan = Column(Text)
    next_review_reason = Column(Text)
    last_updated_consultation_id = Column(Integer, ForeignKey("consultations.consultation_id"))
    doctor_confirmed = Column(Boolean, default=False)
    confirmed_by = Column(Integer, ForeignKey("users.user_id"))
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class PatientSummaryVersion(Base):
    __tablename__ = "patient_summary_versions"
    version_id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.patient_id"))
    summary_id = Column(Integer, ForeignKey("patient_summary.summary_id"))
    active_diagnosis = Column(Text)
    key_history_summary = Column(Text)
    current_clinical_status = Column(Text)
    active_risk_flags = Column(Text)
    current_medication_summary = Column(Text)
    last_visit_summary = Column(Text)
    latest_plan = Column(Text)
    next_review_reason = Column(Text)
    last_updated_consultation_id = Column(Integer, ForeignKey("consultations.consultation_id"))
    confirmed_by = Column(Integer, ForeignKey("users.user_id"))
    created_at = Column(DateTime, default=datetime.utcnow)

class MedicationMaster(Base):
    __tablename__ = "medication_master"
    medication_id = Column(Integer, primary_key=True, index=True)
    generic_name = Column(String, index=True)
    brand_name = Column(String)
    drug_class = Column(String)
    available_strengths = Column(String)
    age_group = Column(String)
    default_dose = Column(String)
    default_frequency = Column(String)
    default_timing = Column(String)
    default_duration = Column(String)
    route = Column(String)
    default_instructions = Column(Text)
    warnings = Column(Text)
    max_dose_note = Column(Text)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class Prescription(Base):
    __tablename__ = "prescriptions"
    prescription_id = Column(Integer, primary_key=True, index=True)
    prescription_number = Column(String, unique=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.patient_id"))
    consultation_id = Column(Integer, ForeignKey("consultations.consultation_id"))
    doctor_id = Column(Integer, ForeignKey("users.user_id"))
    prescription_date = Column(DateTime, default=datetime.utcnow)
    age_at_prescription = Column(Integer)
    status = Column(String) # draft / confirmed / printed
    next_review_date = Column(Date)
    confirmed_by = Column(Integer, ForeignKey("users.user_id"))
    confirmed_at = Column(DateTime)
    printed_at = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    patient = relationship("Patient", back_populates="prescriptions")
    items = relationship("PrescriptionItem", back_populates="prescription")

class PrescriptionItem(Base):
    __tablename__ = "prescription_items"
    item_id = Column(Integer, primary_key=True, index=True)
    prescription_id = Column(Integer, ForeignKey("prescriptions.prescription_id"))
    medication_id = Column(Integer, ForeignKey("medication_master.medication_id"))
    medicine_name_snapshot = Column(String)
    generic_name_snapshot = Column(String)
    brand_name_snapshot = Column(String)
    strength_snapshot = Column(String)
    dose = Column(String)
    frequency = Column(String)
    timing = Column(String)
    duration = Column(String)
    route = Column(String)
    instructions = Column(Text)
    quantity = Column(String)
    medicine_status = Column(String) # new / continue / changed / stopped
    change_reason = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    prescription = relationship("Prescription", back_populates="items")

class ClinicSettings(Base):
    __tablename__ = "clinic_settings"
    clinic_id = Column(Integer, primary_key=True, index=True)
    clinic_name = Column(String)
    clinic_address = Column(Text)
    clinic_phone = Column(String)
    doctor_name = Column(String)
    doctor_qualification = Column(String)
    doctor_registration_number = Column(String)
    prescription_footer = Column(Text)
    signature_image_optional = Column(String)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class AuditLog(Base):
    __tablename__ = "audit_logs"
    audit_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id"))
    action = Column(String)
    table_name = Column(String)
    record_id = Column(Integer)
    old_value = Column(Text)
    new_value = Column(Text)
    timestamp = Column(DateTime, default=datetime.utcnow)

class BackupLog(Base):
    __tablename__ = "backup_logs"
    backup_id = Column(Integer, primary_key=True, index=True)
    backup_time = Column(DateTime, default=datetime.utcnow)
    backup_location = Column(String)
    backup_status = Column(String)
    file_hash = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
