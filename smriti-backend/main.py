import os
import json
import tempfile
from typing import List, Optional

from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, Depends, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from groq import Groq

from auth import hash_password, verify_password, create_token, decode_token, create_user, get_user_by_email
from database import get_db_connection
from rag_engine import build_chunks_from_files, format_context_with_citations, get_embedding_model, store_chunks, search_chunks, get_all_chunks
from quiz_engine import generate_questions, grade_answer, generate_mcq_questions, grade_mcq_answer

app = FastAPI(title="Smriti API", docs_url=None)

@app.on_event("startup")
def preload_embedding_model():
    get_embedding_model()

from fastapi.openapi.docs import get_swagger_ui_html
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

security = HTTPBearer()

FAVICON_DATA_URI = (
    "data:image/svg+xml,"
    "%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 48'%3E"
    "%3Ccircle cx='32' cy='16' r='3' fill='%232BBE8C'/%3E"
    "%3Ccircle cx='32' cy='28' r='3' fill='%232BBE8C'/%3E"
    "%3Ccircle cx='14' cy='10' r='2.5' fill='%232BBE8C'/%3E"
    "%3Ccircle cx='50' cy='10' r='2.5' fill='%232BBE8C'/%3E"
    "%3C/svg%3E"
)

@app.get("/docs", include_in_schema=False)
async def custom_docs():
    return get_swagger_ui_html(openapi_url=app.openapi_url, title="Smriti API", swagger_favicon_url=FAVICON_DATA_URI)

ALLOWED_ORIGINS = os.environ.get("ALLOWED_ORIGINS", "http://localhost:3000").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

GROQ_API_KEY = os.environ.get("GROQ_API_KEY")
client = Groq(api_key=GROQ_API_KEY) if GROQ_API_KEY else None
LLM_MODEL = "llama-3.3-70b-versatile"


def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = decode_token(credentials.credentials)
        return {"user_id": payload["user_id"], "email": payload["email"]}
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")


class RegisterRequest(BaseModel):
    email: str
    password: str

class LoginRequest(BaseModel):
    email: str
    password: str

class WorkspaceCreateRequest(BaseModel):
    name: str

class ChatRequest(BaseModel):
    question: str
    workspace_id: int

class QuizGenerateRequest(BaseModel):
    workspace_id: int
    num_questions: int
    mode: str

class QuizGradeRequest(BaseModel):
    workspace_id: int
    session_id: int
    question_index: int
    answer: Optional[str] = None
    selected_index: Optional[int] = None


@app.post("/register")
def register(req: RegisterRequest):
    with get_db_connection() as conn:
        existing = get_user_by_email(conn, req.email)
        if existing:
            raise HTTPException(status_code=400, detail="Email already registered")
        user = create_user(conn, req.email, req.password)
    return {"message": "Account created", "user_id": user["id"]}


@app.post("/login")
def login(req: LoginRequest):
    with get_db_connection() as conn:
        user = get_user_by_email(conn, req.email)
    if not user or not verify_password(req.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    token = create_token(user["id"], user["email"])
    return {"access_token": token, "token_type": "bearer"}


@app.post("/workspaces")
def create_workspace(req: WorkspaceCreateRequest, user=Depends(get_current_user)):
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO workspaces (name, owner_id) VALUES (%s, %s) RETURNING id, name, created_at",
                (req.name, user["user_id"])
            )
            row = cur.fetchone()
            cur.execute(
                "INSERT INTO workspace_members (workspace_id, user_id, role) VALUES (%s, %s, 'owner')",
                (row[0], user["user_id"])
            )
    return {"id": row[0], "name": row[1], "created_at": row[2]}


@app.get("/workspaces")
def list_workspaces(user=Depends(get_current_user)):
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT w.id, w.name, w.created_at FROM workspaces w
                JOIN workspace_members wm ON wm.workspace_id = w.id
                WHERE wm.user_id = %s
                """,
                (user["user_id"],)
            )
            rows = cur.fetchall()
    return {"workspaces": [{"id": r[0], "name": r[1], "created_at": r[2]} for r in rows]}


@app.post("/documents/upload")
def upload_documents(workspace_id: int, files: List[UploadFile] = File(...), user=Depends(get_current_user)):
    results = []
    for f in files:
        tmp_path = os.path.join(tempfile.gettempdir(), f.filename)
        with open(tmp_path, "wb") as out:
            out.write(f.file.read())

        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "INSERT INTO documents (workspace_id, uploaded_by, filename) VALUES (%s, %s, %s) RETURNING id",
                    (workspace_id, user["user_id"], f.filename)
                )
                document_id = cur.fetchone()[0]

        chunks = build_chunks_from_files([(tmp_path, f.filename)])
        store_chunks(chunks, document_id, workspace_id)
        results.append({"filename": f.filename, "document_id": document_id, "chunks": len(chunks)})

    return {"uploaded": results}


@app.get("/documents")
def list_documents(workspace_id: int, user=Depends(get_current_user)):
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT id, filename, uploaded_at FROM documents WHERE workspace_id = %s",
                (workspace_id,)
            )
            rows = cur.fetchall()
    return {"documents": [{"id": r[0], "filename": r[1], "uploaded_at": r[2]} for r in rows]}


@app.delete("/documents/clear")
def clear_documents(workspace_id: int, user=Depends(get_current_user)):
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT 1 FROM workspace_members WHERE workspace_id = %s AND user_id = %s",
                (workspace_id, user["user_id"])
            )
            if not cur.fetchone():
                raise HTTPException(status_code=403, detail="Access denied")
            cur.execute(
                "DELETE FROM document_chunks WHERE workspace_id = %s",
                (workspace_id,)
            )
            cur.execute(
                "DELETE FROM documents WHERE workspace_id = %s",
                (workspace_id,)
            )
    return {"message": "All documents cleared"}


@app.delete("/documents/{document_id}")
def delete_document(document_id: int, user=Depends(get_current_user)):
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT d.id FROM documents d
                JOIN workspace_members wm ON wm.workspace_id = d.workspace_id
                WHERE d.id = %s AND wm.user_id = %s
                """,
                (document_id, user["user_id"])
            )
            if not cur.fetchone():
                raise HTTPException(status_code=404, detail="Document not found")
            cur.execute("DELETE FROM document_chunks WHERE document_id = %s", (document_id,))
            cur.execute("DELETE FROM documents WHERE id = %s", (document_id,))
    return {"message": "Document deleted"}


@app.delete("/chat/history")
def clear_chat_history(workspace_id: int, user=Depends(get_current_user)):
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT 1 FROM workspace_members WHERE workspace_id = %s AND user_id = %s",
                (workspace_id, user["user_id"])
            )
            if not cur.fetchone():
                raise HTTPException(status_code=403, detail="Access denied")
            cur.execute(
                "DELETE FROM chat_messages WHERE workspace_id = %s",
                (workspace_id,)
            )
    return {"message": "Chat history cleared"}


@app.post("/chat")
def chat(req: ChatRequest, user=Depends(get_current_user)):
    results = search_chunks(req.question, req.workspace_id)
    if not results:
        raise HTTPException(status_code=400, detail="No documents found in this workspace")

    context, citations = format_context_with_citations(results)

    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT role, content FROM chat_messages WHERE workspace_id = %s ORDER BY created_at DESC LIMIT 6",
                (req.workspace_id,)
            )
            rows = cur.fetchall()
    history = [{"role": r[0], "content": r[1]} for r in reversed(rows)]
    history_text = "\n".join(f"{m['role']}: {m['content']}" for m in history)

    system_prompt = (
        "You are a helpful assistant that answers questions using ONLY the "
        "provided document excerpts. If the answer isn't in the excerpts, "
        "say you don't know. When you use information from a source, mention "
        "which source number it came from, like (Source 2)."
    )
    user_prompt = f"Conversation so far:\n{history_text}\n\nDocument excerpts:\n{context}\n\nQuestion: {req.question}"

    response = client.chat.completions.create(
        model=LLM_MODEL,
        messages=[{"role": "system", "content": system_prompt}, {"role": "user", "content": user_prompt}],
        temperature=0.2,
    )
    answer = response.choices[0].message.content

    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO chat_messages (workspace_id, role, content) VALUES (%s, %s, %s)",
                (req.workspace_id, "user", req.question)
            )
            cur.execute(
                "INSERT INTO chat_messages (workspace_id, role, content) VALUES (%s, %s, %s)",
                (req.workspace_id, "assistant", answer)
            )

    return {"answer": answer, "citations": citations}


@app.get("/chat/history")
def chat_history(workspace_id: int, user=Depends(get_current_user)):
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT role, content, created_at FROM chat_messages WHERE workspace_id = %s ORDER BY created_at",
                (workspace_id,)
            )
            rows = cur.fetchall()
    return {"messages": [{"role": r[0], "content": r[1], "created_at": r[2]} for r in rows]}


@app.post("/quiz/generate")
def quiz_generate(req: QuizGenerateRequest, user=Depends(get_current_user)):
    results = search_chunks("", req.workspace_id, k=50)
    if not results:
        raise HTTPException(status_code=400, detail="No documents found in this workspace")

    chunks = [c for c, _ in results]

    if req.mode == "mcq":
        questions = generate_mcq_questions(client, LLM_MODEL, chunks, req.num_questions)
    else:
        questions = generate_questions(client, LLM_MODEL, chunks, req.num_questions)

    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO quiz_sessions (workspace_id, mode, questions) VALUES (%s, %s, %s) RETURNING id",
                (req.workspace_id, req.mode, json.dumps(questions))
            )
            session_id = cur.fetchone()[0]

    safe_questions = [{k: v for k, v in q.items() if k != "correct_index"} for q in questions]
    return {"session_id": session_id, "questions": safe_questions}


@app.post("/quiz/grade")
def quiz_grade(req: QuizGradeRequest, user=Depends(get_current_user)):
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT questions FROM quiz_sessions WHERE id = %s AND workspace_id = %s",
                (req.session_id, req.workspace_id)
            )
            row = cur.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Quiz session not found")

    questions = row[0]
    question = questions[req.question_index]

    if req.selected_index is not None:
        return grade_mcq_answer(question, req.selected_index)
    if req.answer:
        return grade_answer(client, LLM_MODEL, question["question"], question["source_text"], req.answer)
    raise HTTPException(status_code=400, detail="Provide either answer or selected_index")


@app.get("/health")
def health():
    return {"status": "ok"}


class FlashcardGenerateRequest(BaseModel):
    workspace_id: int

@app.post("/flashcards/generate")
def generate_flashcards(req: FlashcardGenerateRequest, user=Depends(get_current_user)):
    chunks_objs = get_all_chunks(req.workspace_id)
    if not chunks_objs:
        raise HTTPException(status_code=400, detail="No documents found in this workspace")

    chunks = [c.text for c in chunks_objs]
    combined_text = "\n\n".join(chunks[:20])

    prompt = f"""You are a study assistant. Based on the following text, generate 10 flashcards.
Each flashcard should have a concise question on the front and a clear answer on the back.
Respond ONLY with a JSON array, no markdown, no preamble. Format:
[{{"front": "question here", "back": "answer here"}}, ...]

Text:
{combined_text}"""

    response = client.chat.completions.create(
        model=LLM_MODEL,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.3,
    )

    raw = response.choices[0].message.content.strip()
    raw = raw.replace("```json", "").replace("```", "").strip()

    try:
        flashcards = json.loads(raw)
    except Exception:
        raise HTTPException(status_code=500, detail="Failed to parse flashcards from LLM response")

    with get_db_connection() as conn:
        with conn.cursor() as cur:
            for card in flashcards:
                cur.execute(
                    "INSERT INTO flashcards (workspace_id, front, back) VALUES (%s, %s, %s)",
                    (req.workspace_id, card["front"], card["back"])
                )

    return {"flashcards": flashcards}


@app.get("/flashcards")
def get_flashcards(workspace_id: int, user=Depends(get_current_user)):
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT id, front, back FROM flashcards WHERE workspace_id = %s ORDER BY id",
                (workspace_id,)
            )
            rows = cur.fetchall()
    return {"flashcards": [{"id": r[0], "front": r[1], "back": r[2]} for r in rows]}


class SummaryGenerateRequest(BaseModel):
    workspace_id: int

@app.post("/summaries/generate")
def generate_summary(req: SummaryGenerateRequest, user=Depends(get_current_user)):
    chunks_objs = get_all_chunks(req.workspace_id)
    if not chunks_objs:
        raise HTTPException(status_code=400, detail="No documents found in this workspace")

    chunks = [c.text for c in chunks_objs]
    combined_text = "\n\n".join(chunks[:30])

    prompt = f"""You are a study assistant. Summarize the following document content into clear, concise bullet points grouped by topic. Make it easy to review before an exam.

Text:
{combined_text}

Respond with a clean, well-structured summary. Use headings and bullet points."""

    response = client.chat.completions.create(
        model=LLM_MODEL,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.3,
    )

    summary_text = response.choices[0].message.content.strip()

    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO summaries (workspace_id, content) VALUES (%s, %s) RETURNING id",
                (req.workspace_id, summary_text)
            )

    return {"summary": summary_text}


@app.get("/summaries")
def get_summaries(workspace_id: int, user=Depends(get_current_user)):
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT id, content, created_at FROM summaries WHERE workspace_id = %s ORDER BY created_at DESC LIMIT 1",
                (workspace_id,)
            )
            row = cur.fetchone()
    if not row:
        return {"summary": None}
    return {"summary": {"id": row[0], "content": row[1], "created_at": row[2]}}


@app.post("/transcribe")
async def transcribe(file: UploadFile = File(...), user=Depends(get_current_user)):
    audio_bytes = await file.read()
    transcription = client.audio.transcriptions.create(
        file=(file.filename or "audio.webm", audio_bytes),
        model="whisper-large-v3",
    )
    return {"text": transcription.text}