'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { consultationAPI, patientAPI, Patient } from '@/lib/api';
import { calculateAge } from '@/lib/age';
import { ArrowLeft, Mic, Save, Sparkles, Square } from 'lucide-react';
import Link from 'next/link';

type BrowserSpeechRecognitionEvent = {
  results: ArrayLike<{
    isFinal: boolean;
    0: { transcript: string };
    length: number;
  }>;
};

type BrowserSpeechRecognition = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: BrowserSpeechRecognitionEvent) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type SpeechRecognitionConstructor = new () => BrowserSpeechRecognition;

type FormState = {
  visit_type: string;
  chief_complaint: string;
  diagnosis_impression: string;
  raw_transcript: string;
  ai_cleaned_draft: string;
  structured_note_json: string;
  final_confirmed_note: string;
};

const INITIAL_FORM: FormState = {
  visit_type: 'initial',
  chief_complaint: '',
  diagnosis_impression: '',
  raw_transcript: '',
  ai_cleaned_draft: '',
  structured_note_json: '',
  final_confirmed_note: '',
};

function parseStructuredNote(value: string): Array<[string, string]> {
  try {
    const parsed = JSON.parse(value) as Record<string, string>;
    return Object.entries(parsed);
  } catch {
    return [];
  }
}

export default function NewConsultation() {
  const { id } = useParams();
  const router = useRouter();
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const baseTranscriptRef = useRef('');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const [speechSupported] = useState(() => {
    if (typeof window === 'undefined') {
      return false;
    }
    const speechWindow = window as Window & {
      SpeechRecognition?: SpeechRecognitionConstructor;
      webkitSpeechRecognition?: SpeechRecognitionConstructor;
    };
    return Boolean(speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition);
  });
  const [audioSupported] = useState(() => {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') {
      return false;
    }
    return typeof MediaRecorder !== 'undefined' && Boolean(navigator.mediaDevices?.getUserMedia);
  });

  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isAudioRecording, setIsAudioRecording] = useState(false);
  const [recordedAudio, setRecordedAudio] = useState<Blob | null>(null);
  const [speechError, setSpeechError] = useState('');
  const [patient, setPatient] = useState<Patient | null>(null);
  const [processingMode, setProcessingMode] = useState('');
  const [formData, setFormData] = useState<FormState>(INITIAL_FORM);

  useEffect(() => {
    const fetchPatient = async () => {
      try {
        const data = await patientAPI.getById(Number(id));
        setPatient(data);
      } catch (err) {
        console.error(err);
      }
    };

    const speechWindow = window as Window & {
      SpeechRecognition?: SpeechRecognitionConstructor;
      webkitSpeechRecognition?: SpeechRecognitionConstructor;
    };
    const SpeechRecognitionCtor =
      speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;

    if (SpeechRecognitionCtor) {
      const recognition = new SpeechRecognitionCtor();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      recognition.onresult = (event) => {
        let transcriptText = '';
        for (let index = 0; index < event.results.length; index += 1) {
          transcriptText += `${event.results[index][0].transcript} `;
        }
        const mergedTranscript = [baseTranscriptRef.current, transcriptText.trim()]
          .filter(Boolean)
          .join(' ')
          .trim();
        setFormData((current) => ({
          ...current,
          raw_transcript: mergedTranscript,
        }));
      };
      recognition.onerror = (event) => {
        setSpeechError(event.error ? `Dictation error: ${event.error}` : 'Dictation failed.');
        setIsRecording(false);
      };
      recognition.onend = () => {
        setIsRecording(false);
      };
      recognitionRef.current = recognition;
    }

    fetchPatient();

    return () => {
      recognitionRef.current?.stop();
      mediaRecorderRef.current?.stream.getTracks().forEach((track) => track.stop());
    };
  }, [id]);

  const structuredSections = useMemo(
    () => parseStructuredNote(formData.structured_note_json),
    [formData.structured_note_json],
  );

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => {
    setFormData({ ...formData, [event.target.name]: event.target.value });
  };

  const handleStartDictation = () => {
    if (!recognitionRef.current) {
      setSpeechError('Browser speech recognition is not available on this device.');
      return;
    }
    setSpeechError('');
    baseTranscriptRef.current = formData.raw_transcript.trim();
    try {
      recognitionRef.current.start();
      setIsRecording(true);
    } catch {
      setSpeechError('Dictation could not be started. Try again.');
    }
  };

  const handleStopDictation = () => {
    recognitionRef.current?.stop();
    setIsRecording(false);
  };

  const handleStartAudioRecording = async () => {
    if (!audioSupported) {
      setSpeechError('Audio recording is not available on this device.');
      return;
    }
    setSpeechError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      recordedChunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };
      recorder.onstop = () => {
        const audioBlob = new Blob(recordedChunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        setRecordedAudio(audioBlob);
        setIsAudioRecording(false);
        stream.getTracks().forEach((track) => track.stop());
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setRecordedAudio(null);
      setIsAudioRecording(true);
    } catch {
      setSpeechError('Audio recording could not be started.');
    }
  };

  const handleStopAudioRecording = () => {
    mediaRecorderRef.current?.stop();
  };

  const handleTranscribeRecording = async () => {
    if (!recordedAudio) {
      alert('Please record audio before requesting transcription.');
      return;
    }
    setProcessing(true);
    try {
      const result = await consultationAPI.transcribeAudio(recordedAudio);
      setProcessingMode(result.processing_mode);
      setFormData((current) => ({
        ...current,
        raw_transcript: [current.raw_transcript, result.transcript].filter(Boolean).join(' ').trim(),
      }));
    } catch (err) {
      console.error(err);
      alert('Audio transcription failed. This requires a configured OPENAI_API_KEY path.');
    } finally {
      setProcessing(false);
    }
  };

  const handleGenerateDraft = async () => {
    if (!formData.raw_transcript.trim()) {
      alert('Please dictate or type a transcript before generating a draft.');
      return;
    }

    setProcessing(true);
    try {
      const result = await consultationAPI.processNote({
        raw_transcript: formData.raw_transcript,
        visit_type: formData.visit_type,
        chief_complaint: formData.chief_complaint,
        diagnosis_impression: formData.diagnosis_impression,
      });
      setProcessingMode(result.processing_mode);
      setFormData((current) => ({
        ...current,
        raw_transcript: result.cleaned_transcript,
        ai_cleaned_draft: result.ai_cleaned_draft,
        structured_note_json: result.structured_note_json,
        final_confirmed_note: current.final_confirmed_note || result.final_draft_note,
        chief_complaint: current.chief_complaint || result.extracted_chief_complaint || '',
        diagnosis_impression:
          current.diagnosis_impression || result.extracted_diagnosis_impression || '',
      }));
    } catch (err) {
      console.error(err);
      alert('Failed to generate a structured draft.');
    } finally {
      setProcessing(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!formData.final_confirmed_note.trim()) {
      alert('Please review and confirm the final note before saving.');
      return;
    }

    setLoading(true);
    try {
      const ageAtVisit = patient ? calculateAge(patient.date_of_birth) : 0;

      const consult = await consultationAPI.create({
        patient_id: Number(id),
        visit_type: formData.visit_type,
        age_at_visit: ageAtVisit,
        chief_complaint: formData.chief_complaint,
        diagnosis_impression: formData.diagnosis_impression,
        status: 'draft',
      });

      await consultationAPI.createNote(consult.consultation_id, {
        consultation_id: consult.consultation_id,
        patient_id: Number(id),
        raw_transcript: formData.raw_transcript,
        ai_cleaned_draft: formData.ai_cleaned_draft,
        structured_note_json: formData.structured_note_json,
        final_confirmed_note: formData.final_confirmed_note,
        note_type:
          formData.visit_type === 'initial' ? 'initial_history' : 'follow_up_progress',
        status: 'confirmed',
      });

      router.push(`/dashboard/patients/${id}`);
    } catch (err) {
      console.error(err);
      alert('Failed to save consultation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-4 mb-6">
        <Link
          href={`/dashboard/patients/${id}`}
          className="p-2 bg-white rounded-full border border-gray-200 hover:bg-gray-50 text-gray-500 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">New Clinical Note</h1>
          <p className="text-sm text-gray-500">Speak → Review → Confirm → Save</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <form onSubmit={handleSubmit} className="p-8 space-y-8">
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-gray-900 border-b pb-2">
              Consultation Details
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Visit Type</label>
                <select
                  name="visit_type"
                  value={formData.visit_type}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  <option value="initial">Initial History</option>
                  <option value="follow_up">Follow-up Progress</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Diagnosis / Clinical Impression
                </label>
                <input
                  type="text"
                  name="diagnosis_impression"
                  value={formData.diagnosis_impression}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="e.g. Major Depressive Disorder"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Presenting Complaint / Since Last Visit
                </label>
                <input
                  type="text"
                  name="chief_complaint"
                  value={formData.chief_complaint}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="Brief summary"
                />
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="flex flex-wrap justify-between items-center gap-3 border-b pb-2">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Dictation Capture</h2>
                <p className="text-sm text-gray-500">
                  Use live dictation when supported, or record audio for backend transcription.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                {speechSupported ? (
                  isRecording ? (
                    <button
                      type="button"
                      onClick={handleStopDictation}
                      className="flex items-center gap-2 text-sm bg-rose-600 text-white px-3 py-1.5 rounded-lg hover:bg-rose-700 transition-colors font-medium"
                    >
                      <Square className="w-4 h-4" />
                      Stop Dictation
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleStartDictation}
                      className="flex items-center gap-2 text-sm bg-rose-50 text-rose-600 px-3 py-1.5 rounded-lg hover:bg-rose-100 transition-colors font-medium"
                    >
                      <Mic className="w-4 h-4" />
                      Start Dictation
                    </button>
                  )
                ) : (
                  <span className="text-sm text-amber-700 bg-amber-50 px-3 py-1.5 rounded-lg">
                    Speech recognition unavailable
                  </span>
                )}
                {audioSupported ? (
                  isAudioRecording ? (
                    <button
                      type="button"
                      onClick={handleStopAudioRecording}
                      className="flex items-center gap-2 text-sm bg-slate-700 text-white px-3 py-1.5 rounded-lg hover:bg-slate-800 transition-colors font-medium"
                    >
                      <Square className="w-4 h-4" />
                      Stop Audio Recording
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleStartAudioRecording}
                      className="flex items-center gap-2 text-sm bg-slate-50 text-slate-700 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors font-medium"
                    >
                      <Mic className="w-4 h-4" />
                      Record Audio
                    </button>
                  )
                ) : (
                  <span className="text-sm text-amber-700 bg-amber-50 px-3 py-1.5 rounded-lg">
                    Audio recording unavailable
                  </span>
                )}
              </div>
            </div>

            {speechError && (
              <div className="p-3 bg-red-50 text-red-700 rounded-md text-sm">{speechError}</div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Raw Transcript</label>
              <textarea
                name="raw_transcript"
                value={formData.raw_transcript}
                onChange={handleChange}
                rows={6}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-gray-700"
                placeholder="Speech text will appear here, or you can type manually."
              />
            </div>

            <div className="flex flex-wrap justify-end gap-3">
              {recordedAudio && (
                <button
                  type="button"
                  onClick={handleTranscribeRecording}
                  disabled={processing}
                  className="flex items-center gap-2 text-sm bg-slate-50 text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-100 transition-colors font-medium disabled:opacity-50"
                >
                  <Mic className="w-4 h-4" />
                  {processing ? 'Transcribing Audio...' : 'Transcribe Recording'}
                </button>
              )}
              <button
                type="button"
                onClick={handleGenerateDraft}
                disabled={processing}
                className="flex items-center gap-2 text-sm bg-indigo-50 text-indigo-700 px-4 py-2 rounded-lg hover:bg-indigo-100 transition-colors font-medium disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4" />
                {processing ? 'Generating Draft...' : 'Generate Structured Draft'}
              </button>
            </div>
          </div>

          <div className="space-y-6">
            <div className="flex justify-between items-center border-b pb-2">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Review And Confirm</h2>
                <p className="text-sm text-gray-500">
                  Review the structured draft, edit the final note, then confirm.
                </p>
              </div>
              {processingMode && (
                <span className="text-xs uppercase tracking-wide px-2 py-1 rounded-full bg-gray-100 text-gray-600">
                  {processingMode}
                </span>
              )}
            </div>

            {formData.ai_cleaned_draft && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Structured Draft
                </label>
                <textarea
                  name="ai_cleaned_draft"
                  value={formData.ai_cleaned_draft}
                  onChange={handleChange}
                  rows={10}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-gray-700"
                />
              </div>
            )}

            {structuredSections.length > 0 && (
              <div className="rounded-xl border border-gray-200 bg-gray-50/70 p-4 space-y-4">
                <p className="text-sm font-medium text-gray-700">Structured Sections Preview</p>
                {structuredSections.map(([heading, content]) => (
                  <div key={heading}>
                    <p className="text-sm font-semibold text-gray-900">{heading}</p>
                    <p className="text-sm text-gray-600 whitespace-pre-wrap">
                      {content || '[Doctor to review]'}
                    </p>
                  </div>
                ))}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Final Confirmed Note
              </label>
              <textarea
                name="final_confirmed_note"
                value={formData.final_confirmed_note}
                onChange={handleChange}
                rows={12}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="Doctor confirmed structured note..."
              />
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {loading ? 'Saving...' : 'Confirm & Save Note'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
