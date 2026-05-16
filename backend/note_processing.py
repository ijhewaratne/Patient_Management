import json
import os
import re
import uuid
import urllib.error
import urllib.request
from typing import Optional


INITIAL_SECTIONS = [
    "Presenting complaint",
    "History of presenting illness",
    "Past psychiatric history",
    "Past medical history",
    "Medication history",
    "Family history",
    "Personal history",
    "Social history",
    "Substance-use history",
    "Mental state examination",
    "Risk assessment summary",
    "Diagnosis / clinical impression",
    "Management plan",
]

FOLLOW_UP_SECTIONS = [
    "Since last visit",
    "Current symptoms",
    "Improvement / worsening",
    "Medication adherence",
    "Side effects",
    "Sleep",
    "Appetite",
    "Mood",
    "Functioning",
    "Risk update",
    "Medication changes",
    "Plan",
    "Next review",
]

SECTION_RULES = {
    "Sleep": ["sleep", "insomnia", "nightmare", "woke", "awakening"],
    "Appetite": ["appetite", "eating", "food", "weight"],
    "Mood": ["mood", "sad", "depressed", "anxious", "anxiety", "irritable", "happy"],
    "Side effects": ["side effect", "nausea", "dizzy", "tremor", "sedation", "dry mouth"],
    "Medication adherence": ["adherence", "compliance", "missed", "taking", "stopped medicine", "regularly"],
    "Risk assessment summary": ["suicid", "self harm", "risk", "violent", "aggress", "harm"],
    "Risk update": ["suicid", "self harm", "risk", "violent", "aggress", "harm"],
    "Family history": ["family", "father", "mother", "sibling", "uncle", "aunt"],
    "Substance-use history": ["alcohol", "smok", "cannabis", "substance", "drug use"],
    "Past psychiatric history": ["past psych", "previous episode", "admission", "psychiatric history"],
    "Past medical history": ["diabetes", "hypertension", "medical history", "asthma", "thyroid"],
    "Mental state examination": ["appearance", "speech", "thought", "hallucination", "delusion", "orientation"],
    "Medication changes": ["increase", "reduce", "change dose", "start", "stop", "continue"],
    "Plan": ["plan", "advise", "follow up", "review", "counsel", "therapy"],
    "Management plan": ["plan", "advise", "follow up", "review", "counsel", "therapy"],
    "Next review": ["next review", "follow up", "come back", "review in"],
}


def normalize_transcript(raw_transcript: str) -> str:
    compact = " ".join(raw_transcript.split())
    compact = re.sub(r"\s+([,.;:!?])", r"\1", compact)
    if not compact:
        return ""
    if compact[-1] not in ".!?":
        compact += "."
    return compact[0].upper() + compact[1:]


def sentence_split(text: str) -> list[str]:
    chunks = [piece.strip() for piece in re.split(r"(?<=[.!?])\s+", text) if piece.strip()]
    return chunks or ([text.strip()] if text.strip() else [])


def choose_sections(visit_type: str) -> list[str]:
    return INITIAL_SECTIONS if visit_type == "initial" else FOLLOW_UP_SECTIONS


def route_sentence(sentence: str, visit_type: str) -> str:
    lowered = sentence.lower()
    for section, keywords in SECTION_RULES.items():
        for keyword in keywords:
            if keyword in lowered:
                return section
    return "History of presenting illness" if visit_type == "initial" else "Since last visit"


def build_structured_sections(
    transcript: str,
    visit_type: str,
    chief_complaint: Optional[str] = None,
    diagnosis_impression: Optional[str] = None,
):
    sections = {section: [] for section in choose_sections(visit_type)}
    for sentence in sentence_split(transcript):
        section = route_sentence(sentence, visit_type)
        if section in sections:
            sections[section].append(sentence)

    if chief_complaint:
        label = "Presenting complaint" if visit_type == "initial" else "Since last visit"
        sections[label] = [chief_complaint]
    if diagnosis_impression:
        label = "Diagnosis / clinical impression" if visit_type == "initial" else "Plan"
        if label in sections:
            sections[label].append(diagnosis_impression)

    return {key: " ".join(value).strip() for key, value in sections.items()}


def render_structured_note(structured_sections: dict[str, str]) -> str:
    rendered = []
    for heading, content in structured_sections.items():
        rendered.append(f"{heading}\n{content or '[Doctor to review]'}")
    return "\n\n".join(rendered).strip()


def heuristic_process_note(
    raw_transcript: str,
    visit_type: str,
    chief_complaint: Optional[str] = None,
    diagnosis_impression: Optional[str] = None,
):
    cleaned = normalize_transcript(raw_transcript)
    structured = build_structured_sections(
        cleaned,
        visit_type,
        chief_complaint=chief_complaint,
        diagnosis_impression=diagnosis_impression,
    )
    first_sentence = sentence_split(cleaned)[0] if cleaned else None
    extracted_chief = chief_complaint or first_sentence
    extracted_dx = diagnosis_impression
    if not extracted_dx:
        diagnosis_label = "Diagnosis / clinical impression" if visit_type == "initial" else "Plan"
        extracted_dx = structured.get(diagnosis_label) or None

    draft = render_structured_note(structured)
    return {
        "cleaned_transcript": cleaned,
        "ai_cleaned_draft": draft,
        "final_draft_note": draft,
        "structured_note_json": json.dumps(structured),
        "extracted_chief_complaint": extracted_chief,
        "extracted_diagnosis_impression": extracted_dx,
        "processing_mode": "heuristic",
    }


def call_openai_structuring(
    raw_transcript: str,
    visit_type: str,
    chief_complaint: Optional[str] = None,
    diagnosis_impression: Optional[str] = None,
):
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        return None

    model = os.getenv("OPENAI_STRUCTURING_MODEL", "gpt-4o-mini")
    section_list = choose_sections(visit_type)
    prompt = (
        "You are formatting a psychiatrist's dictated note. "
        "Do not invent facts. Only reorganize and lightly clean grammar. "
        "Return strict JSON with keys: cleaned_transcript, ai_cleaned_draft, final_draft_note, "
        "structured_note_json, extracted_chief_complaint, extracted_diagnosis_impression. "
        "The structured_note_json value must itself be a JSON string mapping these headings: "
        + ", ".join(section_list)
        + ". Use empty strings for missing sections."
    )
    input_payload = (
        f"Visit type: {visit_type}\n"
        f"Chief complaint: {chief_complaint or ''}\n"
        f"Diagnosis impression: {diagnosis_impression or ''}\n"
        f"Transcript:\n{raw_transcript}"
    )
    payload = json.dumps(
        {
            "model": model,
            "input": [
                {
                    "role": "system",
                    "content": [{"type": "input_text", "text": prompt}],
                },
                {
                    "role": "user",
                    "content": [{"type": "input_text", "text": input_payload}],
                },
            ],
        }
    ).encode("utf-8")
    request = urllib.request.Request(
        "https://api.openai.com/v1/responses",
        data=payload,
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            body = json.loads(response.read().decode("utf-8"))
    except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError, json.JSONDecodeError):
        return None

    try:
        output_text = body["output"][0]["content"][0]["text"]
        parsed = json.loads(output_text)
        parsed["processing_mode"] = "openai"
        return parsed
    except (KeyError, IndexError, TypeError, json.JSONDecodeError):
        return None


def process_note(
    raw_transcript: str,
    visit_type: str,
    chief_complaint: Optional[str] = None,
    diagnosis_impression: Optional[str] = None,
):
    ai_result = call_openai_structuring(
        raw_transcript,
        visit_type,
        chief_complaint=chief_complaint,
        diagnosis_impression=diagnosis_impression,
    )
    if ai_result:
        return ai_result
    return heuristic_process_note(
        raw_transcript,
        visit_type,
        chief_complaint=chief_complaint,
        diagnosis_impression=diagnosis_impression,
    )


def transcribe_audio_with_openai(audio_bytes: bytes, filename: str, content_type: str) -> Optional[str]:
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        return None

    model = os.getenv("OPENAI_TRANSCRIPTION_MODEL", "gpt-4o-mini-transcribe")
    boundary = f"----CodexBoundary{uuid.uuid4().hex}"

    def part(name: str, value: str) -> bytes:
        return (
            f"--{boundary}\r\n"
            f'Content-Disposition: form-data; name="{name}"\r\n\r\n'
            f"{value}\r\n"
        ).encode("utf-8")

    file_header = (
        f"--{boundary}\r\n"
        f'Content-Disposition: form-data; name="file"; filename="{filename}"\r\n'
        f"Content-Type: {content_type or 'application/octet-stream'}\r\n\r\n"
    ).encode("utf-8")

    body = b"".join(
        [
            part("model", model),
            file_header,
            audio_bytes,
            b"\r\n",
            f"--{boundary}--\r\n".encode("utf-8"),
        ]
    )

    request = urllib.request.Request(
        "https://api.openai.com/v1/audio/transcriptions",
        data=body,
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": f"multipart/form-data; boundary={boundary}",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(request, timeout=60) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError, json.JSONDecodeError):
        return None

    text = payload.get("text")
    return text.strip() if isinstance(text, str) else None
