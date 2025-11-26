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
from contextlib import asynccontextmanager
import multiprocessing

from fastapi import FastAPI, Depends, HTTPException
from fastapi.responses import FileResponse, JSONResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from scheduler import get_scheduler

src_path = Path(__file__).parent.parent
if str(src_path) not in sys.path:
    sys.path.insert(0, str(src_path))

from main import scrape_matches_with_session, generate_documents_in_session
from utils.session_manager import SessionManager
from utils.logger import setup_logger
from utils.match_utils import generate_filename_from_match, extract_iso_date_from_anpfiff
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


# ===== Lifespan Context Manager (ersetzt deprecated on_event) =====
@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifespan Context Manager für Startup/Shutdown Events.
    Ersetzt die deprecated @app.on_event Decorator.
    """
    # === STARTUP ===
    init_database()
    logger.info("Datenbank initialisiert")

    # Scheduler starten
    scheduler = get_scheduler()
    scheduler.start()
    logger.info("Automatischer Session-Scheduler gestartet")

    yield  # App läuft hier

    # === SHUTDOWN ===
    scheduler = get_scheduler()
    scheduler.stop()
    logger.info("Scheduler gestoppt")


app = FastAPI(title="TFV Spesen Generator API", lifespan=lifespan)

# Exception Handlers registrieren
app.add_exception_handler(APIError, api_error_handler)
app.add_exception_handler(Exception, generic_exception_handler)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ===== Frontend Static Files (für Docker Production) =====
FRONTEND_DIR = Path(os.getenv("FRONTEND_DIR", "./frontend/dist"))

if FRONTEND_DIR.exists():
    # Statische Assets (CSS, JS, Bilder)
    app.mount("/assets", StaticFiles(directory=str(FRONTEND_DIR / "assets")), name="assets")
    logger.info(f"Frontend wird ausgeliefert von: {FRONTEND_DIR}")
else:
    logger.warning(f"Frontend-Verzeichnis nicht gefunden: {FRONTEND_DIR}")

# Session Manager global
session_manager = SessionManager()

app.include_router(auth_router)


# ===== Request/Response Models =====

class GenerateRequest(BaseModel):
    """Request für Spesen-Generierung"""
    pass  # Credentials werden aus User-Profil geladen


class SessionResponse(BaseModel):
    """Response mit Session-Informationen"""
    session_id: str
    status: str
    files: List[Dict]
    download_all_url: str
    created_at: str
    progress: Optional[Dict] = None


# ===== Generation Process =====

def run_generation_process(
    session_path: Path,
    session_id: str,
    dfb_username: str,
    dfb_password: str
):
    """
    Führt die Generierung in einem separaten Prozess aus.
    WICHTIG: Muss eigenständig sein (kein Zugriff auf FastAPI app!)

    Args:
        session_path: Pfad zum Session-Ordner
        session_id: Session-ID für DB-Updates
        dfb_username: DFB.net Benutzername (entschlüsselt)
        dfb_password: DFB.net Passwort (entschlüsselt)
    """
    # Eigener Logger für den Prozess
    from utils.logger import setup_logger
    process_logger = setup_logger("generation_process")

    # Session Manager initialisieren
    sm = SessionManager()

    try:
        process_logger.info(f"Starte Generierung für Session {session_path.name}")

        # Update: Scraping started
        sm.update_session_metadata(
            session_path,
            status="scraping",
            progress={"current": 0, "total": 0, "step": "Scraping gestartet..."}
        )
        db_update_session_status(session_id, "scraping")

        # Nutze die bestehende Funktion aus main.py MIT Credentials
        matches_data, _ = scrape_matches_with_session(
            session_path,
            username=dfb_username,
            password=dfb_password
        )

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
        # Verwende existierende sm-Instanz (keine Neuinstanziierung nötig)
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

    # Entschluesseln
    dfb_username = decrypt_credential(dfb_creds['dfb_username_encrypted'])
    dfb_password = decrypt_credential(dfb_creds['dfb_password_encrypted'])

    # Neue Session erstellen
    session_path = session_manager.create_session()
    session_id = session_path.name

    # Session in DB speichern mit User-Verknuepfung
    db_create_session(session_id, user_id)

    # Generierung in eigenem Prozess starten (fuer Playwright-Kompatibilitaet)
    # Credentials werden direkt als Parameter übergeben (nicht über ENV!)
    process = multiprocessing.Process(
        target=run_generation_process,
        args=(session_path, session_id, dfb_username, dfb_password),
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


@app.get("/api/matches")
async def get_all_user_matches(current_user: dict = Depends(get_current_user)):
    """
    Gibt alle Spiele des Users zurück (dedupliziert über alle Sessions).
    """
    user_id = current_user['id']

    try:
        db_sessions = get_user_sessions(user_id)
        logger.info(f"Lade Matches für User {user_id}, {len(db_sessions)} Sessions gefunden")

        all_matches_dict = {}

        for db_session in db_sessions:
            session_id = db_session['session_id']
            session_path = session_manager.get_session_by_id(session_id)

            if not session_path or not session_path.exists():
                logger.warning(f"Session-Pfad nicht gefunden: {session_id}")
                continue

            matches_file = session_path / "spesen_data.json"
            if not matches_file.exists():
                logger.warning(f"spesen_data.json nicht gefunden in {session_id}")
                continue

            try:
                with open(matches_file, 'r', encoding='utf-8') as f:
                    session_matches = json.load(f)

                logger.info(f"Session {session_id}: {len(session_matches)} Spiele geladen")

                for match in session_matches:
                    spiel_info = match.get('spiel_info', {})
                    heim = spiel_info.get('heim_team', '')
                    gast = spiel_info.get('gast_team', '')

                    if not heim or not gast:
                        logger.warning(f"Spiel ohne Heim/Gast-Team in {session_id}")
                        continue

                    # Generiere Dateinamen mit zentraler Helper-Funktion
                    filename = generate_filename_from_match(match)

                    # Prüfe ob Datei existiert
                    file_path = session_path / filename
                    if not file_path.exists():
                        logger.warning(f"Datei nicht gefunden: {filename} in {session_id}")
                        continue

                    # Extrahiere Datum für Deduplizierung und Sortierung
                    datum = extract_iso_date_from_anpfiff(spiel_info.get('anpfiff', ''))
                    key = (heim, gast, datum)

                    # Deduplizierung: Neuere Session gewinnt
                    if key not in all_matches_dict or db_session['created_at'] > all_matches_dict[key]['_created_at']:
                        match['_session_id'] = session_id
                        match['_datum'] = datum
                        match['_created_at'] = db_session['created_at']
                        match['_filename'] = filename
                        all_matches_dict[key] = match

            except Exception as e:
                logger.error(f"Fehler beim Lesen von {matches_file}: {e}")
                logger.error(traceback.format_exc())
                continue

        # Konvertiere zu Liste und sortiere nach Datum (neueste zuerst)
        matches_list = list(all_matches_dict.values())
        matches_list.sort(key=lambda x: x['_datum'], reverse=True)

        logger.info(f"Gesamt: {len(matches_list)} deduplizierte Spiele für User {user_id}")
        return JSONResponse(content=matches_list)

    except Exception as e:
        logger.error(f"Fehler beim Laden aller Matches: {e}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))


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
    Gibt die kompletten Match-Daten einer Session zurück.
    Inkludiert die korrekten Dateinamen für Downloads.
    """
    user_id = current_user['id']

    db_session = db_get_session_by_id(session_id)
    if not db_session:
        raise NotFoundError("Session nicht gefunden")

    if db_session['user_id'] != user_id:
        raise AuthorizationError("Diese Session gehört einem anderen User")

    session_path = session_manager.get_session_by_id(session_id)
    if not session_path:
        raise NotFoundError("Session nicht gefunden")

    data_file = session_path / "spesen_data.json"
    if not data_file.exists():
        return []

    try:
        with open(data_file, 'r', encoding='utf-8') as f:
            matches_data = json.load(f)

        # Füge Dateinamen zu jedem Match hinzu (mit zentraler Helper-Funktion)
        for match in matches_data:
            filename = generate_filename_from_match(match)
            match['_filename'] = filename
            match['_session_id'] = session_id

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

    logger.info("=" * 80)
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
        logger.info("=" * 80)

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


@app.post("/api/scheduler/trigger")
async def trigger_scheduler_now(current_user: dict = Depends(get_current_user)):
    """
    Triggert die automatische Session-Erstellung sofort (für Admin/Testzwecke).
    Erfordert Authentifizierung.

    ACHTUNG: Startet Session-Erstellung für ALLE User!
    """
    logger.info(f"Manueller Scheduler-Trigger durch User {current_user['email']}")

    scheduler = get_scheduler()

    # Starte in Background Task (nicht blockierend)
    import asyncio
    asyncio.create_task(scheduler.trigger_now())

    return {
        "success": True,
        "message": "Automatische Session-Erstellung wurde gestartet",
        "note": "Die Verarbeitung läuft im Hintergrund und kann einige Minuten dauern"
    }


@app.get("/api/scheduler/status")
async def get_scheduler_status(current_user: dict = Depends(get_current_user)):
    """
    Gibt den Status des Schedulers zurück.
    """
    scheduler = get_scheduler()
    job = scheduler.scheduler.get_job('auto_session_creation')

    if job:
        return {
            "running": scheduler.scheduler.running,
            "next_run": str(job.next_run_time) if job.next_run_time else None,
            "job_id": job.id,
            "job_name": job.name
        }
    else:
        return {
            "running": scheduler.scheduler.running,
            "next_run": None,
            "job_id": None,
            "job_name": None
        }


@app.get("/api/debug/session/{session_id}")
async def debug_session(session_id: str, current_user: dict = Depends(get_current_user)):
    """Debug-Endpoint um Session-Details zu prüfen"""
    session_path = session_manager.get_session_by_id(session_id)

    if not session_path:
        return JSONResponse({
            "error": "Session nicht gefunden",
            "session_id": session_id,
            "base_output_dir": str(session_manager.base_output_dir)
        })

    # Alle Dateien auflisten
    all_files = [f.name for f in session_path.iterdir()] if session_path.exists() else []

    # Metadata laden
    metadata = {}
    metadata_path = session_path / "metadata.json"
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


@app.get("/api/health")
async def health_check():
    """Health Check Endpoint"""
    return {
        "status": "online",
        "service": "TFV Spesen Generator API",
        "version": "1.1.1",
        "output_dir": str(session_manager.base_output_dir)
    }


# ===== Frontend Routes =====
@app.get("/")
async def root():
    """Serve Frontend Root"""
    if not FRONTEND_DIR.exists():
        raise HTTPException(status_code=404, detail="Frontend not available")

    index_path = FRONTEND_DIR / "index.html"
    if index_path.exists():
        return FileResponse(str(index_path))
    else:
        raise HTTPException(status_code=404, detail="Frontend not found")


@app.get("/{full_path:path}")
async def serve_frontend(full_path: str):
    """
    Catch-All Route für Frontend (React Router).
    Liefert index.html für alle nicht-API Routen.
    """
    # API-Routen überspringen
    if full_path.startswith("api/"):
        raise HTTPException(status_code=404, detail="API endpoint not found")

    # Wenn Frontend nicht verfügbar, 404
    if not FRONTEND_DIR.exists():
        raise HTTPException(status_code=404, detail="Frontend not available")

    # index.html ausliefern (für React Router)
    index_path = FRONTEND_DIR / "index.html"

    if index_path.exists():
        return FileResponse(str(index_path))
    else:
        raise HTTPException(status_code=404, detail="Frontend not found")