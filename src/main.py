"""
DFB Spesen Generator - Main Entry Point
Startet die FastAPI Backend-Anwendung
"""
import os
import json
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

    # Session Manager für Updates
    session_mgr = SessionManager()

    # Credentials aus .env laden
    username = os.getenv("DFB_USERNAME")
    password = os.getenv("DFB_PASSWORD")

    if not username or not password:
        logger.error("DFB_USERNAME oder DFB_PASSWORD nicht in .env gesetzt")
        return None, None

    try:
        with DFBScraper(headless=True, username=username, password=password) as scraper:
            # Navigation und Login
            session_mgr.update_session_metadata(
                session_path,
                status="scraping",
                progress={"current": 0, "total": 0, "step": "Login und Navigation..."}
            )

            scraper.open_dfbnet()
            scraper.accept_cookies()
            scraper.click_login()
            scraper.accept_cookies()
            scraper.click_login()
            scraper.login()
            scraper.open_menu_if_needed()
            scraper.navigate_to_schiriansetzung()

            # Progress Callback für Scraping
            def update_scraping_progress(current, total, step):
                session_mgr.update_session_metadata(
                    session_path,
                    status="scraping",
                    progress={"current": current, "total": total, "step": step}
                )
                logger.info(f"Progress: {current}/{total} - {step}")

            # Alle Spiele scrapen MIT Progress-Callback
            all_matches = scraper.scrape_all_matches(progress_callback=update_scraping_progress)

            # Daten in Session speichern
            output_file = session_path / "spesen_data.json"
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(all_matches, f, ensure_ascii=False, indent=2)

            logger.info(f"Daten gespeichert in: {output_file}")
            logger.info(f"Erfolgreich {len(all_matches)} Spiele gescrapt")

            return all_matches, session_path

    except Exception as e:
        logger.error(f"Fehler beim Scraping: {e}")
        session_mgr.update_session_metadata(
            session_path,
            status="failed"
        )
        raise


def generate_documents_in_session(matches_data, session_path: Path):
    """
    Generiert DOCX-Dokumente in einem Session-Ordner.

    Args:
        matches_data: Spieldaten
        session_path: Session-Ordner für Output
    """
    logger.info("=== DFB Spesen Generator: Erstelle Dokumente ===")

    # Session Manager für Updates
    session_mgr = SessionManager()

    # Update: Starting document generation
    session_mgr.update_session_metadata(
        session_path,
        status="generating",
        progress={"current": 0, "total": len(matches_data), "step": "Erstelle Dokumente..."}
    )

    # Pfade
    project_root = Path(__file__).parent.parent
    template_path = project_root / "src" / "data" / "Spesenabrechnung_Vorlage.docx"

    # Generiere Dokumente im Session-Ordner
    generator = SpesenGenerator(template_path, session_path)
    generated_files = []

    for i, match_data in enumerate(matches_data, 1):
        try:
            output_path = generator.generate_document(match_data)
            generated_files.append(output_path)

            # Update progress nach jedem Dokument
            session_mgr.update_session_metadata(
                session_path,
                status="generating",
                progress={
                    "current": i,
                    "total": len(matches_data),
                    "step": f"Dokument {i}/{len(matches_data)} erstellt"
                }
            )

        except Exception as e:
            logger.error(f"Fehler bei Dokument {i}: {e}")
            continue

    # Session-Metadata aktualisieren
    files = [f.name for f in generated_files]
    files.append("spesen_data.json")
    session_mgr.update_session_metadata(
        session_path,
        status="completed",
        files=files,
        progress={"current": len(matches_data), "total": len(matches_data), "step": "Abgeschlossen!"}
    )

    logger.info(f"Fertig! {len(generated_files)} Dokumente erstellt in: {session_path}")
    return generated_files


def main():
    """
    Startet die FastAPI Backend-Anwendung.
    Das Frontend läuft separat mit Vite Dev-Server.
    """
    import uvicorn

    logger.info("Starte DFB Spesen Generator API...")
    logger.info("==============================================")
    logger.info("API läuft auf: http://localhost:8000")
    logger.info("==============================================")
    logger.info("Frontend separat starten mit: npm run dev")

    # Starte API
    uvicorn.run(
        "api.main_api:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )


if __name__ == "__main__":
    main()