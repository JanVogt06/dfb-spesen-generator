"""
DFB Spesen Generator - Main Entry Point
"""
import time
import os
import json
import sys
from pathlib import Path
from dotenv import load_dotenv

from scraper.dfb_scraper import DFBScraper
from generator.docx_generator import SpesenGenerator
from utils.session_manager import SessionManager
from utils.logger import setup_logger

# Lade .env Datei
env_path = Path(__file__).parent.parent / ".env"
load_dotenv(env_path)

logger = setup_logger("main")


def scrape_matches_with_session(session_path: Path = None):
    """
    Scrapt alle Spiele und speichert die Daten in einer Session.

    Args:
        session_path: Optional - spezifischer Session-Pfad

    Returns:
        Tuple (matches_data, session_path)
    """
    logger.info("=== DFB Scraper: Sammle alle Spieldaten ===")

    # Session erstellen falls nicht vorhanden
    if not session_path:
        session_mgr = SessionManager()
        session_path = session_mgr.create_session()

    # Credentials aus .env laden
    username = os.getenv("DFB_USERNAME")
    password = os.getenv("DFB_PASSWORD")

    if not username or not password:
        logger.error("DFB_USERNAME oder DFB_PASSWORD nicht in .env gesetzt")
        return None, None

    try:
        with DFBScraper(headless=False, username=username, password=password) as scraper:
            # Navigation und Login
            scraper.open_dfbnet()
            scraper.accept_cookies()
            scraper.click_login()
            scraper.accept_cookies()
            scraper.click_login()
            scraper.login()
            scraper.open_menu_if_needed()
            scraper.navigate_to_schiriansetzung()

            # Alle Spiele scrapen
            all_matches = scraper.scrape_all_matches()

            # Daten in Session speichern
            output_file = session_path / "spesen_data.json"
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(all_matches, f, ensure_ascii=False, indent=2)

            logger.info(f"Daten gespeichert in: {output_file}")
            logger.info(f"Erfolgreich {len(all_matches)} Spiele gescrapt")

            return all_matches, session_path

    except Exception as e:
        logger.error(f"Fehler beim Scraping: {e}")
        raise


def generate_documents_in_session(matches_data, session_path: Path):
    """
    Generiert DOCX-Dokumente in einem Session-Ordner.

    Args:
        matches_data: Spieldaten
        session_path: Session-Ordner für Output
    """
    logger.info("=== DFB Spesen Generator: Erstelle Dokumente ===")

    # Pfade
    project_root = Path(__file__).parent.parent
    template_path = project_root / "src" / "data" / "Spesenabrechnung_Vorlage.docx"

    # Generiere Dokumente im Session-Ordner
    generator = SpesenGenerator(template_path, session_path)
    generated_files = generator.generate_all_documents(matches_data)

    # Session-Metadata aktualisieren
    session_mgr = SessionManager()
    files = [f.name for f in generated_files]
    files.append("spesen_data.json")
    session_mgr.update_session_metadata(session_path, status="completed", files=files)

    logger.info(f"✓ Fertig! {len(generated_files)} Dokumente erstellt in: {session_path}")
    return generated_files


def main():
    """Hauptprogramm - Scrapt Daten und generiert Dokumente in Session"""
    # Schritt 1: Scrape alle Spiele in Session
    matches_data, session_path = scrape_matches_with_session()

    if not matches_data:
        logger.error("Keine Daten gescrapt - Abbruch")
        return

    # Schritt 2: Generiere Dokumente in Session
    generate_documents_in_session(matches_data, session_path)

    logger.info(f"=== Fertig! Session erstellt: {session_path.name} ===")


def run_api():
    """Startet die FastAPI Anwendung"""
    import uvicorn
    logger.info("Starte Web-API...")
    uvicorn.run(
        "api.main_api:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )


if __name__ == "__main__":
    # Prüfe ob API-Modus gewünscht ist
    if len(sys.argv) > 1 and sys.argv[1] == "--api":
        run_api()
    else:
        main()