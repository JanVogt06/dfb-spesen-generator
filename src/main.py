"""
DFB Spesen Generator - Main Entry Point
"""
import time
import os
import json
from pathlib import Path
from dotenv import load_dotenv

from scraper.dfb_scraper import DFBScraper
from generator.docx_generator import SpesenGenerator
from utils.logger import setup_logger

# Lade .env Datei
env_path = Path(__file__).parent.parent / ".env"
load_dotenv(env_path)

logger = setup_logger("main")


def scrape_matches():
    """Scrapt alle Spiele und speichert die Daten"""

    logger.info("=== DFB Scraper: Sammle alle Spieldaten ===")

    # Credentials aus .env laden
    username = os.getenv("DFB_USERNAME")
    password = os.getenv("DFB_PASSWORD")

    if not username or not password:
        logger.error("DFB_USERNAME oder DFB_PASSWORD nicht in .env gesetzt")
        return None

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

            # Daten als JSON speichern (Backup)
            output_file = Path(__file__).parent.parent / "matches_data.json"
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(all_matches, f, ensure_ascii=False, indent=2)

            logger.info(f"Daten gespeichert in: {output_file}")
            logger.info(f"Erfolgreich {len(all_matches)} Spiele gescrapt")

            return all_matches

    except Exception as e:
        logger.error(f"Fehler beim Scraping: {e}")
        raise


def generate_documents(matches_data):
    """Generiert DOCX-Dokumente aus Match-Daten"""

    logger.info("=== DFB Spesen Generator: Erstelle Dokumente ===")

    # Pfade
    project_root = Path(__file__).parent.parent
    template_path = project_root / "src" / "data" / "Spesenabrechnung_Vorlage.docx"
    output_dir = project_root / "output"

    # Generiere Dokumente
    generator = SpesenGenerator(template_path, output_dir)
    generated_files = generator.generate_all_documents(matches_data)

    logger.info(f"✓ Fertig! {len(generated_files)} Dokumente erstellt in: {output_dir}")
    return generated_files


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
    """Hauptprogramm - Scrapt Daten und generiert Dokumente"""
    # Schritt 1: Scrape alle Spiele
    matches_data = scrape_matches()

    if not matches_data:
        logger.error("Keine Daten gescrapt - Abbruch")
        return

    # Schritt 2: Generiere Dokumente
    generate_documents(matches_data)

    logger.info("=== Fertig! Alle Spesenabrechnung-Dokumente erstellt ===")


if __name__ == "__main__":
    main()