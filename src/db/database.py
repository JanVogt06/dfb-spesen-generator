"""
Database Modul - SQLite Datenbank fuer User und Sessions
"""
import os
import sqlite3
from pathlib import Path
from datetime import datetime, UTC
from typing import Dict, List, Optional


# Datenbankpfad
def get_db_path() -> Path:
    """Gibt Datenbank-Pfad zurueck (aus .env oder Standard)"""
    PROJECT_ROOT = Path(__file__).parent.parent.parent
    db_path = os.getenv("DATABASE_PATH", PROJECT_ROOT / "app.db")
    path = Path(db_path)

    # Erstelle Verzeichnis falls nicht existiert
    path.parent.mkdir(exist_ok=True, parents=True)

    return path


DB_PATH = get_db_path()


def get_connection() -> sqlite3.Connection:
    """Erstellt DB-Verbindung mit Row Factory"""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_database():
    """Initialisiert Datenbank-Tabellen"""
    conn = get_connection()
    cursor = conn.cursor()

    # Tabelle: users
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            dfb_username_encrypted TEXT,
            dfb_password_encrypted TEXT,
            created_at TEXT NOT NULL
        )
    """)

    # Tabelle: sessions
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id TEXT UNIQUE NOT NULL,
            user_id INTEGER NOT NULL,
            status TEXT NOT NULL,
            created_at TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
    """)

    conn.commit()
    conn.close()

    print(f"Datenbank initialisiert: {DB_PATH}")


# ===== USER FUNKTIONEN =====

def create_user(email: str, password_hash: str) -> int:
    """
    Erstellt neuen User.

    Args:
        email: User Email
        password_hash: Gehashtes Passwort

    Returns:
        User ID
    """
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        INSERT INTO users (email, password_hash, created_at)
        VALUES (?, ?, ?)
    """, (email, password_hash, datetime.now(UTC).isoformat()))

    user_id = cursor.lastrowid
    conn.commit()
    conn.close()

    return user_id


def get_user_by_email(email: str) -> Optional[Dict]:
    """
    Findet User anhand Email.

    Returns:
        User Dict oder None
    """
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM users WHERE email = ?", (email,))
    user = cursor.fetchone()

    conn.close()

    if user:
        return dict(user)
    return None


def get_user_by_id(user_id: int) -> Optional[Dict]:
    """Findet User anhand ID"""
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))
    user = cursor.fetchone()

    conn.close()

    if user:
        return dict(user)
    return None


def get_all_users() -> List[Dict]:
    """
    Gibt alle User aus der Datenbank zurück.

    Returns:
        Liste von User-Dicts
    """
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT id, email, created_at FROM users")
    users = [dict(row) for row in cursor.fetchall()]

    conn.close()

    return users


def update_dfb_credentials(user_id: int, dfb_username_encrypted: str, dfb_password_encrypted: str):
    """
    Speichert verschluesselte DFB-Credentials fuer User.

    Args:
        user_id: User ID
        dfb_username_encrypted: Verschluesselter DFB Username
        dfb_password_encrypted: Verschluesseltes DFB Passwort
    """
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        UPDATE users 
        SET dfb_username_encrypted = ?, dfb_password_encrypted = ?
        WHERE id = ?
    """, (dfb_username_encrypted, dfb_password_encrypted, user_id))

    conn.commit()
    conn.close()


def get_dfb_credentials(user_id: int) -> Optional[Dict[str, str]]:
    """
    Holt verschluesselte DFB-Credentials fuer User.

    Args:
        user_id: User ID

    Returns:
        Dict mit dfb_username_encrypted und dfb_password_encrypted oder None
    """
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT dfb_username_encrypted, dfb_password_encrypted 
        FROM users 
        WHERE id = ?
    """, (user_id,))

    result = cursor.fetchone()
    conn.close()

    if result and result['dfb_username_encrypted'] and result['dfb_password_encrypted']:
        return dict(result)
    return None


# ===== SESSION FUNKTIONEN =====

def create_session(session_id: str, user_id: int) -> int:
    """
    Erstellt neue Session in DB.

    Args:
        session_id: Session ID (z.B. session_20251115_184528_1f1f1564)
        user_id: User ID

    Returns:
        Session DB ID
    """
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        INSERT INTO sessions (session_id, user_id, status, created_at)
        VALUES (?, ?, ?, ?)
    """, (session_id, user_id, "pending", datetime.now(UTC).isoformat()))

    session_db_id = cursor.lastrowid
    conn.commit()
    conn.close()

    return session_db_id


def update_session_status(session_id: str, status: str):
    """Aktualisiert Session Status"""
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        UPDATE sessions 
        SET status = ?
        WHERE session_id = ?
    """, (status, session_id))

    conn.commit()
    conn.close()


def get_user_sessions(user_id: int) -> List[Dict]:
    """
    Gibt alle Sessions eines Users zurueck.

    Returns:
        Liste von Session Dicts
    """
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT * FROM sessions 
        WHERE user_id = ?
        ORDER BY created_at DESC
    """, (user_id,))

    sessions = [dict(row) for row in cursor.fetchall()]
    conn.close()

    return sessions


def get_session_by_id(session_id: str) -> Optional[Dict]:
    """Findet Session anhand session_id"""
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM sessions WHERE session_id = ?", (session_id,))
    session = cursor.fetchone()

    conn.close()

    if session:
        return dict(session)
    return None