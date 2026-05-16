import axios from 'axios';

const API_URL = 'http://localhost:8000';

function getStoredAccessToken() {
  if (typeof window === 'undefined') {
    return null;
  }
  return localStorage.getItem('access_token') || localStorage.getItem('token');
}

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = getStoredAccessToken();
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export type User = {
  user_id: number;
  name: string;
  role: string;
  is_active: boolean;
  created_at: string;
};

export type AuthToken = {
  access_token: string;
  token_type: string;
  user_id: number;
  role: string;
};

export type Patient = {
  patient_id: number;
  full_name: string;
  date_of_birth: string;
  gender: string;
  phone: string;
  address: string;
  guardian_name?: string | null;
  guardian_phone?: string | null;
  emergency_contact?: string | null;
  allergies?: string | null;
  medical_conditions?: string | null;
  created_at: string;
  updated_at: string;
};

export type Consultation = {
  consultation_id: number;
  patient_id: number;
  doctor_id: number;
  visit_date: string;
  visit_type: string;
  age_at_visit: number;
  chief_complaint?: string | null;
  diagnosis_impression?: string | null;
  next_review_date?: string | null;
  status: string;
  confirmed_by?: number | null;
  confirmed_at?: string | null;
  created_at: string;
};

export type ClinicalNote = {
  note_id: number;
  consultation_id: number;
  patient_id: number;
  raw_transcript?: string | null;
  ai_cleaned_draft?: string | null;
  structured_note_json?: string | null;
  final_confirmed_note?: string | null;
  note_type: string;
  status: string;
  confirmed_by?: number | null;
  confirmed_at?: string | null;
  created_at: string;
};

export type ConsultationDetail = Consultation & {
  clinical_notes: ClinicalNote[];
};

export type PrescriptionItem = {
  item_id?: number;
  prescription_id?: number;
  medication_id: number;
  medicine_name_snapshot: string;
  generic_name_snapshot: string;
  brand_name_snapshot?: string | null;
  strength_snapshot?: string | null;
  dose: string;
  frequency: string;
  timing: string;
  duration: string;
  route: string;
  instructions?: string | null;
  quantity?: string | null;
  medicine_status: string;
  change_reason?: string | null;
  created_at?: string;
};

export type Prescription = {
  prescription_id: number;
  prescription_number: string;
  patient_id: number;
  consultation_id: number;
  doctor_id: number;
  prescription_date: string;
  age_at_prescription: number;
  status: string;
  next_review_date?: string | null;
  confirmed_by?: number | null;
  confirmed_at?: string | null;
  printed_at?: string | null;
  items: PrescriptionItem[];
};

export type ClinicSettings = {
  clinic_id: number;
  clinic_name?: string | null;
  clinic_address?: string | null;
  clinic_phone?: string | null;
  doctor_name?: string | null;
  doctor_qualification?: string | null;
  doctor_registration_number?: string | null;
  prescription_footer?: string | null;
  signature_image_optional?: string | null;
  updated_at: string;
};

export type PatientSummary = {
  summary_id: number;
  patient_id: number;
  active_diagnosis?: string | null;
  key_history_summary?: string | null;
  current_clinical_status?: string | null;
  active_risk_flags?: string | null;
  current_medication_summary?: string | null;
  last_visit_summary?: string | null;
  latest_plan?: string | null;
  next_review_reason?: string | null;
  last_updated_consultation_id?: number | null;
  doctor_confirmed: boolean;
  confirmed_by?: number | null;
  updated_at: string;
};

export type PatientSummaryInput = {
  active_diagnosis?: string | null;
  key_history_summary?: string | null;
  current_clinical_status?: string | null;
  active_risk_flags?: string | null;
  current_medication_summary?: string | null;
  last_visit_summary?: string | null;
  latest_plan?: string | null;
  next_review_reason?: string | null;
  last_updated_consultation_id?: number | null;
  doctor_confirmed: boolean;
};

export type PatientSummaryVersion = {
  version_id: number;
  patient_id: number;
  summary_id: number;
  active_diagnosis?: string | null;
  key_history_summary?: string | null;
  current_clinical_status?: string | null;
  active_risk_flags?: string | null;
  current_medication_summary?: string | null;
  last_visit_summary?: string | null;
  latest_plan?: string | null;
  next_review_reason?: string | null;
  last_updated_consultation_id?: number | null;
  confirmed_by?: number | null;
  created_at: string;
};

export type NoteProcessingResult = {
  cleaned_transcript: string;
  ai_cleaned_draft: string;
  final_draft_note: string;
  structured_note_json: string;
  extracted_chief_complaint?: string | null;
  extracted_diagnosis_impression?: string | null;
  processing_mode: string;
};

export type AudioTranscriptionResult = {
  transcript: string;
  processing_mode: string;
};

export type Medication = {
  medication_id: number;
  generic_name: string;
  brand_name?: string | null;
  drug_class?: string | null;
  available_strengths?: string | null;
  age_group?: string | null;
  default_dose?: string | null;
  default_frequency?: string | null;
  default_timing?: string | null;
  default_duration?: string | null;
  route?: string | null;
  default_instructions?: string | null;
  warnings?: string | null;
  max_dose_note?: string | null;
};

export type PrescriptionPrintData = {
  prescription_id: number;
  prescription_number: string;
  consultation_id: number;
  prescription_date: string;
  age_at_prescription: number;
  status: string;
  next_review_date?: string | null;
  confirmed_at?: string | null;
  printed_at?: string | null;
  patient: {
    patient_id: number;
    full_name: string;
    date_of_birth: string;
    gender: string;
    phone: string;
    address: string;
  };
  doctor: {
    user_id: number;
    name: string;
    role: string;
  };
  clinic: ClinicSettings;
  items: Array<Required<Pick<PrescriptionItem, 'medication_id' | 'medicine_name_snapshot' | 'generic_name_snapshot' | 'dose' | 'frequency' | 'timing' | 'duration' | 'route' | 'medicine_status'>> & PrescriptionItem>;
};

export const fetchPrescriptionPrintData = async (
  prescriptionId: number,
): Promise<PrescriptionPrintData> => {
  const res = await api.get(`/prescriptions/${prescriptionId}/print`);
  return res.data;
};

export const authAPI = {
  login: async (credentials: URLSearchParams): Promise<AuthToken> => {
    const res = await api.post('/auth/token', credentials, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
    return res.data;
  },
  me: async (): Promise<User> => {
    const res = await api.get('/auth/me');
    return res.data;
  },
};

export const patientAPI = {
  search: async (query = ''): Promise<Patient[]> => {
    const res = await api.get(`/patients/?query=${query}`);
    return res.data;
  },
  create: async (data: Omit<Patient, 'patient_id' | 'created_at' | 'updated_at'>): Promise<Patient> => {
    const res = await api.post('/patients/', data);
    return res.data;
  },
  getById: async (id: number): Promise<Patient> => {
    const res = await api.get(`/patients/${id}`);
    return res.data;
  },
};

export const consultationAPI = {
  getHistory: async (patientId: number): Promise<Consultation[]> => {
    const res = await api.get(`/consultations/${patientId}/history`);
    return res.data;
  },
  create: async (data: {
    patient_id: number;
    visit_type: string;
    age_at_visit: number;
    chief_complaint?: string;
    diagnosis_impression?: string;
    next_review_date?: string | null;
    status: string;
  }): Promise<Consultation> => {
    const res = await api.post('/consultations/', data);
    return res.data;
  },
  createNote: async (consultationId: number, data: {
    consultation_id: number;
    patient_id: number;
    raw_transcript?: string;
    ai_cleaned_draft?: string;
    structured_note_json?: string;
    final_confirmed_note?: string;
    note_type: string;
    status: string;
  }) => {
    const res = await api.post(`/consultations/${consultationId}/notes`, data);
    return res.data;
  },
  getNotes: async (consultationId: number): Promise<ClinicalNote[]> => {
    const res = await api.get(`/consultations/${consultationId}/notes`);
    return res.data;
  },
  getById: async (consultationId: number): Promise<ConsultationDetail> => {
    const res = await api.get(`/consultations/detail/${consultationId}`);
    return res.data;
  },
  processNote: async (data: {
    raw_transcript: string;
    visit_type: string;
    chief_complaint?: string;
    diagnosis_impression?: string;
  }): Promise<NoteProcessingResult> => {
    const res = await api.post('/note-tools/structure', data);
    return res.data;
  },
  transcribeAudio: async (audioFile: Blob): Promise<AudioTranscriptionResult> => {
    const formData = new FormData();
    formData.append('audio', audioFile, 'dictation.webm');
    const res = await api.post('/note-tools/transcribe', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return res.data;
  },
};

export const medicationAPI = {
  getAll: async (): Promise<Medication[]> => {
    const res = await api.get('/medications/');
    return res.data;
  },
};

export const prescriptionAPI = {
  create: async (data: {
    patient_id: number;
    consultation_id: number;
    age_at_prescription: number;
    status: string;
    next_review_date?: string | null;
    items: PrescriptionItem[];
  }): Promise<Prescription> => {
    const res = await api.post('/prescriptions/', data);
    return res.data;
  },
  getByPatient: async (patientId: number): Promise<Prescription[]> => {
    const res = await api.get(`/prescriptions/${patientId}`);
    return res.data;
  },
  getById: async (id: number): Promise<Prescription> => {
    const res = await api.get(`/prescriptions/detail/${id}`);
    return res.data;
  },
  markPrinted: async (id: number) => {
    const res = await api.post(`/prescriptions/${id}/mark-printed`);
    return res.data;
  },
  getPrintData: async (id: number): Promise<PrescriptionPrintData> => {
    return fetchPrescriptionPrintData(id);
  },
};

export const settingsAPI = {
  getClinic: async (): Promise<ClinicSettings> => {
    const res = await api.get('/settings/clinic');
    return res.data;
  },
  updateClinic: async (data: Omit<ClinicSettings, 'clinic_id' | 'updated_at'>): Promise<ClinicSettings> => {
    const res = await api.put('/settings/clinic', data);
    return res.data;
  },
};

export const summaryAPI = {
  getByPatient: async (patientId: number): Promise<PatientSummary> => {
    const res = await api.get(`/patients/${patientId}/summary`);
    return res.data;
  },
  suggestForPatient: async (patientId: number): Promise<PatientSummaryInput> => {
    const res = await api.get(`/patients/${patientId}/summary/suggest`);
    return res.data;
  },
  updateForPatient: async (patientId: number, data: PatientSummaryInput): Promise<PatientSummary> => {
    const res = await api.put(`/patients/${patientId}/summary`, data);
    return res.data;
  },
  getHistoryForPatient: async (patientId: number): Promise<PatientSummaryVersion[]> => {
    const res = await api.get(`/patients/${patientId}/summary/history`);
    return res.data;
  },
};
