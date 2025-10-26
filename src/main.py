"""
DFB Spesen Generator - Main Entry Point
"""
import time
import os
from pathlib import Path
from dotenv import load_dotenv

from scraper.dfb_scraper import DFBScraper
from utils.logger import setup_logger

# Lade .env Datei
env_path = Path(__file__).parent.parent / ".env"
load_dotenv(env_path)

logger = setup_logger("main")


def test_navigation():
    """Test: Navigiere durch DFBnet bis zum Login"""

    logger.info("=== DFB Scraper Test: Navigation ===")

    # Credentials aus .env laden
    username = os.getenv("DFB_USERNAME")
    password = os.getenv("DFB_PASSWORD")

    if not username or not password:
        logger.error("DFB_USERNAME oder DFB_PASSWORD nicht in .env gesetzt")
        return

    try:
        with DFBScraper(headless=False, username=username, password=password) as scraper:
            # Schritt 1: Seite öffnen
            scraper.open_dfbnet()

            # Schritt 2: Cookies akzeptieren (1. Mal)
            scraper.accept_cookies()

            # Schritt 3: Auf Anmelden klicken (1. Mal)
            scraper.click_login()

            # Schritt 4: Cookies nochmal akzeptieren (2. Mal)
            logger.info("Warte kurz und prüfe erneut auf Cookie-Banner...")
            scraper.accept_cookies()

            # Schritt 5: Auf Anmelden klicken (2. Mal)
            logger.info("Klicke erneut auf Anmelden...")
            scraper.click_login()

            # Schritt 6: Login-Formular ausfüllen
            scraper.login()

            logger.info("Navigation und Login erfolgreich abgeschlossen")

            # Browser offen lassen zum Anschauen
            logger.info("Browser bleibt 10 Sekunden offen...")
            time.sleep(10)

    except Exception as e:
        logger.error(f"Fehler beim Navigieren: {e}")
        raise

    logger.info("=== Test abgeschlossen ===")


def main():
    """Hauptprogramm"""
    # Momentan nur Test
    test_navigation()


if __name__ == "__main__":
    main()