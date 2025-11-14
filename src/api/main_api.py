"""
FastAPI Backend für DFB Spesen Generator
"""
import os
import json
import zipfile
from pathlib import Path
from typing import Dict, List, Optional
from datetime import datetime

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

from scraper.dfb_scraper import DFBScraper
from generator.docx_generator import SpesenGenerator
from utils.session_manager import SessionManager
from utils.logger import setup_logger

# Lade .env
env_path = Path(__file__).parent.parent.parent / ".env"
load_dotenv(env_path)

logger = setup_logger("api")

app = FastAPI(title="DFB Spesen Generator API")

# CORS Middleware für Web-Frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In Production einschränken!
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
    use_env_credentials: bool = True  # Standard: Verwende .env Credentials


class SessionResponse(BaseModel):
    """Response Model für Session-Info"""
    session_id: str
    status: str
    files: List[Dict]
    download_all_url: str
    created_at: str


async def generate_spesen_task(session_path: Path, username: str, password: str):
    """
    Background Task für Spesen-Generierung.
    Läuft asynchron um parallele Anfragen zu ermöglichen.
    """
    try:
        logger.info(f"Starte Generierung für Session: {session_path.name}")

        # Scraping durchführen
        with DFBScraper(headless=True, username=username, password=password) as scraper:
            scraper.open_dfbnet()
            scraper.accept_cookies()
            scraper.click_login()
            scraper.accept_cookies()
            scraper.click_login()
            scraper.login()
            scraper.open_menu_if_needed()
            scraper.navigate_to_schiriansetzung()

            all_matches = scraper.scrape_all_matches()

        # Daten in Session speichern
        json_path = session_path / "spesen_data.json"
        with open(json_path, 'w', encoding='utf-8') as f:
            json.dump(all_matches, f, ensure_ascii=False, indent=2)

        # Dokumente generieren
        project_root = Path(__file__).parent.parent.parent
        template_path = project_root / "src" / "data" / "Spesenabrechnung_Vorlage.docx"

        generator = SpesenGenerator(template_path, session_path)
        generated_files = generator.generate_all_documents(all_matches)

        # Session-Metadata aktualisieren
        files = [f.name for f in generated_files]
        files.append("spesen_data.json")
        session_manager.update_session_metadata(
            session_path,
            status="completed",
            files=files
        )

        logger.info(f"Session {session_path.name} erfolgreich abgeschlossen")

    except Exception as e:
        logger.error(f"Fehler in Session {session_path.name}: {e}")
        session_manager.update_session_metadata(
            session_path,
            status="failed"
        )


@app.post("/api/generate", response_model=SessionResponse)
async def generate_spesen(
        request: GenerateRequest,
        background_tasks: BackgroundTasks
):
    """
    Startet die Spesen-Generierung in einer neuen Session.
    Läuft im Hintergrund um parallele Anfragen zu ermöglichen.
    """
    # Credentials bestimmen
    if request.use_env_credentials:
        username = os.getenv("DFB_USERNAME")
        password = os.getenv("DFB_PASSWORD")
    else:
        username = request.username
        password = request.password

    if not username or not password:
        raise HTTPException(status_code=400, detail="DFB Credentials fehlen")

    # Neue Session erstellen
    session_path = session_manager.create_session()
    session_id = session_path.name

    # Generierung im Hintergrund starten (für parallele Verarbeitung)
    background_tasks.add_task(
        generate_spesen_task,
        session_path,
        username,
        password
    )

    # Sofort Response zurückgeben
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

    # Lade Metadata
    metadata_path = session_path / "metadata.json"
    with open(metadata_path, 'r', encoding='utf-8') as f:
        metadata = json.load(f)

    # Hole Datei-Liste
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

    # Bestimme MIME-Type
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

    # ZIP erstellen
    zip_path = session_path / f"spesen_{session_id}.zip"

    with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
        # Alle DOCX Dateien hinzufügen
        for docx in session_path.glob("*.docx"):
            zipf.write(docx, docx.name)

        # JSON hinzufügen
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