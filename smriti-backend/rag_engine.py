import numpy as np
from fastembed import TextEmbedding
from pypdf import PdfReader
from docx import Document
from database import get_db_connection

EMBED_MODEL_NAME = "BAAI/bge-small-en-v1.5"  # 384-dim

_shared_embedding_model = None


def get_embedding_model():
    global _shared_embedding_model
    if _shared_embedding_model is None:
        _shared_embedding_model = TextEmbedding(model_name=EMBED_MODEL_NAME)
    return _shared_embedding_model


CHUNK_SIZE = 1400
CHUNK_OVERLAP = 200


class Chunk:
    def __init__(self, text, source, page):
        self.text = text
        self.source = source
        self.page = page


def extract_pages(path, filename):
    ext = filename.lower().split(".")[-1]

    if ext == "pdf":
        reader = PdfReader(path)
        pages = []
        for i, page in enumerate(reader.pages):
            text = page.extract_text() or ""
            if text.strip():
                pages.append((i + 1, text))
        return pages

    elif ext == "docx":
        doc = Document(path)
        full_text = "\n".join(p.text for p in doc.paragraphs if p.text.strip())
        return [(1, full_text)] if full_text else []

    elif ext == "txt":
        with open(path, "r", encoding="utf-8") as f:
            text = f.read()
        return [(1, text)] if text.strip() else []

    return []


def chunk_text(text, chunk_size=CHUNK_SIZE, overlap=CHUNK_OVERLAP):
    if len(text) <= chunk_size:
        return [text]
    chunks = []
    start = 0
    while start < len(text):
        end = start + chunk_size
        chunks.append(text[start:end])
        start = end - overlap
    return chunks


def build_chunks_from_files(file_paths_and_names):
    all_chunks = []
    for path, filename in file_paths_and_names:
        pages = extract_pages(path, filename)
        for page_num, page_text in pages:
            for piece in chunk_text(page_text):
                all_chunks.append(Chunk(piece, filename, page_num))
    return all_chunks


def _embed(texts):
    model = get_embedding_model()
    vectors = np.array(list(model.embed(texts)), dtype="float32")
    norms = np.linalg.norm(vectors, axis=1, keepdims=True)
    norms[norms == 0] = 1
    return vectors / norms


def store_chunks(chunks, document_id, workspace_id):
    """Embed chunks and insert into document_chunks table."""
    texts = [c.text for c in chunks]
    embeddings = _embed(texts)

    with get_db_connection() as conn:
        with conn.cursor() as cur:
            for i, (chunk, vector) in enumerate(zip(chunks, embeddings)):
                cur.execute(
                    """
                    INSERT INTO document_chunks
                        (workspace_id, document_id, chunk_index, chunk_text, page, embedding)
                    VALUES (%s, %s, %s, %s, %s, %s)
                    """,
                    (workspace_id, document_id, i, chunk.text, chunk.page, vector.tolist())
                )


def search_chunks(query, workspace_id, k=4):
    """Find k most similar chunks in this workspace using pgvector cosine similarity."""
    query_vec = _embed([query])[0].tolist()

    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT dc.chunk_text, dc.page, d.filename,
                       1 - (dc.embedding <=> %s::vector) AS score
                FROM document_chunks dc
                JOIN documents d ON d.id = dc.document_id
                WHERE dc.workspace_id = %s
                ORDER BY dc.embedding <=> %s::vector
                LIMIT %s
                """,
                (query_vec, workspace_id, query_vec, k)
            )
            rows = cur.fetchall()

    results = []
    for chunk_text, page, filename, score in rows:
        c = Chunk(chunk_text, filename, page)
        results.append((c, float(score)))
    return results


def format_context_with_citations(results):
    context_parts = []
    citations = []
    for i, (chunk, score) in enumerate(results):
        tag = f"[Source {i+1}: {chunk.source}, page {chunk.page}]"
        context_parts.append(f"{tag}\n{chunk.text}")
        citations.append({"source": chunk.source, "page": chunk.page, "score": round(score, 3)})
    return "\n\n".join(context_parts), citations


def get_all_chunks(workspace_id):
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT dc.chunk_text, dc.page, d.filename
                FROM document_chunks dc
                JOIN documents d ON d.id = dc.document_id
                WHERE dc.workspace_id = %s
                ORDER BY dc.document_id, dc.chunk_index
                """,
                (workspace_id,)
            )
            rows = cur.fetchall()
    return [Chunk(row[0], row[2], row[1]) for row in rows]