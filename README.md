# Smriti — RAG Powered Knowledge Recall Engine

A full-stack AI study assistant that lets you upload PDFs and interact with them through chat, quizzes, flashcards, and summaries — all powered by semantic search and LLMs.

**Live Demo:** https://smriti-recall.vercel.app

---

## Features

- **Chat with PDF** — Ask questions about your documents and get cited answers with page references
- **MCQ Quiz** — Auto-generated multiple choice questions from your documents with instant grading
- **Open-ended Quiz** — AI-graded written answers with voice input via Whisper
- **Flashcards** — Auto-generated 3D flip cards with generate, regenerate, and delete support
- **Summary** — Markdown-rendered document summary with headings and bullet points
- **Quiz History** — Past sessions saved with scores, retake any session
- **Voice Input** — Microphone support in chat and open-ended quiz via Groq Whisper
- **Multi-workspace** — Separate workspaces per topic, each with isolated documents and chat history
- **Multi-user** — Full authentication with Google OAuth and JWT httpOnly cookies

---

## Tech Stack

**Frontend**
- React + TanStack Start
- Tailwind CSS
- Sonner (toasts)
- Deployed on Vercel

**Backend**
- FastAPI
- Groq API — LLaMA 3.3-70B (chat, quiz, flashcards, summary) + Whisper (transcription)
- fastembed — BAAI/bge-small-en-v1.5 (384-dim embeddings)
- SlowAPI — rate limiting
- Deployed on Railway

**Database**
- Neon PostgreSQL (AWS Asia Pacific Singapore)
- pgvector extension for semantic search

---

## Database Schema

| Table | Purpose |
|-------|---------|
| users | Auth credentials |
| workspaces | User workspaces |
| workspace_members | Workspace access control |
| documents | Uploaded PDF metadata |
| document_chunks | Chunked text with pgvector embeddings |
| chat_messages | Chat history with citations |
| quiz_sessions | Quiz questions + scores |
| flashcards | Generated flashcards |
| summaries | Generated summaries |

---

## API Endpoints

**Auth**
- `POST /register` — Create account
- `POST /login` — Returns JWT token

**Workspaces**
- `POST /workspaces` — Create workspace
- `GET /workspaces` — List user workspaces

**Documents**
- `POST /documents/upload?workspace_id=` — Upload PDFs
- `GET /documents?workspace_id=` — List documents
- `DELETE /documents/{id}` — Delete document
- `DELETE /documents/clear?workspace_id=` — Clear all documents

**Chat**
- `POST /chat` — RAG chat with citations
- `GET /chat/history?workspace_id=` — Load chat history
- `DELETE /chat/history?workspace_id=` — Clear chat history

**Quiz**
- `POST /quiz/generate` — Generate MCQ or open-ended quiz
- `POST /quiz/grade` — Grade answer
- `POST /quiz/sessions/{id}/score` — Save final score
- `GET /quiz/sessions?workspace_id=` — List past sessions (last 10)
- `GET /quiz/sessions/{id}` — Load session for retake

**Flashcards**
- `POST /flashcards/generate` — Generate 10 flashcards
- `GET /flashcards?workspace_id=` — Get flashcards
- `DELETE /flashcards/{id}` — Delete flashcard

**Summaries**
- `POST /summaries/generate` — Generate summary
- `GET /summaries?workspace_id=` — Get latest summary

**Other**
- `POST /transcribe` — Audio to text via Whisper
- `GET /health` — Health check

---

## Project Structure

```
Smriti/
├── smriti-backend/
│   ├── main.py          # All API endpoints
│   ├── auth.py          # bcrypt + JWT auth
│   ├── database.py      # Fresh connection per request (Neon compatible)
│   ├── rag_engine.py    # pgvector RAG pipeline
│   ├── quiz_engine.py   # MCQ + open-ended quiz logic
│   ├── requirements.txt
│   └── Dockerfile
└── smriti-frontend/
    └── src/
        └── routes/
            └── index.tsx  # Entire frontend (single file)
```

---

## Environment Variables

**Backend (Railway)**
```
DATABASE_URL=neon_connection_string
JWT_SECRET=64_char_hex
GROQ_API_KEY=groq_api_key
FASTEMBED_CACHE_PATH=/app/.cache/fastembed
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:8080,https://smriti-recall.vercel.app
```

---

## Local Development

**Backend**
```bash
cd smriti-backend
pip install -r requirements.txt
uvicorn main:app --reload
# Runs at http://localhost:8000
```

**Frontend**
```bash
cd smriti-frontend
npm install
npm run dev
# Runs at http://localhost:8080
```

---

## Known Notes

- Railway free tier sleeps after inactivity — first cold start takes 30-40 seconds
- JWT stored in httpOnly cookies
- Quiz sessions capped at last 10 per workspace to limit DB growth
- `DELETE /documents/clear` must be defined before `DELETE /documents/{id}` in main.py due to FastAPI route ordering
- `get_all_chunks()` is used for quiz/flashcard/summary generation — not `search_chunks("")`
- Flashcard and summary generate endpoints delete old records before inserting new ones
