'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Calendar, FileText, User } from 'lucide-react';
import { ConsultationDetail, Patient, consultationAPI, patientAPI } from '@/lib/api';
import { format } from 'date-fns';

export default function ConsultationHistoryDetailPage() {
  const { id, consultationId } = useParams();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [consultation, setConsultation] = useState<ConsultationDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [patientData, consultationData] = await Promise.all([
          patientAPI.getById(Number(id)),
          consultationAPI.getById(Number(consultationId)),
        ]);
        setPatient(patientData);
        setConsultation(consultationData);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [consultationId, id]);

  if (loading) {
    return <div className="p-8 text-gray-500">Loading consultation history...</div>;
  }

  if (!patient || !consultation) {
    return <div className="p-8 text-gray-500">Consultation record not found.</div>;
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/dashboard/patients/${id}`} className="p-2 bg-white rounded-full border border-gray-200 hover:bg-gray-50 text-gray-500 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Consultation Detail</h1>
          <p className="text-sm text-gray-500">
            {patient.full_name} · {format(new Date(consultation.visit_date), 'PPP')}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm space-y-4">
          <div className="flex items-start gap-3">
            <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-gray-500">Visit Date</p>
              <p className="text-gray-900">{format(new Date(consultation.visit_date), 'PPP p')}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <User className="w-5 h-5 text-gray-400 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-gray-500">Visit Type</p>
              <p className="text-gray-900">{consultation.visit_type === 'initial' ? 'Initial consultation' : 'Follow-up consultation'}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <FileText className="w-5 h-5 text-gray-400 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-gray-500">Status</p>
              <p className="text-gray-900 capitalize">{consultation.status}</p>
            </div>
          </div>
          {consultation.chief_complaint && (
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">Chief Complaint</p>
              <p className="text-gray-900">{consultation.chief_complaint}</p>
            </div>
          )}
          {consultation.diagnosis_impression && (
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">Diagnosis / Impression</p>
              <p className="text-gray-900">{consultation.diagnosis_impression}</p>
            </div>
          )}
        </div>

        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-100 bg-gray-50/50">
            <h2 className="text-lg font-semibold text-gray-900">Clinical Notes</h2>
          </div>

          <div className="divide-y divide-gray-100">
            {consultation.clinical_notes.length === 0 ? (
              <div className="p-6 text-gray-500">No clinical notes were recorded for this consultation.</div>
            ) : (
              consultation.clinical_notes.map((note) => (
                <div key={note.note_id} className="p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-gray-900">{note.note_type === 'initial_history' ? 'Initial history note' : 'Follow-up progress note'}</p>
                      <p className="text-sm text-gray-500">{format(new Date(note.created_at), 'PPP p')}</p>
                    </div>
                    <span className="text-xs font-medium px-2 py-1 rounded-full bg-indigo-50 text-indigo-700">
                      {note.status}
                    </span>
                  </div>

                  {note.raw_transcript && (
                    <div>
                      <p className="text-sm font-medium text-gray-500 mb-1">Raw Transcript</p>
                      <p className="text-gray-700 whitespace-pre-wrap">{note.raw_transcript}</p>
                    </div>
                  )}

                  {note.ai_cleaned_draft && (
                    <div>
                      <p className="text-sm font-medium text-gray-500 mb-1">AI Draft</p>
                      <p className="text-gray-700 whitespace-pre-wrap">{note.ai_cleaned_draft}</p>
                    </div>
                  )}

                  {note.final_confirmed_note && (
                    <div>
                      <p className="text-sm font-medium text-gray-500 mb-1">Confirmed Note</p>
                      <p className="text-gray-900 whitespace-pre-wrap">{note.final_confirmed_note}</p>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
