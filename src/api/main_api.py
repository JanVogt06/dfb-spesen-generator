"""
FastAPI Backend für DFB Spesen Generator
"""
import os
import sys
import json
import zipfile
from pathlib import Path
from typing import Dict, List, Optional
from datetime import datetime
import multiprocessing

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

src_path = Path(__file__).parent.parent
sys.path.insert(0, str(src_path))

from main import scrape_matches_with_session, generate_documents_in_session
from utils.session_manager import SessionManager
from utils.logger import setup_logger

# Lade .env
env_path = src_path.parent / ".env"
load_dotenv(env_path)

logger = setup_logger("api")

# Wichtig für multiprocessing auf Windows
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

# Session Manager global
session_manager = SessionManager(base_output_dir="output")


class GenerateRequest(BaseModel):
    """Request Model für Spesen-Generierung"""
    username: Optional[str] = None
    password: Optional[str] = None
    use_env_credentials: bool = True


class SessionResponse(BaseModel):
    """Response Model für Session-Info"""
    session_id: str
    status: str
    files: List[Dict]
    download_all_url: str
    created_at: str


def run_generation_process(session_path: Path):
    """
    Führt die Generierung in einem separaten Prozess aus.
    Nutzt die bestehenden Funktionen aus main.py.
    """
    # Logger muss im neuen Prozess neu initialisiert werden
    process_logger = setup_logger("api_worker")

    try:
        process_logger.info(f"Starte Generierung für Session: {session_path.name}")

        # Nutze die bestehende Funktion aus main.py
        matches_data, _ = scrape_matches_with_session(session_path)

        if matches_data:
            # Nutze die bestehende Funktion aus main.py
            generate_documents_in_session(matches_data, session_path)
            process_logger.info(f"Session {session_path.name} erfolgreich abgeschlossen")
        else:
            raise Exception("Keine Spiele gefunden")

    except Exception as e:
        process_logger.error(f"Fehler in Session {session_path.name}: {e}")
        # Session Manager neu initialisieren im Prozess
        sm = SessionManager(base_output_dir="output")
        sm.update_session_metadata(session_path, status="failed")


@app.post("/api/generate", response_model=SessionResponse)
async def generate_spesen(request: GenerateRequest):
    """
    Startet die Spesen-Generierung in einer neuen Session.
    """
    # Bei use_env_credentials=true werden die Credentials aus .env verwendet
    if not request.use_env_credentials:
        # Temporär Env-Variablen setzen für diese Anfrage
        if request.username:
            os.environ["DFB_USERNAME"] = request.username
        if request.password:
            os.environ["DFB_PASSWORD"] = request.password

    # Neue Session erstellen
    session_path = session_manager.create_session()
    session_id = session_path.name

    # Generierung in eigenem Prozess starten (für Playwright-Kompatibilität)
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
        created_at=datetime.now().isoformat()
    )


@app.get("/api/session/{session_id}", response_model=SessionResponse)
async def get_session_status(session_id: str):
    """
    Gibt den Status einer Session zurück.
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
        created_at=metadata.get("created_at", "")
    )


@app.get("/api/download/{session_id}/{filename}")
async def download_file(session_id: str, filename: str):
    """
    Download einer einzelnen Datei aus einer Session.
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


@app.get("/api/download/{session_id}/all")
async def download_all_as_zip(session_id: str):
    """
    Download aller Dateien einer Session als ZIP.
    """
    session_path = session_manager.get_session_by_id(session_id)

    if not session_path:
        raise HTTPException(status_code=404, detail="Session nicht gefunden")

    zip_path = session_path / f"spesen_{session_id}.zip"

    with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for docx in session_path.glob("*.docx"):
            zipf.write(docx, docx.name)
        json_file = session_path / "spesen_data.json"
        if json_file.exists():
            zipf.write(json_file, json_file.name)

    return FileResponse(
        path=zip_path,
        filename=f"spesen_{datetime.now().strftime('%Y%m%d')}.zip",
        media_type="application/zip"
    )


@app.get("/")
async def root():
    """Health Check Endpoint"""
    return {
        "status": "online",
        "service": "DFB Spesen Generator API",
        "version": "1.0.0"
    }