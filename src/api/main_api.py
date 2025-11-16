"""
FastAPI Backend fuer DFB Spesen Generator
"""
import os
import sys
import json
import zipfile
import traceback
from pathlib import Path
from typing import Dict, List, Optional
from datetime import datetime
import multiprocessing

from fastapi import FastAPI, Depends, HTTPException
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

src_path = Path(__file__).parent.parent
if str(src_path) not in sys.path:
    sys.path.insert(0, str(src_path))

from main import scrape_matches_with_session, generate_documents_in_session
from utils.session_manager import SessionManager
from utils.logger import setup_logger
from db.database import (
    init_database,
    create_session as db_create_session,
    update_session_status as db_update_session_status,
    get_user_sessions,
    get_session_by_id as db_get_session_by_id
)
from api.auth import router as auth_router, get_current_user
from core.errors import (
    APIError,
    NotFoundError,
    AuthorizationError,
    CredentialsMissingError,
    api_error_handler,
    generic_exception_handler
)

# Lade .env
env_path = src_path.parent / ".env"
load_dotenv(env_path)

logger = setup_logger("api")

# Wichtig fuer multiprocessing auf Windows
multiprocessing.freeze_support()

app = FastAPI(title="DFB Spesen Generator API")

# Exception Handlers registrieren
app.add_exception_handler(APIError, api_error_handler)
app.add_exception_handler(Exception, generic_exception_handler)

# Datenbank beim Start initialisieren
@app.on_event("startup")
async def startup_event():
    init_database()
    logger.info("Datenbank initialisiert")

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Session Manager global
session_manager = SessionManager()

app.include_router(auth_router)

logger.info(f"API gestartet - Output-Dir: {session_manager.base_output_dir}")


class GenerateRequest(BaseModel):
    """Request Model fuer Spesen-Generierung"""
    # DFB-Credentials werden automatisch aus DB geladen
    pass


class SessionResponse(BaseModel):
    """Response Model fuer Session-Info"""
    session_id: str
    status: str
    files: List[Dict]
    download_all_url: str
    created_at: str
    progress: Optional[Dict] = None


def run_generation_process(session_path: Path, session_id: str):
    """
    Fuehrt die Generierung in einem separaten Prozess aus.
    Nutzt die bestehenden Funktionen aus main.py.
    """
    # Logger muss im neuen Prozess neu initialisiert werden
    process_logger = setup_logger("api_worker")

    try:
        process_logger.info(f"Starte Generierung fuer Session: {session_path.name}")

        # Session Manager im Prozess initialisieren - findet automatisch Projekt-Root
        sm = SessionManager()

        # Update: Scraping started
        sm.update_session_metadata(
            session_path,
            status="scraping",
            progress={"current": 0, "total": 0, "step": "Scraping gestartet..."}
        )
        db_update_session_status(session_id, "scraping")

        # Nutze die bestehende Funktion aus main.py
        matches_data, _ = scrape_matches_with_session(session_path)

        if matches_data:
            # Update: Documents generation started
            sm.update_session_metadata(
                session_path,
                status="generating",
                progress={"current": 0, "total": len(matches_data), "step": "Erstelle Dokumente..."}
            )
            db_update_session_status(session_id, "generating")

            # Nutze die bestehende Funktion aus main.py
            generate_documents_in_session(matches_data, session_path)

            # Update: Completed
            sm.update_session_metadata(session_path, status="completed")
            db_update_session_status(session_id, "completed")

            process_logger.info(f"Session {session_path.name} erfolgreich abgeschlossen")
        else:
            raise Exception("Keine Spiele gefunden")

    except Exception as e:
        process_logger.error(f"Fehler in Session {session_path.name}: {e}")
        # Session Manager neu initialisieren im Prozess
        sm = SessionManager()
        sm.update_session_metadata(session_path, status="failed")
        db_update_session_status(session_id, "failed")


@app.post("/api/generate", response_model=SessionResponse)
async def generate_spesen(
    request: GenerateRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Startet die Spesen-Generierung in einer neuen Session.
    Nur fuer eingeloggte User.
    DFB-Credentials werden automatisch aus User-Profil geladen.
    """
    user_id = current_user['id']
    logger.info(f"User {current_user['email']} startet Generierung")

    # Lade DFB-Credentials aus DB
    from db.database import get_dfb_credentials
    from core.encryption import decrypt_credential

    dfb_creds = get_dfb_credentials(user_id)

    if not dfb_creds:
        raise CredentialsMissingError()

    # Entschluesseln und als Env-Variablen setzen (fuer Scraper)
    dfb_username = decrypt_credential(dfb_creds['dfb_username_encrypted'])
    dfb_password = decrypt_credential(dfb_creds['dfb_password_encrypted'])

    os.environ["DFB_USERNAME"] = dfb_username
    os.environ["DFB_PASSWORD"] = dfb_password

    # Neue Session erstellen
    session_path = session_manager.create_session()
    session_id = session_path.name

    # Session in DB speichern mit User-Verknuepfung
    db_create_session(session_id, user_id)

    # Generierung in eigenem Prozess starten (fuer Playwright-Kompatibilitaet)
    process = multiprocessing.Process(
        target=run_generation_process,
        args=(session_path, session_id),
        daemon=True
    )
    process.start()

    return SessionResponse(
        session_id=session_id,
        status="in_progress",
        files=[],
        download_all_url=f"/api/download/{session_id}/all",
        created_at=datetime.now().isoformat(),
        progress={"current": 0, "total": 0, "step": "Starte..."}
    )


@app.get("/api/sessions", response_model=List[SessionResponse])
async def get_user_sessions_list(current_user: dict = Depends(get_current_user)):
    """
    Gibt alle Sessions des eingeloggten Users zurueck.
    """
    user_id = current_user['id']

    # Hole Sessions aus DB
    db_sessions = get_user_sessions(user_id)

    # Erweitere mit Dateisystem-Infos
    response_sessions = []
    for db_session in db_sessions:
        session_id = db_session['session_id']
        session_path = session_manager.get_session_by_id(session_id)

        if not session_path:
            continue

        # Lade Metadata aus Dateisystem
        metadata_path = session_path / "metadata.json"
        if metadata_path.exists():
            with open(metadata_path, 'r', encoding='utf-8') as f:
                metadata = json.load(f)
        else:
            metadata = {}

        files = session_manager.get_session_files(session_path)

        response_sessions.append(SessionResponse(
            session_id=session_id,
            status=db_session['status'],
            files=files,
            download_all_url=f"/api/download/{session_id}/all",
            created_at=db_session['created_at'],
            progress=metadata.get("progress")
        ))

    return response_sessions


@app.get("/api/session/{session_id}", response_model=SessionResponse)
async def get_session_status(
    session_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Gibt den Status einer Session zurueck.
    """
    user_id = current_user['id']

    # Pruefe ob Session dem User gehoert
    db_session = db_get_session_by_id(session_id)

    if not db_session:
        raise NotFoundError("Session nicht gefunden")

    if db_session['user_id'] != user_id:
        raise AuthorizationError("Diese Session gehört einem anderen User")

    # Hole Dateisystem-Infos
    session_path = session_manager.get_session_by_id(session_id)

    if not session_path:
        raise NotFoundError("Session-Dateien nicht gefunden")

    metadata_path = session_path / "metadata.json"
    if metadata_path.exists():
        with open(metadata_path, 'r', encoding='utf-8') as f:
            metadata = json.load(f)
    else:
        metadata = {}

    files = session_manager.get_session_files(session_path)

    return SessionResponse(
        session_id=session_id,
        status=db_session['status'],
        files=files,
        download_all_url=f"/api/download/{session_id}/all",
        created_at=db_session['created_at'],
        progress=metadata.get("progress")
    )


@app.get("/api/session/{session_id}/matches")
async def get_session_matches(
    session_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Gibt die kompletten Match-Daten einer Session zurueck.
    """
    user_id = current_user['id']

    # Pruefe ob Session dem User gehoert
    db_session = db_get_session_by_id(session_id)

    if not db_session:
        raise NotFoundError("Session nicht gefunden")

    if db_session['user_id'] != user_id:
        raise AuthorizationError("Diese Session gehört einem anderen User")

    # Hole Session-Pfad
    session_path = session_manager.get_session_by_id(session_id)

    if not session_path:
        raise NotFoundError("Session nicht gefunden")

    # Lade spesen_data.json
    data_file = session_path / "spesen_data.json"

    if not data_file.exists():
        # Wenn noch keine Daten vorhanden, gebe leere Liste zurueck
        return []

    try:
        with open(data_file, 'r', encoding='utf-8') as f:
            matches_data = json.load(f)
        return matches_data
    except Exception as e:
        logger.error(f"Fehler beim Laden der Match-Daten: {e}")
        raise APIError(f"Fehler beim Laden der Match-Daten: {str(e)}")


# WICHTIG: ZIP-Download MUSS VOR dem Einzelfile-Download kommen!
# Sonst matched FastAPI /all als filename
@app.get("/api/download/{session_id}/all")
async def download_all_as_zip(
    session_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Download aller Dateien einer Session als ZIP.
    WICHTIG: Dieser Endpoint MUSS vor download_file() stehen!
    """
    user_id = current_user['id']

    # Pruefe ob Session dem User gehoert
    db_session = db_get_session_by_id(session_id)

    if not db_session:
        raise NotFoundError("Session nicht gefunden")

    if db_session['user_id'] != user_id:
        raise AuthorizationError("Diese Session gehört einem anderen User")

    logger.info("="*80)
    logger.info(f"ZIP-Download START fuer Session: {session_id}")
    logger.info(f"SessionManager base_output_dir: {session_manager.base_output_dir}")

    session_path = session_manager.get_session_by_id(session_id)

    if not session_path:
        logger.error(f"Session nicht gefunden: {session_id}")
        expected_path = session_manager.base_output_dir / session_id
        logger.error(f"Erwarteter Pfad: {expected_path}")
        logger.error(f"Existiert: {expected_path.exists()}")
        raise HTTPException(status_code=404, detail="Session nicht gefunden")

    logger.info(f"Session-Pfad: {session_path}")
    logger.info(f"Existiert: {session_path.exists()}")

    # Liste Dateien auf
    if session_path.exists():
        all_files = list(session_path.iterdir())
        logger.info(f"Dateien im Ordner: {[f.name for f in all_files]}")

    # Finde DOCX-Dateien
    docx_files = list(session_path.glob("*.docx"))
    logger.info(f"Gefundene DOCX-Dateien: {len(docx_files)}")

    if not docx_files:
        logger.error("Keine DOCX-Dateien gefunden!")

        # Pruefe Status
        status = db_session['status']
        logger.error(f"Session-Status: {status}")

        if status in ["pending", "in_progress", "scraping", "generating"]:
            raise HTTPException(
                status_code=425,
                detail=f"Dokumente werden noch erstellt (Status: {status})"
            )
        elif status == "failed":
            raise HTTPException(
                status_code=500,
                detail="Die Dokument-Generierung ist fehlgeschlagen"
            )

        raise HTTPException(status_code=404, detail="Keine DOCX-Dateien gefunden")

    zip_filename = f"spesen_{session_id}.zip"
    zip_path = session_path / zip_filename

    logger.info(f"Erstelle ZIP: {zip_path}")

    try:
        with zipfile.ZipFile(str(zip_path), 'w', zipfile.ZIP_DEFLATED) as zipf:
            for docx in docx_files:
                zipf.write(str(docx), docx.name)
                logger.info(f"  Added: {docx.name}")

        if not zip_path.exists():
            raise HTTPException(status_code=500, detail="ZIP-Erstellung fehlgeschlagen")

        zip_size = zip_path.stat().st_size
        logger.info(f"ZIP erstellt: {zip_size} bytes")
        logger.info("="*80)

        return FileResponse(
            path=str(zip_path),
            filename=f"spesen_{datetime.now().strftime('%Y%m%d')}.zip",
            media_type="application/zip"
        )

    except Exception as e:
        logger.error(f"ZIP-Fehler: {e}")
        logger.error(traceback.format_exc())
        raise HTTPException(
            status_code=500,
            detail=f"Fehler beim Erstellen der ZIP: {str(e)}"
        )


@app.get("/api/download/{session_id}/{filename}")
async def download_file(
    session_id: str,
    filename: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Download einer einzelnen Datei aus einer Session.
    WICHTIG: Dieser Endpoint MUSS nach download_all_as_zip() stehen!
    """
    user_id = current_user['id']

    # Pruefe ob Session dem User gehoert
    db_session = db_get_session_by_id(session_id)

    if not db_session:
        raise NotFoundError("Session nicht gefunden")

    if db_session['user_id'] != user_id:
        raise AuthorizationError("Diese Session gehört einem anderen User")

    session_path = session_manager.get_session_by_id(session_id)

    if not session_path:
        raise NotFoundError("Session nicht gefunden")

    file_path = session_path / filename

    if not file_path.exists():
        raise NotFoundError("Datei nicht gefunden")

    if filename.endswith('.docx'):
        media_type = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    elif filename.endswith('.json'):
        media_type = "application/json"
    else:
        media_type = "application/octet-stream"

    return FileResponse(
        path=file_path,
        filename=filename,
        media_type=media_type
    )


@app.get("/api/debug/session/{session_id}")
async def debug_session(session_id: str):
    """
    DEBUG-Endpoint: Zeigt alle Details einer Session
    """
    session_path = session_manager.get_session_by_id(session_id)

    if not session_path:
        return JSONResponse({
            "error": "Session nicht gefunden",
            "session_id": session_id,
            "base_output_dir": str(session_manager.base_output_dir),
            "expected_path": str(session_manager.base_output_dir / session_id)
        })

    # Alle Dateien im Ordner
    all_files = [
        {
            "name": f.name,
            "size": f.stat().st_size,
            "is_file": f.is_file(),
            "is_dir": f.is_dir()
        }
        for f in session_path.glob("*")
    ]

    # Metadata laden
    metadata_path = session_path / "metadata.json"
    metadata = {}
    if metadata_path.exists():
        with open(metadata_path, 'r', encoding='utf-8') as f:
            metadata = json.load(f)

    # DOCX-Dateien
    docx_files = [f.name for f in session_path.glob("*.docx")]

    return JSONResponse({
        "session_id": session_id,
        "session_path": str(session_path),
        "session_exists": session_path.exists(),
        "all_files": all_files,
        "docx_files": docx_files,
        "docx_count": len(docx_files),
        "metadata": metadata,
        "base_output_dir": str(session_manager.base_output_dir)
    })


@app.get("/")
async def root():
    """Health Check Endpoint"""
    return {
        "status": "online",
        "service": "DFB Spesen Generator API",
        "version": "1.1.1",
        "output_dir": str(session_manager.base_output_dir)
    }