import os
import json
import tempfile
from typing import List, Optional

from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, Depends, UploadFile, File, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
from groq import Groq
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
import httpx

from auth import hash_password, verify_password, create_token, decode_token, create_user, get_user_by_email, create_oauth_user
from database import get_db_connection
from rag_engine import build_chunks_from_files, format_context_with_citations, get_embedding_model, store_chunks, search_chunks, get_all_chunks
from quiz_engine import generate_questions, grade_answer, generate_mcq_questions, grade_mcq_answer

limiter = Limiter(key_func=get_remote_address)
app = FastAPI(title="Smriti API", docs_url=None)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

@app.on_event("startup")
def preload_embedding_model():
    get_embedding_model()

from fastapi.openapi.docs import get_swagger_ui_html
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

security = HTTPBearer(auto_error=False)

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
FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:3000")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

GROQ_API_KEY = os.environ.get("GROQ_API_KEY")
client = Groq(api_key=GROQ_API_KEY) if GROQ_API_KEY else None
LLM_MODEL = "llama-3.3-70b-versatile"

GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.environ.get("GOOGLE_CLIENT_SECRET")
GOOGLE_REDIRECT_URI = "https://smriti-production.up.railway.app/auth/google/callback"

COOKIE_NAME = "smriti_token"
COOKIE_MAX_AGE = 60 * 60 * 24 * 7  # 7 days


def get_current_user(request: Request, credentials: HTTPAuthorizationCredentials = Depends(security)):
    # Try cookie first, then Authorization header (for backwards compat)
    token = request.cookies.get(COOKIE_NAME)
    if not token and credentials:
        token = credentials.credentials
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = decode_token(token)
        return {"user_id": payload["user_id"], "email": payload["email"]}
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")


def set_auth_cookie(response: Response, token: str):
    response.set_cookie(
        key=COOKIE_NAME,
        value=token,
        httponly=True,
        secure=True,
        samesite="none",
        max_age=COOKIE_MAX_AGE,
        path="/",
    )


class RegisterRequest(BaseModel):
    email: str
    password: str

class LoginRequest(BaseModel):
    email: str
    password: str

class WorkspaceCreateRequest(BaseModel):
    name: str

class WorkspaceRenameRequest(BaseModel):
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

class QuizScoreRequest(BaseModel):
    score: float

class FlashcardGenerateRequest(BaseModel):
    workspace_id: int

class SummaryGenerateRequest(BaseModel):
    workspace_id: int


@app.post("/register")
def register(req: RegisterRequest, response: Response):
    with get_db_connection() as conn:
        existing = get_user_by_email(conn, req.email)
        if existing:
            raise HTTPException(status_code=400, detail="Email already registered")
        user = create_user(conn, req.email, req.password)
    token = create_token(user["id"], user["email"])
    set_auth_cookie(response, token)
    return {"message": "Account created", "user_id": user["id"], "email": user["email"]}


@app.post("/login")
def login(req: LoginRequest, response: Response):
    with get_db_connection() as conn:
        user = get_user_by_email(conn, req.email)
    if not user or not verify_password(req.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    token = create_token(user["id"], user["email"])
    set_auth_cookie(response, token)
    return {"access_token": token, "token_type": "bearer", "email": user["email"]}


@app.post("/logout")
def logout(response: Response):
    response.delete_cookie(key=COOKIE_NAME, path="/", samesite="none", secure=True)
    return {"message": "Logged out"}


# ── Google OAuth ──────────────────────────────────────────────

@app.get("/auth/google")
def google_login():
    params = (
        f"client_id={GOOGLE_CLIENT_ID}"
        f"&redirect_uri={GOOGLE_REDIRECT_URI}"
        f"&response_type=code"
        f"&scope=openid%20email%20profile"
        f"&access_type=offline"
    )
    return RedirectResponse(f"https://accounts.google.com/o/oauth2/v2/auth?{params}")


@app.get("/auth/google/callback")
async def google_callback(code: str, response: Response):
    # Exchange code for tokens
    async with httpx.AsyncClient() as hc:
        token_res = await hc.post(
            "https://oauth2.googleapis.com/token",
            data={
                "code": code,
                "client_id": GOOGLE_CLIENT_ID,
                "client_secret": GOOGLE_CLIENT_SECRET,
                "redirect_uri": GOOGLE_REDIRECT_URI,
                "grant_type": "authorization_code",
            },
        )
    token_data = token_res.json()
    if "error" in token_data:
        raise HTTPException(status_code=400, detail=token_data.get("error_description", "OAuth error"))

    # Get user info from Google
    async with httpx.AsyncClient() as hc:
        user_res = await hc.get(
            "https://www.googleapis.com/oauth2/v3/userinfo",
            headers={"Authorization": f"Bearer {token_data['access_token']}"},
        )
    google_user = user_res.json()
    email = google_user.get("email")
    if not email:
        raise HTTPException(status_code=400, detail="Could not get email from Google")

    # Get or create user + auto-create default workspace
    with get_db_connection() as conn:
        user = create_oauth_user(conn, email)
        # Create default workspace if user has none
        with conn.cursor() as cur:
            cur.execute(
                "SELECT COUNT(*) FROM workspace_members WHERE user_id = %s",
                (user["id"],)
            )
            count = cur.fetchone()[0]
            if count == 0:
                cur.execute(
                    "INSERT INTO workspaces (name, owner_id) VALUES (%s, %s) RETURNING id",
                    ("My Workspace", user["id"])
                )
                ws_id = cur.fetchone()[0]
                cur.execute(
                    "INSERT INTO workspace_members (workspace_id, user_id, role) VALUES (%s, %s, 'owner')",
                    (ws_id, user["id"])
                )

    token = create_token(user["id"], email)

    # Redirect to frontend with cookie set
    redirect = RedirectResponse(url=f"{FRONTEND_URL}/oauth-success?email={email}")
    redirect.set_cookie(
        key=COOKIE_NAME,
        value=token,
        httponly=True,
        secure=True,
        samesite="none",
        max_age=COOKIE_MAX_AGE,
        path="/",
    )
    return redirect


# ─────────────────────────────────────────────────────────────

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


@app.patch("/workspaces/{workspace_id}")
def rename_workspace(workspace_id: int, req: WorkspaceRenameRequest, user=Depends(get_current_user)):
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT 1 FROM workspace_members WHERE workspace_id = %s AND user_id = %s",
                (workspace_id, user["user_id"])
            )
            if not cur.fetchone():
                raise HTTPException(status_code=403, detail="Access denied")
            cur.execute(
                "UPDATE workspaces SET name = %s WHERE id = %s RETURNING id, name, created_at",
                (req.name.strip(), workspace_id)
            )
            row = cur.fetchone()
    return {"id": row[0], "name": row[1], "created_at": row[2]}


@app.delete("/workspaces/{workspace_id}")
def delete_workspace(workspace_id: int, user=Depends(get_current_user)):
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT 1 FROM workspace_members WHERE workspace_id = %s AND user_id = %s AND role = 'owner'",
                (workspace_id, user["user_id"])
            )
            if not cur.fetchone():
                raise HTTPException(status_code=403, detail="Only the owner can delete a workspace")
            cur.execute("DELETE FROM flashcards WHERE workspace_id = %s", (workspace_id,))
            cur.execute("DELETE FROM summaries WHERE workspace_id = %s", (workspace_id,))
            cur.execute("DELETE FROM quiz_sessions WHERE workspace_id = %s", (workspace_id,))
            cur.execute("DELETE FROM chat_messages WHERE workspace_id = %s", (workspace_id,))
            cur.execute("DELETE FROM document_chunks WHERE workspace_id = %s", (workspace_id,))
            cur.execute("DELETE FROM documents WHERE workspace_id = %s", (workspace_id,))
            cur.execute("DELETE FROM workspace_members WHERE workspace_id = %s", (workspace_id,))
            cur.execute("DELETE FROM workspaces WHERE id = %s", (workspace_id,))
    return {"message": "Workspace deleted"}


@app.post("/documents/upload")
def upload_documents(workspace_id: int, files: List[UploadFile] = File(...), user=Depends(get_current_user)):
    results = []
    for f in files:
        tmp_path = os.path.join(tempfile.gettempdir(), f.filename)
        with open(tmp_path, "wb") as out:
            out.write(f.file.read())
        chunks = build_chunks_from_files([(tmp_path, f.filename)])
        if not chunks:
            raise HTTPException(status_code=400, detail=f"No text could be extracted from '{f.filename}'.")
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "INSERT INTO documents (workspace_id, uploaded_by, filename) VALUES (%s, %s, %s) RETURNING id",
                    (workspace_id, user["user_id"], f.filename)
                )
                document_id = cur.fetchone()[0]
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
            cur.execute("DELETE FROM document_chunks WHERE workspace_id = %s", (workspace_id,))
            cur.execute("DELETE FROM documents WHERE workspace_id = %s", (workspace_id,))
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
            cur.execute("DELETE FROM chat_messages WHERE workspace_id = %s", (workspace_id,))
    return {"message": "Chat history cleared"}


@app.post("/chat")
def chat(req: ChatRequest, user=Depends(get_current_user)):
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT role, content FROM chat_messages WHERE workspace_id = %s ORDER BY created_at DESC LIMIT 6",
                (req.workspace_id,)
            )
            rows = cur.fetchall()
    history = [{"role": r[0], "content": r[1]} for r in reversed(rows)]
    history_text = "\n".join(f"{m['role']}: {m['content']}" for m in history)

    rewritten = req.question
    if history:
        rewrite_prompt = f"""Given this conversation history:
{history_text}

Rewrite this user question into a self-contained search query with no pronouns or references:
"{req.question}"

Reply with ONLY the rewritten query, nothing else."""
        try:
            rw = client.chat.completions.create(
                model=LLM_MODEL,
                messages=[{"role": "user", "content": rewrite_prompt}],
                temperature=0.0,
                max_tokens=80,
            )
            rewritten = rw.choices[0].message.content.strip().strip('"')
        except Exception:
            pass

    results = search_chunks(rewritten, req.workspace_id)
    if not results:
        results = search_chunks(req.question, req.workspace_id)
    if not results:
        results = get_all_chunks(req.workspace_id)
    if not results:
        raise HTTPException(status_code=400, detail="No documents found in this workspace")

    context, citations = format_context_with_citations(results)
    system_prompt = (
        "You are a helpful assistant that answers questions using ONLY the "
        "provided document excerpts. If the answer isn't in the excerpts, "
        "say you don't know. When you use information from a source, mention "
        "which source number it came from, like (Source 2)."
    )
    user_prompt = f"Document excerpts:\n{context}\n\nQuestion: {req.question}"
    if history_text:
        user_prompt = f"Conversation so far:\n{history_text}\n\n" + user_prompt

    response = client.chat.completions.create(
        model=LLM_MODEL,
        messages=[{"role": "system", "content": system_prompt}, {"role": "user", "content": user_prompt}],
        temperature=0.2,
    )
    answer = response.choices[0].message.content

    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO chat_messages (workspace_id, role, content, citations) VALUES (%s, %s, %s, %s)",
                (req.workspace_id, "user", req.question, json.dumps([]))
            )
            cur.execute(
                "INSERT INTO chat_messages (workspace_id, role, content, citations) VALUES (%s, %s, %s, %s)",
                (req.workspace_id, "assistant", answer, json.dumps(citations))
            )
    return {"answer": answer, "citations": citations}


@app.get("/chat/history")
def chat_history(workspace_id: int, user=Depends(get_current_user)):
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT role, content, created_at, citations FROM chat_messages WHERE workspace_id = %s ORDER BY created_at",
                (workspace_id,)
            )
            rows = cur.fetchall()
    return {"messages": [{"role": r[0], "content": r[1], "created_at": r[2], "citations": r[3] or []} for r in rows]}


@app.post("/quiz/generate")
@limiter.limit("10/minute")
def quiz_generate(request: Request, req: QuizGenerateRequest, user=Depends(get_current_user)):
    chunks_objs = get_all_chunks(req.workspace_id)
    if not chunks_objs:
        raise HTTPException(status_code=400, detail="No documents found in this workspace")
    if req.mode == "mcq":
        questions = generate_mcq_questions(client, LLM_MODEL, chunks_objs, req.num_questions)
    else:
        questions = generate_questions(client, LLM_MODEL, chunks_objs, req.num_questions)
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO quiz_sessions (workspace_id, mode, questions) VALUES (%s, %s, %s) RETURNING id",
                (req.workspace_id, req.mode, json.dumps(questions))
            )
            session_id = cur.fetchone()[0]
    safe_questions = [{k: v for k, v in q.items() if k != "correct_index"} for q in questions]
    return {"session_id": session_id, "mode": req.mode, "questions": safe_questions}


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
        source_text = question.get("source_text", question.get("question", ""))
        return grade_answer(client, LLM_MODEL, question["question"], source_text, req.answer)
    raise HTTPException(status_code=400, detail="Provide either answer or selected_index")


@app.post("/quiz/sessions/{session_id}/score")
def save_quiz_score(session_id: int, req: QuizScoreRequest, user=Depends(get_current_user)):
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("UPDATE quiz_sessions SET score = %s WHERE id = %s", (req.score, session_id))
    return {"message": "Score saved"}


@app.get("/quiz/sessions")
def list_quiz_sessions(workspace_id: int, user=Depends(get_current_user)):
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, mode, created_at,
                       jsonb_array_length(questions::jsonb) as question_count,
                       score
                FROM quiz_sessions
                WHERE workspace_id = %s
                ORDER BY created_at DESC
                LIMIT 10
                """,
                (workspace_id,)
            )
            rows = cur.fetchall()
    return {"sessions": [{"id": r[0], "mode": r[1], "created_at": r[2], "question_count": r[3], "score": r[4]} for r in rows]}


@app.get("/quiz/sessions/{session_id}")
def get_quiz_session(session_id: int, user=Depends(get_current_user)):
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT id, mode, questions, created_at FROM quiz_sessions WHERE id = %s",
                (session_id,)
            )
            row = cur.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Session not found")
    safe_questions = [{k: v for k, v in q.items() if k != "correct_index"} for q in row[2]]
    return {"id": row[0], "mode": row[1], "questions": safe_questions, "created_at": row[3]}


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/flashcards/generate")
@limiter.limit("15/minute")
def generate_flashcards(request: Request, req: FlashcardGenerateRequest, user=Depends(get_current_user)):
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
            cur.execute("DELETE FROM flashcards WHERE workspace_id = %s", (req.workspace_id,))
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


@app.delete("/flashcards/{flashcard_id}")
def delete_flashcard(flashcard_id: int, user=Depends(get_current_user)):
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT f.id FROM flashcards f
                JOIN workspace_members wm ON wm.workspace_id = f.workspace_id
                WHERE f.id = %s AND wm.user_id = %s
                """,
                (flashcard_id, user["user_id"])
            )
            if not cur.fetchone():
                raise HTTPException(status_code=404, detail="Flashcard not found")
            cur.execute("DELETE FROM flashcards WHERE id = %s", (flashcard_id,))
    return {"message": "Flashcard deleted"}


@app.post("/summaries/generate")
@limiter.limit("15/minute")
def generate_summary(request: Request, req: SummaryGenerateRequest, user=Depends(get_current_user)):
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
            cur.execute("DELETE FROM summaries WHERE workspace_id = %s", (req.workspace_id,))
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
        return {"content": None}
    return {"content": row[1]}


@app.post("/transcribe")
async def transcribe(file: UploadFile = File(...), user=Depends(get_current_user)):
    audio_bytes = await file.read()
    transcription = client.audio.transcriptions.create(
        file=(file.filename or "audio.webm", audio_bytes),
        model="whisper-large-v3",
    )
    return {"text": transcription.text}