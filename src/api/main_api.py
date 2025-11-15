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

from fastapi import FastAPI, HTTPException
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

# Lade .env
env_path = src_path.parent / ".env"
load_dotenv(env_path)

logger = setup_logger("api")

# Wichtig fuer multiprocessing auf Windows
multiprocessing.freeze_support()

app = FastAPI(title="DFB Spesen Generator API")

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Session Manager global - KEIN Pfad angeben, er findet automatisch das Projekt-Root!
session_manager = SessionManager()

logger.info(f"API gestartet - Output-Dir: {session_manager.base_output_dir}")


class GenerateRequest(BaseModel):
    """Request Model fuer Spesen-Generierung"""
    username: Optional[str] = None
    password: Optional[str] = None
    use_env_credentials: bool = True


class SessionResponse(BaseModel):
    """Response Model fuer Session-Info"""
    session_id: str
    status: str
    files: List[Dict]
    download_all_url: str
    created_at: str
    progress: Optional[Dict] = None


def run_generation_process(session_path: Path):
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

        # Nutze die bestehende Funktion aus main.py
        matches_data, _ = scrape_matches_with_session(session_path)

        if matches_data:
            # Update: Documents generation started
            sm.update_session_metadata(
                session_path,
                status="generating",
                progress={"current": 0, "total": len(matches_data), "step": "Erstelle Dokumente..."}
            )

            # Nutze die bestehende Funktion aus main.py
            generate_documents_in_session(matches_data, session_path)
            process_logger.info(f"Session {session_path.name} erfolgreich abgeschlossen")
        else:
            raise Exception("Keine Spiele gefunden")

    except Exception as e:
        process_logger.error(f"Fehler in Session {session_path.name}: {e}")
        # Session Manager neu initialisieren im Prozess
        sm = SessionManager()
        sm.update_session_metadata(session_path, status="failed")


@app.post("/api/generate", response_model=SessionResponse)
async def generate_spesen(request: GenerateRequest):
    """
    Startet die Spesen-Generierung in einer neuen Session.
    """
    # Bei use_env_credentials=true werden die Credentials aus .env verwendet
    if not request.use_env_credentials:
        # Temporaer Env-Variablen setzen fuer diese Anfrage
        if request.username:
            os.environ["DFB_USERNAME"] = request.username
        if request.password:
            os.environ["DFB_PASSWORD"] = request.password

    # Neue Session erstellen
    session_path = session_manager.create_session()
    session_id = session_path.name

    # Generierung in eigenem Prozess starten (fuer Playwright-Kompatibilitaet)
    process = multiprocessing.Process(
        target=run_generation_process,
        args=(session_path,),
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


@app.get("/api/session/{session_id}", response_model=SessionResponse)
async def get_session_status(session_id: str):
    """
    Gibt den Status einer Session zurueck.
    """
    session_path = session_manager.get_session_by_id(session_id)

    if not session_path:
        raise HTTPException(status_code=404, detail="Session nicht gefunden")

    metadata_path = session_path / "metadata.json"
    with open(metadata_path, 'r', encoding='utf-8') as f:
        metadata = json.load(f)

    files = session_manager.get_session_files(session_path)

    return SessionResponse(
        session_id=session_id,
        status=metadata.get("status", "unknown"),
        files=files,
        download_all_url=f"/api/download/{session_id}/all",
        created_at=metadata.get("created_at", ""),
        progress=metadata.get("progress")
    )


# WICHTIG: ZIP-Download MUSS VOR dem Einzelfile-Download kommen!
# Sonst matched FastAPI /all als filename
@app.get("/api/download/{session_id}/all")
async def download_all_as_zip(session_id: str):
    """
    Download aller Dateien einer Session als ZIP.
    WICHTIG: Dieser Endpoint MUSS vor download_file() stehen!
    """
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

        # Pruefe Metadata
        metadata_path = session_path / "metadata.json"
        if metadata_path.exists():
            with open(metadata_path, 'r', encoding='utf-8') as f:
                metadata = json.load(f)
                status = metadata.get("status", "unknown")
                logger.error(f"Session-Status: {status}")

                if status in ["in_progress", "scraping", "generating"]:
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
async def download_file(session_id: str, filename: str):
    """
    Download einer einzelnen Datei aus einer Session.
    WICHTIG: Dieser Endpoint MUSS nach download_all_as_zip() stehen!
    """
    session_path = session_manager.get_session_by_id(session_id)

    if not session_path:
        raise HTTPException(status_code=404, detail="Session nicht gefunden")

    file_path = session_path / filename

    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Datei nicht gefunden")

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