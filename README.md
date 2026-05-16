# Patient Management

Patient management system with a FastAPI backend and a Next.js frontend.

## Prerequisites

- Python 3.9+
- Node.js 20+
- npm

## Backend setup

From the repository root:

```bash
python3 -m venv backend/venv
source backend/venv/bin/activate
pip install --upgrade pip
pip install -r backend/requirements.txt
cp backend/.env.example backend/.env
```

Set `SECRET_KEY` in `backend/.env` to a strong random value:

```bash
openssl rand -hex 32
```

Run the API:

```bash
cd backend
uvicorn main:app --reload
```

The API defaults to `http://127.0.0.1:8000`.
The backend reads local settings from `backend/.env` on startup.

## Frontend setup

In a separate terminal:

```bash
cd frontend
npm install
npm run dev
```

The frontend defaults to `http://localhost:3000`.

## Seed medications

After creating a user and logging in, seed the medication master list with an authenticated request:

```bash
curl -X POST http://127.0.0.1:8000/medications/seed \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

## Security checklist

- Never commit `backend/.env`.
- Set a unique `SECRET_KEY` for every environment.
- Keep `FRONTEND_URL` restricted to the real frontend origin.
- Only set `OPENAI_API_KEY` where note processing and audio transcription are required.
- Rotate secrets if they were previously committed or shared.
