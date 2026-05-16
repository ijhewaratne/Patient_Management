'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ClipboardCheck, FileText, Pill } from 'lucide-react';
import { calculateAge } from '@/lib/age';
import { clearDraft, loadDraft } from '@/lib/consultation';
import { consultationAPI, patientAPI, Patient } from '@/lib/api';

function parseStructuredNote(value: string): Record<string, string> {
  try {
    return JSON.parse(value) as Record<string, string>;
  } catch {
    return {};
  }
}

function renderStructuredNote(sections: Record<string, string>) {
  return Object.entries(sections)
    .map(([heading, content]) => `${heading}\n${content || '[Doctor to review]'}`)
    .join('\n\n')
    .trim()
}

export default function ConsultationReviewPage() {
  const params = useParams<{ id: string }>();
  const patientId = Number(params.id);
  const router = useRouter();

  const [patient, setPatient] = useState<Patient | null>(null);
  const [draftMissing, setDraftMissing] = useState(false);
  const [visitType, setVisitType] = useState('initial');
  const [chiefComplaint, setChiefComplaint] = useState('');
  const [diagnosisImpression, setDiagnosisImpression] = useState('');
  const [rawTranscript, setRawTranscript] = useState('');
  const [processingMode, setProcessingMode] = useState('');
  const [structuredSections, setStructuredSections] = useState<Record<string, string>>({});
  const [showTranscript, setShowTranscript] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchPatient = async () => {
      try {
        const data = await patientAPI.getById(patientId);
        setPatient(data);
      } catch (err) {
        console.error(err);
      }
    };

    const draft = loadDraft(patientId);
    if (!draft) {
      setDraftMissing(true);
      return;
    }

    setVisitType(draft.visitType);
    setChiefComplaint(draft.chiefComplaint);
    setDiagnosisImpression(draft.diagnosisImpression);
    setRawTranscript(draft.rawTranscript);
    setProcessingMode(draft.structuredResult.processing_mode);
    setStructuredSections(parseStructuredNote(draft.structuredResult.structured_note_json));
    fetchPatient();
  }, [patientId]);

  const finalPreview = useMemo(() => renderStructuredNote(structuredSections), [structuredSections]);

  const handleSectionChange = (section: string, value: string) => {
    setStructuredSections((current) => ({
      ...current,
      [section]: value,
    }));
  };

  const confirmConsultation = async (withPrescription: boolean) => {
    if (!patient) {
      return;
    }

    setSaving(true);
    try {
      const consultation = await consultationAPI.create({
        patient_id: patientId,
        visit_type: visitType,
        age_at_visit: calculateAge(patient.date_of_birth),
        chief_complaint: chiefComplaint || undefined,
        diagnosis_impression: diagnosisImpression || undefined,
        status: 'confirmed',
      });

      await consultationAPI.createNote(consultation.consultation_id, {
        consultation_id: consultation.consultation_id,
        patient_id: patientId,
        raw_transcript: rawTranscript,
        ai_cleaned_draft: finalPreview,
        structured_note_json: JSON.stringify(structuredSections),
        final_confirmed_note: finalPreview,
        note_type: visitType === 'initial' ? 'initial_history' : 'follow_up_progress',
        status: 'confirmed',
      });

      clearDraft(patientId);
      if (withPrescription) {
        router.push(`/dashboard/patients/${patientId}/prescribe?consultationId=${consultation.consultation_id}`);
        return;
      }
      router.push(`/dashboard/patients/${patientId}`);
    } catch (err) {
      console.error(err);
      alert('Failed to confirm the consultation.');
    } finally {
      setSaving(false);
    }
  };

  if (draftMissing) {
    return (
      <div className="mx-auto max-w-3xl rounded-xl border border-amber-200 bg-amber-50 p-6 text-amber-900">
        <h1 className="text-xl font-semibold">No consultation draft found</h1>
        <p className="mt-2 text-sm">
          Start from the capture screen first so there is a transcript to review.
        </p>
        <Link
          href={`/dashboard/patients/${patientId}/consultation/capture`}
          className="mt-4 inline-flex rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700"
        >
          Go to Capture
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href={`/dashboard/patients/${patientId}/consultation/capture`}
          className="rounded-full border border-gray-200 bg-white p-2 text-gray-500 transition-colors hover:bg-gray-50"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Consultation Review</h1>
          <p className="text-sm text-gray-500">
            Edit each section, then confirm the note or continue directly into prescribing.
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">{patient?.full_name || 'Loading patient...'}</h2>
              <p className="text-sm text-gray-500">
                {visitType === 'initial' ? 'Initial history' : 'Follow-up progress'} • {processingMode}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowTranscript((current) => !current)}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              {showTranscript ? 'Hide Raw Transcript' : 'Show Raw Transcript'}
            </button>
          </div>

          {showTranscript && (
            <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-4">
              <p className="whitespace-pre-wrap text-sm text-gray-700">{rawTranscript}</p>
            </div>
          )}

          <div className="mt-6 space-y-5">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Chief Complaint</label>
              <input
                value={chiefComplaint}
                onChange={(event) => setChiefComplaint(event.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Diagnosis / Impression</label>
              <input
                value={diagnosisImpression}
                onChange={(event) => setDiagnosisImpression(event.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {Object.entries(structuredSections).map(([section, value]) => (
              <div key={section}>
                <label className="mb-1 block text-sm font-medium text-gray-700">{section}</label>
                <textarea
                  value={value}
                  onChange={(event) => handleSectionChange(section, event.target.value)}
                  rows={4}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-800 outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-indigo-600" />
              <h2 className="text-lg font-semibold text-gray-900">Live Final Preview</h2>
            </div>
            <pre className="mt-4 whitespace-pre-wrap rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
              {finalPreview}
            </pre>
          </div>

          <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => confirmConsultation(false)}
                disabled={saving}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-indigo-600 px-4 py-2.5 text-sm font-medium text-indigo-600 hover:bg-indigo-50 disabled:opacity-50"
              >
                <ClipboardCheck className="h-4 w-4" />
                {saving ? 'Saving...' : 'Confirm Note Only'}
              </button>
              <button
                type="button"
                onClick={() => confirmConsultation(true)}
                disabled={saving}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                <Pill className="h-4 w-4" />
                {saving ? 'Saving...' : 'Confirm & Prescribe'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
