"""
Automatischer Session Scheduler
Erstellt täglich um 3 Uhr morgens für jeden User eine Session
Maximal 4 Sessions laufen gleichzeitig
"""
import asyncio
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Any
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

from db.database import get_all_users, get_dfb_credentials
from core.encryption import decrypt_credential
from scraper.dfb_scraper import DFBScraper
from generator.docx_generator import SpesenGenerator
from utils.session_manager import SessionManager
from utils.logger import setup_logger

logger = setup_logger("auto_scheduler")


class AutoSessionScheduler:
    """Automatischer Scheduler für nächtliche Session-Erstellung"""

    def __init__(self):
        """Initialisiert den Scheduler"""
        self.scheduler = AsyncIOScheduler()
        self.session_manager = SessionManager()
        self.max_concurrent = 4  # Maximal 4 gleichzeitige Sessions
        self.semaphore = asyncio.Semaphore(self.max_concurrent)
        logger.info(f"AutoSessionScheduler initialisiert (max {self.max_concurrent} gleichzeitige Sessions)")

    async def process_user_session(self, user: Dict[str, Any]) -> Dict[str, Any]:
        """
        Verarbeitet eine Session für einen einzelnen User

        Args:
            user: User-Dictionary mit id, email, etc.

        Returns:
            Dictionary mit Ergebnis-Informationen
        """
        async with self.semaphore:  # Limitiert auf max_concurrent gleichzeitige Ausführungen
            user_id = user['id']
            email = user['email']

            try:
                logger.info(f"[User {user_id}] Starte automatische Session für {email}")

                # 1. DFB Credentials holen
                credentials = get_dfb_credentials(user_id)
                if not credentials:
                    logger.warning(f"[User {user_id}] Keine DFB-Credentials gespeichert - überspringe")
                    return {
                        "user_id": user_id,
                        "email": email,
                        "success": False,
                        "reason": "no_credentials"
                    }

                # Credentials entschlüsseln
                dfb_username = decrypt_credential(credentials['dfb_username_encrypted'])
                dfb_password = decrypt_credential(credentials['dfb_password_encrypted'])

                # 2. Session-Ordner erstellen
                session_path = self.session_manager.create_session()
                logger.info(f"[User {user_id}] Session erstellt: {session_path.name}")

                # 3. DFB Scraping starten
                self.session_manager.update_session_metadata(
                    session_path,
                    status="scraping",
                    progress={"current": 0, "total": 0, "step": "DFB-Login..."}
                )

                scraper = DFBScraper(headless=True)

                # Progress Callback für Updates
                def progress_callback(current: int, total: int, message: str):
                    self.session_manager.update_session_metadata(
                        session_path,
                        progress={"current": current, "total": total, "step": message}
                    )

                try:
                    with scraper:
                        # Login
                        scraper.login(dfb_username, dfb_password)
                        logger.info(f"[User {user_id}] DFB-Login erfolgreich")

                        # Spiele scrapen
                        matches = scraper.scrape_all_matches(progress_callback=progress_callback)

                        if not matches:
                            logger.warning(f"[User {user_id}] Keine Spiele gefunden")
                            self.session_manager.update_session_metadata(
                                session_path,
                                status="completed",
                                progress={"current": 0, "total": 0, "step": "Keine Spiele gefunden"}
                            )
                            return {
                                "user_id": user_id,
                                "email": email,
                                "success": True,
                                "matches_count": 0,
                                "session_id": session_path.name
                            }

                        logger.info(f"[User {user_id}] {len(matches)} Spiele gescrapt")

                except Exception as e:
                    logger.error(f"[User {user_id}] Scraping fehlgeschlagen: {e}")
                    self.session_manager.update_session_metadata(
                        session_path,
                        status="error",
                        progress={"current": 0, "total": 0, "step": f"Scraping-Fehler: {str(e)}"}
                    )
                    raise

                # 4. Dokumente generieren
                self.session_manager.update_session_metadata(
                    session_path,
                    status="generating",
                    progress={"current": 0, "total": len(matches), "step": "Generiere Dokumente..."}
                )

                generator = SpesenGenerator(str(session_path))
                generated_files = []

                for i, match in enumerate(matches, 1):
                    try:
                        output_file = generator.generate_document(match)
                        generated_files.append(Path(output_file).name)
                        logger.info(f"[User {user_id}] Dokument {i}/{len(matches)} generiert")

                        self.session_manager.update_session_metadata(
                            session_path,
                            progress={
                                "current": i,
                                "total": len(matches),
                                "step": f"Generiere Dokument {i}/{len(matches)}"
                            }
                        )
                    except Exception as e:
                        logger.error(f"[User {user_id}] Fehler bei Dokument {i}: {e}")
                        continue

                # 5. Session abschließen
                self.session_manager.update_session_metadata(
                    session_path,
                    status="completed",
                    files=generated_files,
                    progress={
                        "current": len(generated_files),
                        "total": len(matches),
                        "step": "Abgeschlossen"
                    }
                )

                logger.info(f"[User {user_id}] Session erfolgreich abgeschlossen: {len(generated_files)} Dokumente")

                return {
                    "user_id": user_id,
                    "email": email,
                    "success": True,
                    "matches_count": len(matches),
                    "documents_count": len(generated_files),
                    "session_id": session_path.name
                }

            except Exception as e:
                logger.error(f"[User {user_id}] Fehler bei Session-Verarbeitung: {e}", exc_info=True)
                return {
                    "user_id": user_id,
                    "email": email,
                    "success": False,
                    "reason": str(e)
                }

    async def create_sessions_for_all_users(self):
        """
        Erstellt Sessions für alle User (wird um 3 Uhr ausgeführt)
        Maximal 4 Sessions laufen gleichzeitig
        """
        logger.info("=" * 80)
        logger.info("AUTOMATISCHE SESSION-ERSTELLUNG GESTARTET")
        logger.info(f"Zeitpunkt: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        logger.info("=" * 80)

        try:
            # Alle User aus der Datenbank holen
            users = get_all_users()
            logger.info(f"Gefunden: {len(users)} User")

            if not users:
                logger.info("Keine User gefunden - beende")
                return

            # Tasks für alle User erstellen
            tasks = [self.process_user_session(user) for user in users]

            # Alle Tasks parallel ausführen (Semaphore limitiert auf max_concurrent)
            results = await asyncio.gather(*tasks, return_exceptions=True)

            # Ergebnisse auswerten
            successful = sum(1 for r in results if isinstance(r, dict) and r.get("success"))
            failed = sum(1 for r in results if isinstance(r, dict) and not r.get("success"))
            errors = sum(1 for r in results if isinstance(r, Exception))

            logger.info("=" * 80)
            logger.info("AUTOMATISCHE SESSION-ERSTELLUNG ABGESCHLOSSEN")
            logger.info(f"Gesamt: {len(users)} User")
            logger.info(f"Erfolgreich: {successful}")
            logger.info(f"Fehlgeschlagen: {failed}")
            logger.info(f"Fehler: {errors}")
            logger.info("=" * 80)

        except Exception as e:
            logger.error(f"Kritischer Fehler bei automatischer Session-Erstellung: {e}", exc_info=True)

    def start(self):
        """Startet den Scheduler"""
        # Job für 3 Uhr morgens registrieren
        self.scheduler.add_job(
            self.create_sessions_for_all_users,
            CronTrigger(hour=3, minute=0),  # Täglich um 3:00 Uhr
            id="auto_session_creation",
            name="Automatische Session-Erstellung (3 Uhr)",
            replace_existing=True
        )

        self.scheduler.start()
        logger.info("Scheduler gestartet - Sessions werden täglich um 3:00 Uhr erstellt")
        logger.info(f"Nächste Ausführung: {self.scheduler.get_job('auto_session_creation').next_run_time}")

    def stop(self):
        """Stoppt den Scheduler"""
        self.scheduler.shutdown()
        logger.info("Scheduler gestoppt")

    async def trigger_now(self):
        """
        Manuelles Triggern für Testzwecke
        Kann über API aufgerufen werden
        """
        logger.info("Manueller Trigger - starte Session-Erstellung sofort")
        await self.create_sessions_for_all_users()


# Globale Scheduler-Instanz
_scheduler_instance = None


def get_scheduler() -> AutoSessionScheduler:
    """Gibt die globale Scheduler-Instanz zurück"""
    global _scheduler_instance
    if _scheduler_instance is None:
        _scheduler_instance = AutoSessionScheduler()
    return _scheduler_instance