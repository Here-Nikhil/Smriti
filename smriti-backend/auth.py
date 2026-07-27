import os
import bcrypt
import jwt
from datetime import datetime, timedelta, timezone
from database import get_db_connection

SECRET = os.environ.get("JWT_SECRET", "dev-secret")
ALGORITHM = "HS256"
TOKEN_EXPIRE_DAYS = 7

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())

def create_token(user_id: int, email: str) -> str:
    payload = {
        "user_id": user_id,
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(days=TOKEN_EXPIRE_DAYS),
    }
    return jwt.encode(payload, SECRET, algorithm=ALGORITHM)

def decode_token(token: str) -> dict:
    return jwt.decode(token, SECRET, algorithms=[ALGORITHM])

def create_user(conn, email: str, password: str) -> dict:
    with conn.cursor() as cur:
        cur.execute(
            "INSERT INTO users (email, password_hash) VALUES (%s, %s) RETURNING id, email",
            (email, hash_password(password))
        )
        row = cur.fetchone()
    return {"id": row[0], "email": row[1]}

def create_oauth_user(conn, email: str) -> dict:
    """Create a user without a password (Google OAuth user)."""
    with conn.cursor() as cur:
        cur.execute(
            "INSERT INTO users (email, password_hash) VALUES (%s, %s) ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email RETURNING id, email",
            (email, "")
        )
        row = cur.fetchone()
    return {"id": row[0], "email": row[1]}

def get_user_by_email(conn, email: str):
    with conn.cursor() as cur:
        cur.execute("SELECT id, email, password_hash FROM users WHERE email = %s", (email,))
        row = cur.fetchone()
    if not row:
        return None
    return {"id": row[0], "email": row[1], "password_hash": row[2]}