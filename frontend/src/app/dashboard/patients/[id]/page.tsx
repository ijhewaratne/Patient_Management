'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import {
  Consultation,
  Patient,
  Prescription,
  consultationAPI,
  patientAPI,
  prescriptionAPI,
  summaryAPI,
  PatientSummary,
  PatientSummaryInput,
  PatientSummaryVersion,
} from '@/lib/api';
import { ArrowLeft, User, Calendar, Phone, Activity, FileText, Pill, Save, RefreshCcw } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { calculateAge } from '@/lib/age';

export default function PatientProfile() {
  const { id } = useParams();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [history, setHistory] = useState<Consultation[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [summary, setSummary] = useState<PatientSummary | null>(null);
  const [summaryHistory, setSummaryHistory] = useState<PatientSummaryVersion[]>([]);
  const [summaryForm, setSummaryForm] = useState<PatientSummaryInput | null>(null);
  const [editingSummary, setEditingSummary] = useState(false);
  const [savingSummary, setSavingSummary] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPatientData = async () => {
      try {
        const ptData = await patientAPI.getById(Number(id));
        setPatient(ptData);
        
        const ptHistory = await consultationAPI.getHistory(Number(id));
        setHistory(ptHistory);
        
        const ptPresc = await prescriptionAPI.getByPatient(Number(id));
        setPrescriptions(ptPresc);

        const patientSummary = await summaryAPI.getByPatient(Number(id));
        const patientSummaryHistory = await summaryAPI.getHistoryForPatient(Number(id));
        setSummary(patientSummary);
        setSummaryHistory(patientSummaryHistory);
        setSummaryForm({
          active_diagnosis: patientSummary.active_diagnosis ?? '',
          key_history_summary: patientSummary.key_history_summary ?? '',
          current_clinical_status: patientSummary.current_clinical_status ?? '',
          active_risk_flags: patientSummary.active_risk_flags ?? '',
          current_medication_summary: patientSummary.current_medication_summary ?? '',
          last_visit_summary: patientSummary.last_visit_summary ?? '',
          latest_plan: patientSummary.latest_plan ?? '',
          next_review_reason: patientSummary.next_review_reason ?? '',
          last_updated_consultation_id: patientSummary.last_updated_consultation_id ?? null,
          doctor_confirmed: patientSummary.doctor_confirmed,
        });
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchPatientData();
  }, [id]);

  if (loading) return <div className="p-8">Loading patient profile...</div>;
  if (!patient) return <div className="p-8">Patient not found</div>;

  const currentAge = calculateAge(patient.date_of_birth);

  const handleSummaryChange = (
    event: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>,
  ) => {
    if (!summaryForm) return;
    setSummaryForm({
      ...summaryForm,
      [event.target.name]: event.target.value,
      doctor_confirmed: false,
    });
  };

  const handleSuggestSummary = async () => {
    try {
      const suggestion = await summaryAPI.suggestForPatient(Number(id));
      setSummaryForm({
        ...suggestion,
        active_diagnosis: suggestion.active_diagnosis ?? '',
        key_history_summary: suggestion.key_history_summary ?? '',
        current_clinical_status: suggestion.current_clinical_status ?? '',
        active_risk_flags: suggestion.active_risk_flags ?? '',
        current_medication_summary: suggestion.current_medication_summary ?? '',
        last_visit_summary: suggestion.last_visit_summary ?? '',
        latest_plan: suggestion.latest_plan ?? '',
        next_review_reason: suggestion.next_review_reason ?? '',
      });
      setEditingSummary(true);
    } catch (err) {
      console.error(err);
      alert('Failed to generate a snapshot suggestion.');
    }
  };

  const handleSaveSummary = async () => {
    if (!summaryForm) return;
    setSavingSummary(true);
    try {
      const saved = await summaryAPI.updateForPatient(Number(id), {
        ...summaryForm,
        doctor_confirmed: true,
      });
      const history = await summaryAPI.getHistoryForPatient(Number(id));
      setSummary(saved);
      setSummaryHistory(history);
      setSummaryForm({
        active_diagnosis: saved.active_diagnosis ?? '',
        key_history_summary: saved.key_history_summary ?? '',
        current_clinical_status: saved.current_clinical_status ?? '',
        active_risk_flags: saved.active_risk_flags ?? '',
        current_medication_summary: saved.current_medication_summary ?? '',
        last_visit_summary: saved.last_visit_summary ?? '',
        latest_plan: saved.latest_plan ?? '',
        next_review_reason: saved.next_review_reason ?? '',
        last_updated_consultation_id: saved.last_updated_consultation_id ?? null,
        doctor_confirmed: saved.doctor_confirmed,
      });
      setEditingSummary(false);
    } catch (err) {
      console.error(err);
      alert('Failed to save clinical snapshot.');
    } finally {
      setSavingSummary(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="p-2 bg-white rounded-full border border-gray-200 hover:bg-gray-50 text-gray-500 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Patient Profile</h1>
        </div>
        <div className="flex gap-3">
          <button className="bg-white text-gray-700 border border-gray-300 px-4 py-2 rounded-lg font-medium hover:bg-gray-50 transition-colors shadow-sm">
            Edit Patient
          </button>
          <Link href={`/dashboard/patients/${id}/consultation/capture`} className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 transition-colors shadow-sm">
            New Consultation
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Patient Details & Snapshot */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center text-xl font-bold">
                {patient.full_name.charAt(0)}
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">{patient.full_name}</h2>
                <p className="text-sm font-medium text-gray-500">PT-{patient.patient_id.toString().padStart(4, '0')}</p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <User className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-500">Gender & Age</p>
                  <p className="text-gray-900">{patient.gender}, {currentAge} years</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-500">Date of Birth</p>
                  <p className="text-gray-900">{format(new Date(patient.date_of_birth), 'PP')}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Phone className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-500">Phone</p>
                  <p className="text-gray-900">{patient.phone}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm border-t-4 border-t-rose-500">
            <div className="flex items-center gap-2 mb-4 text-rose-600 font-semibold">
              <Activity className="w-5 h-5" />
              <h3>Warnings & Allergies</h3>
            </div>
            {patient.allergies ? (
              <p className="text-gray-900">{patient.allergies}</p>
            ) : (
              <p className="text-gray-500 text-sm">No known allergies</p>
            )}
            {patient.medical_conditions && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-sm font-medium text-gray-500 mb-1">Medical Conditions</p>
                <p className="text-gray-900">{patient.medical_conditions}</p>
              </div>
            )}
          </div>

          <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Clinical Snapshot</h3>
                <p className="text-sm text-gray-500">Doctor-confirmed summary for follow-up visits.</p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleSuggestSummary}
                  className="inline-flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <RefreshCcw className="w-4 h-4" />
                  Refresh
                </button>
                <button
                  type="button"
                  onClick={() => setEditingSummary((current) => !current)}
                  className="inline-flex items-center gap-2 px-3 py-2 text-sm border border-indigo-200 rounded-lg text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition-colors"
                >
                  {editingSummary ? 'Close' : 'Edit'}
                </button>
              </div>
            </div>

            {editingSummary && summaryForm ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Active Diagnosis</label>
                  <input
                    type="text"
                    name="active_diagnosis"
                    value={summaryForm.active_diagnosis ?? ''}
                    onChange={handleSummaryChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                {[
                  ['key_history_summary', 'Key History Summary'],
                  ['current_clinical_status', 'Current Clinical Status'],
                  ['active_risk_flags', 'Allergies / Risk Flags'],
                  ['current_medication_summary', 'Current Medication'],
                  ['last_visit_summary', 'Last Visit Summary'],
                  ['latest_plan', 'Latest Plan'],
                  ['next_review_reason', 'Next Review Reason'],
                ].map(([name, label]) => (
                  <div key={name}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                    <textarea
                      name={name}
                      value={(summaryForm[name as keyof PatientSummaryInput] as string | null) ?? ''}
                      onChange={handleSummaryChange}
                      rows={3}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                ))}
                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={handleSaveSummary}
                    disabled={savingSummary}
                    className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    {savingSummary ? 'Saving...' : 'Confirm Snapshot'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">Active Diagnosis</p>
                  <p className="text-gray-900">{summary?.active_diagnosis || 'Not confirmed yet'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Key History</p>
                  <p className="text-gray-700 whitespace-pre-wrap">{summary?.key_history_summary || 'No summary available.'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Current Status</p>
                  <p className="text-gray-700 whitespace-pre-wrap">{summary?.current_clinical_status || 'No current status recorded.'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Current Medication</p>
                  <p className="text-gray-700 whitespace-pre-wrap">{summary?.current_medication_summary || 'No medication summary recorded.'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Latest Plan</p>
                  <p className="text-gray-700 whitespace-pre-wrap">{summary?.latest_plan || 'No plan recorded.'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Next Review</p>
                  <p className="text-gray-700 whitespace-pre-wrap">{summary?.next_review_reason || 'No next review note recorded.'}</p>
                </div>
                {summaryHistory.length > 0 && (
                  <div className="pt-4 border-t border-gray-100">
                    <p className="text-sm font-medium text-gray-500 mb-2">Snapshot History</p>
                    <div className="space-y-3">
                      {summaryHistory.slice(0, 3).map((version) => (
                        <div key={version.version_id} className="rounded-lg bg-gray-50 border border-gray-100 p-3">
                          <p className="text-xs uppercase tracking-wide text-gray-500">
                            Confirmed {format(new Date(version.created_at), 'PPP p')}
                          </p>
                          <p className="text-sm font-medium text-gray-900 mt-1">{version.active_diagnosis || 'No diagnosis recorded'}</p>
                          <p className="text-sm text-gray-600 mt-1 whitespace-pre-wrap">
                            {version.latest_plan || version.current_clinical_status || 'No summary text available.'}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Middle/Right Column: Timeline & Prescriptions */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-600" />
                Visit Timeline
              </h2>
            </div>
            <div className="p-6">
              {history.length > 0 ? (
                <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-300 before:to-transparent">
                  {history.map((consult) => (
                    <div key={consult.consultation_id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                      <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white bg-indigo-100 text-indigo-600 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                        <Calendar className="w-5 h-5" />
                      </div>
                      <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-gray-900">{format(new Date(consult.visit_date), 'MMM d, yyyy')}</span>
                          <span className={`text-xs font-medium px-2 py-1 rounded-full ${consult.status === 'confirmed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                            {consult.status}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-indigo-600 mb-2">{consult.visit_type === 'initial' ? 'Initial Consultation' : 'Follow-up Visit'}</p>
                        {consult.diagnosis_impression && (
                          <p className="text-sm text-gray-600 mb-3">{consult.diagnosis_impression}</p>
                        )}
                        <Link href={`/dashboard/patients/${id}/history/${consult.consultation_id}`} className="text-sm font-medium text-indigo-600 hover:text-indigo-800">
                          View details &rarr;
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-gray-500 py-8">No visits recorded yet.</p>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Pill className="w-5 h-5 text-indigo-600" />
                Prescription History
              </h2>
              <Link href={`/dashboard/patients/${id}/prescribe`} className="text-sm font-medium text-indigo-600 hover:text-indigo-800">
                New Prescription
              </Link>
            </div>
            {prescriptions.length > 0 ? (
              <div className="divide-y divide-gray-100">
                {prescriptions.map((presc) => (
                  <div key={presc.prescription_id} className="p-6 hover:bg-gray-50 transition-colors flex justify-between items-center">
                    <div>
                      <p className="font-medium text-gray-900">{presc.prescription_number}</p>
                      <p className="text-sm text-gray-500">{format(new Date(presc.prescription_date), 'PPP')}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-medium px-2 py-1 bg-gray-100 text-gray-600 rounded-full">{presc.status}</span>
                      <Link
                        href={`/dashboard/prescriptions/${presc.prescription_id}/print`}
                        className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
                      >
                        Print
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-500 py-8">No prescriptions generated yet.</p>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
