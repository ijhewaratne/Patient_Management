'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, AudioLines, Mic, Sparkles, Square } from 'lucide-react';
import { consultationAPI, patientAPI, Patient } from '@/lib/api';
import { saveDraft } from '@/lib/consultation';

type BrowserSpeechRecognitionEvent = {
  results: ArrayLike<{
    isFinal: boolean;
    0: { transcript: string };
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

export default function ConsultationCapturePage() {
  const params = useParams<{ id: string }>();
  const patientId = Number(params.id);
  const router = useRouter();

  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const baseTranscriptRef = useRef('');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  const [patient, setPatient] = useState<Patient | null>(null);
  const [visitType, setVisitType] = useState('initial');
  const [chiefComplaint, setChiefComplaint] = useState('');
  const [diagnosisImpression, setDiagnosisImpression] = useState('');
  const [rawTranscript, setRawTranscript] = useState('');
  const [processingMode, setProcessingMode] = useState('');
  const [speechError, setSpeechError] = useState('');
  const [processing, setProcessing] = useState(false);
  const [isSpeechRecording, setIsSpeechRecording] = useState(false);
  const [isAudioRecording, setIsAudioRecording] = useState(false);
  const [recordedAudio, setRecordedAudio] = useState<Blob | null>(null);

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

  useEffect(() => {
    const fetchPatient = async () => {
      try {
        const data = await patientAPI.getById(patientId);
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
        setRawTranscript(
          [baseTranscriptRef.current, transcriptText.trim()].filter(Boolean).join(' ').trim(),
        );
      };
      recognition.onerror = (event) => {
        setSpeechError(event.error ? `Dictation error: ${event.error}` : 'Dictation failed.');
        setIsSpeechRecording(false);
      };
      recognition.onend = () => {
        setIsSpeechRecording(false);
      };
      recognitionRef.current = recognition;
    }

    fetchPatient();

    return () => {
      recognitionRef.current?.stop();
      mediaRecorderRef.current?.stream.getTracks().forEach((track) => track.stop());
    };
  }, [patientId]);

  const startSpeechRecognition = () => {
    if (!recognitionRef.current) {
      setSpeechError('Browser speech recognition is not available on this device.');
      return;
    }
    baseTranscriptRef.current = rawTranscript.trim();
    setSpeechError('');
    try {
      recognitionRef.current.start();
      setIsSpeechRecording(true);
    } catch {
      setSpeechError('Dictation could not be started. Try again.');
    }
  };

  const stopSpeechRecognition = () => {
    recognitionRef.current?.stop();
    setIsSpeechRecording(false);
  };

  const startAudioRecording = async () => {
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
        const audioBlob = new Blob(recordedChunksRef.current, {
          type: recorder.mimeType || 'audio/webm',
        });
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

  const stopAudioRecording = () => {
    mediaRecorderRef.current?.stop();
  };

  const transcribeRecording = async () => {
    if (!recordedAudio) {
      return;
    }
    setProcessing(true);
    try {
      const result = await consultationAPI.transcribeAudio(recordedAudio);
      setProcessingMode(result.processing_mode);
      setRawTranscript((current) => [current, result.transcript].filter(Boolean).join(' ').trim());
    } catch (err) {
      console.error(err);
      setSpeechError(
        'Audio transcription failed. Configure LOCAL_WHISPER_URL or OPENAI_API_KEY to enable backend transcription.',
      );
    } finally {
      setProcessing(false);
    }
  };

  const sendToReview = async () => {
    if (!rawTranscript.trim()) {
      alert('Please capture a transcript before sending to review.');
      return;
    }

    setProcessing(true);
    try {
      const structuredResult = await consultationAPI.processNote({
        raw_transcript: rawTranscript,
        visit_type: visitType,
        chief_complaint: chiefComplaint,
        diagnosis_impression: diagnosisImpression,
      });
      saveDraft({
        patientId,
        visitType,
        chiefComplaint: chiefComplaint || structuredResult.extracted_chief_complaint || '',
        diagnosisImpression:
          diagnosisImpression || structuredResult.extracted_diagnosis_impression || '',
        rawTranscript: structuredResult.cleaned_transcript,
        structuredResult,
      });
      router.push(`/dashboard/patients/${patientId}/consultation/review`);
    } catch (err) {
      console.error(err);
      alert('Failed to send the transcript for AI review.');
    } finally {
      setProcessing(false);
    }
  };

  const captureMode = speechSupported
    ? 'Browser speech recognition'
    : audioSupported
      ? 'Recorded audio upload'
      : 'Unavailable';

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href={`/dashboard/patients/${patientId}`}
          className="rounded-full border border-gray-200 bg-white p-2 text-gray-500 transition-colors hover:bg-gray-50"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Consultation Capture</h1>
          <p className="text-sm text-gray-500">
            Dictate first, then send the draft to AI review before confirmation.
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{patient?.full_name || 'Loading patient...'}</h2>
            <p className="text-sm text-gray-500">Capture mode: {captureMode}</p>
          </div>
          {processingMode && (
            <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700">
              Last processing: {processingMode}
            </span>
          )}
        </div>

        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Visit Type</label>
            <select
              value={visitType}
              onChange={(event) => setVisitType(event.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="initial">Initial History</option>
              <option value="follow_up">Follow-up Progress</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Chief Complaint</label>
            <input
              value={chiefComplaint}
              onChange={(event) => setChiefComplaint(event.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Optional"
            />
          </div>
          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-medium text-gray-700">Diagnosis / Impression</label>
            <input
              value={diagnosisImpression}
              onChange={(event) => setDiagnosisImpression(event.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Optional"
            />
          </div>
        </div>

        <div className="mt-8 space-y-4">
          <div className="flex flex-wrap gap-3">
            {speechSupported && (
              <button
                type="button"
                onClick={isSpeechRecording ? stopSpeechRecognition : startSpeechRecognition}
                className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium ${
                  isSpeechRecording
                    ? 'bg-rose-600 text-white hover:bg-rose-700'
                    : 'bg-indigo-600 text-white hover:bg-indigo-700'
                }`}
              >
                {isSpeechRecording ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                {isSpeechRecording ? 'Stop Live Dictation' : 'Start Live Dictation'}
              </button>
            )}

            {!speechSupported && audioSupported && (
              <>
                <button
                  type="button"
                  onClick={isAudioRecording ? stopAudioRecording : startAudioRecording}
                  className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium ${
                    isAudioRecording
                      ? 'bg-rose-600 text-white hover:bg-rose-700'
                      : 'bg-indigo-600 text-white hover:bg-indigo-700'
                  }`}
                >
                  {isAudioRecording ? <Square className="h-4 w-4" /> : <AudioLines className="h-4 w-4" />}
                  {isAudioRecording ? 'Stop Recording' : 'Record Audio'}
                </button>
                <button
                  type="button"
                  onClick={transcribeRecording}
                  disabled={!recordedAudio || processing}
                  className="inline-flex items-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Sparkles className="h-4 w-4" />
                  Transcribe Recording
                </button>
              </>
            )}
          </div>

          {!speechSupported && !audioSupported && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              This browser does not support either live speech recognition or audio recording.
            </div>
          )}

          {speechError && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {speechError}
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Captured Transcript</label>
            <textarea
              value={rawTranscript}
              onChange={(event) => setRawTranscript(event.target.value)}
              rows={14}
              className="w-full rounded-xl border border-gray-300 px-4 py-3 font-medium text-gray-800 outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Your dictated transcript will appear here..."
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={sendToReview}
            disabled={processing}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            <Sparkles className="h-4 w-4" />
            {processing ? 'Processing...' : 'Send to AI Review'}
          </button>
        </div>
      </div>
    </div>
  );
}
