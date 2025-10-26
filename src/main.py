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

            # Schritt 7: Menü öffnen falls nötig
            scraper.open_menu_if_needed()

            # Schritt 8: Zu Schiriansetzung -> Eigene Daten navigieren
            scraper.navigate_to_schiriansetzung()

            # Schritt 9: Alle Spiele sammeln
            anzahl_spiele = scraper.get_all_matches()

            # Schritt 10: Test - Extrahiere alle Daten vom ersten Spiel
            if anzahl_spiele > 0:
                logger.info("=== Test: Extrahiere Daten aus erstem Spiel ===")

                # 1. Spielinformationen aus "Mehr Info" Modal
                scraper.open_mehr_info_modal(0)
                match_data = scraper.extract_match_info_from_modal()
                logger.info(f"Spieldaten: {match_data}")
                scraper.close_modal()

                # 2. Schiedsrichter-Kontakte
                scraper.open_referee_modal(0)
                referee_data = scraper.extract_referee_contacts()
                logger.info(f"Schiedsrichter ({len(referee_data)}): {referee_data}")
                scraper.close_modal()

                # 3. Spielstätte
                scraper.open_venue_modal(0)
                venue_data = scraper.extract_venue_info()
                logger.info(f"Spielstätte: {venue_data}")
                scraper.close_modal()

                logger.info("Datenextraktion erfolgreich")

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