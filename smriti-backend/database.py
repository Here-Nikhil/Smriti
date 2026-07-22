import os
from contextlib import contextmanager
import psycopg2
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL is not set. Check your .env file.")


def get_new_connection():
    return psycopg2.connect(DATABASE_URL, connect_timeout=10)


@contextmanager
def get_db_connection():
    conn = get_new_connection()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def close_all_connections():
    pass