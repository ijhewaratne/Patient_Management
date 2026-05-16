# Patient Management Implementation Plan

## Product Rule

The system is optimized for a single psychiatrist using a local-first workflow:

`Speak -> Review -> Confirm -> Prescribe -> Print`

No clinical note or prescription becomes an official record until the doctor confirms it.

## Repo Direction

- Frontend: Next.js app router UI in `frontend/`
- Backend: FastAPI + SQLAlchemy in `backend/`
- Local database: SQLite
- Backup target: encrypted archive uploaded to Google Drive

## Immediate Gaps To Close

1. Authenticated doctor context must drive consultation and prescription ownership.
2. Draft, confirmed, and printed states must be enforced by the backend.
3. Patient search must support the fields described in the goal.
4. Clinical note storage must support raw transcript, AI draft, structured note draft, and confirmed note.
5. Prescription printing must use confirmed prescription data only.
6. The project needs a reproducible backend dependency manifest.

## Phase 1 Build In This Repo

### Backend

- Add `get_current_user` auth dependency and protect app routes.
- Set `doctor_id` from the authenticated user, not from the client.
- Enforce prescription creation as `draft` or `confirmed` only.
- Add a dedicated print transition endpoint to move `confirmed -> printed`.
- Add `structured_note_json` support for note structuring.
- Seed medications through the API for an initial psychiatry starter list.

### Frontend

- Keep login as the entry point.
- Calculate age from patient DOB when creating consultations and prescriptions.
- Create prescriptions as confirmed records first, then mark them printed explicitly.
- Keep the consultation page as the review/confirm screen until a separate dictation/review split screen exists.

## Next Backend Changes

- Add `patient_summary` versioning or draft/confirmed status.
- Add auto-lock/session timeout support.
- Add audit log writes for patient, consultation, note, prescription, and print actions.
- Add encrypted backup creation and restore endpoints.

## Next Frontend Changes

- Replace the mock dictation button with actual speech capture.
- Replace PDF-only prescription output with an HTML print view and browser print flow.

## Phase 2 Status

- Visit timeline: implemented on the patient profile.
- Consultation history detail: implemented.
- Clinical snapshot: implemented as a doctor-confirmed patient summary with a refresh-from-latest suggestion path.
- Clinical snapshot history/versioning: implemented and visible from the patient profile.
- Medication history: implemented through prescription history on the patient profile.
- Repeat / modify prescription: implemented by loading the latest or a recent prescription into the editable prescribing form.

## Remaining Phase 2 Gaps

- Prescription modification is implemented by loading a previous prescription into a new editable prescription, not by mutating a historical prescription in place.
- Current medication summary is suggestion-based and should eventually be derived from a stricter medication-state model if medication reconciliation becomes more important.

## Phase 3 Status

- Speech-to-text capture: implemented in the consultation screen using browser speech recognition when available.
- Audio recording fallback: implemented in the consultation screen using `MediaRecorder`, with backend upload transcription support when `OPENAI_API_KEY` is configured.
- AI grammar correction and note structuring: implemented through `/note-tools/structure`.
- Safe fallback behavior: if no `OPENAI_API_KEY` is configured, note processing falls back to deterministic local structuring logic without inventing data.
- Doctor review screen: implemented within the consultation flow with raw transcript, structured draft, section preview, and final confirmed note.
- Confirm-before-save workflow: implemented. The consultation note is reviewed and confirmed before it becomes the saved clinical note.

## Remaining Phase 3 Gaps

- Browser speech recognition availability still depends on device and browser support.
- The optional OpenAI path is implemented for note structuring and server-side audio upload transcription, but it currently uses lightweight direct HTTP calls rather than an SDK integration.
- The current Phase 3 flow uses a single consultation page with capture and review sections rather than separate capture/review routes.

## Speech To Text Recommendation

- MVP default for privacy-first local use: local Whisper model.
- Fastest cloud MVP alternative: OpenAI transcription API.
- Do not rely on browser-native speech recognition as the primary clinical path.

## Backup Recommendation

1. Export SQLite database.
2. Compress it.
3. Encrypt the archive locally.
4. Upload only the encrypted archive to Google Drive.
5. Record the backup in `backup_logs`.

## Validation Targets

- Unauthenticated requests fail for protected routes.
- Consultation and prescription records store the current doctor automatically.
- Prescription printing fails unless the prescription is already confirmed.
- Patient search matches name, phone, DOB text, patient ID, and address.
- Consultation and prescription age snapshots are derived from DOB at creation time.
