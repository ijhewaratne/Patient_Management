from fastapi import APIRouter, Depends, File, HTTPException, UploadFile

import auth
import models
import note_processing
import schemas

router = APIRouter(prefix="/note-tools", tags=["note-tools"])


@router.post("/structure", response_model=schemas.NoteProcessingResponse)
def structure_clinical_note(
    payload: schemas.NoteProcessingRequest,
    current_user: models.User = Depends(auth.get_current_user),
):
    if not payload.raw_transcript.strip():
        raise HTTPException(status_code=400, detail="Transcript is required")

    result = note_processing.process_note(
        raw_transcript=payload.raw_transcript,
        visit_type=payload.visit_type,
        chief_complaint=payload.chief_complaint,
        diagnosis_impression=payload.diagnosis_impression,
    )
    return schemas.NoteProcessingResponse(**result)


@router.post("/transcribe", response_model=schemas.AudioTranscriptionResponse)
async def transcribe_audio_note(
    audio: UploadFile = File(...),
    current_user: models.User = Depends(auth.get_current_user),
):
    audio_bytes = await audio.read()
    if not audio_bytes:
        raise HTTPException(status_code=400, detail="Audio file is required")

    transcript, processing_mode = note_processing.transcribe_audio(
        audio_bytes=audio_bytes,
        filename=audio.filename or "dictation.webm",
        content_type=audio.content_type or "audio/webm",
    )
    if not transcript:
        raise HTTPException(
            status_code=400,
            detail="Audio transcription requires either LOCAL_WHISPER_URL or a working OPENAI_API_KEY-backed transcription setup",
        )

    return schemas.AudioTranscriptionResponse(
        transcript=transcript,
        processing_mode=processing_mode or "unknown",
    )
