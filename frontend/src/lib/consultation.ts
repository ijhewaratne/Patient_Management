import type { NoteProcessingResult } from '@/lib/api';

const draftKey = (patientId: number) => `consultation-draft:${patientId}`;

export type ConsultationDraft = {
  patientId: number;
  visitType: string;
  chiefComplaint: string;
  diagnosisImpression: string;
  rawTranscript: string;
  structuredResult: NoteProcessingResult;
  updatedAt: string;
};

export function saveDraft(draft: Omit<ConsultationDraft, 'updatedAt'>) {
  if (typeof window === 'undefined') {
    return;
  }
  const payload: ConsultationDraft = {
    ...draft,
    updatedAt: new Date().toISOString(),
  };
  localStorage.setItem(draftKey(draft.patientId), JSON.stringify(payload));
}

export function loadDraft(patientId: number): ConsultationDraft | null {
  if (typeof window === 'undefined') {
    return null;
  }
  const raw = localStorage.getItem(draftKey(patientId));
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as ConsultationDraft;
  } catch {
    return null;
  }
}

export function clearDraft(patientId: number) {
  if (typeof window === 'undefined') {
    return;
  }
  localStorage.removeItem(draftKey(patientId));
}
