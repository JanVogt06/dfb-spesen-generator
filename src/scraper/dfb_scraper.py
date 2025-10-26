import sys
from pathlib import Path

from playwright.sync_api import sync_playwright, Page, Browser

# Füge src/ zum Path hinzu für Imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from utils.logger import setup_logger

logger = setup_logger("dfb_scraper")


class DFBScraper:
    """Scraper für DFB.net Ansetzungen"""

    def __init__(self, headless: bool = False, username: str = None, password: str = None):
        """
        Initialisiert den Scraper.

        Args:
            headless: Browser im Hintergrund starten (False = sichtbar für Debugging)
            username: DFB.net Benutzername
            password: DFB.net Passwort
        """
        self.headless = headless
        self.username = username
        self.password = password
        self.browser: Browser | None = None
        self.page: Page | None = None

    def start(self):
        """Startet den Browser"""
        logger.info("Starte Browser...")

        self.playwright = sync_playwright().start()
        self.browser = self.playwright.chromium.launch(headless=self.headless)
        self.page = self.browser.new_page()

        logger.info(f"Browser gestartet (headless={self.headless})")

    def stop(self):
        """Stoppt den Browser"""
        if self.browser:
            logger.info("Schließe Browser...")
            self.browser.close()
            self.playwright.stop()
            logger.info("Browser geschlossen")

    def open_dfbnet(self):
        """Öffnet die DFB.net Startseite"""
        logger.info("Öffne dfbnet.org...")

        # Weniger strikte Bedingung + längeres Timeout
        self.page.goto(
            "https://www.dfbnet.org",
            wait_until="domcontentloaded",
            timeout=60000
        )

        # Titel ausgeben
        title = self.page.title()
        logger.info(f"Seite geladen: {title}")

        return title

    def accept_cookies(self):
        """Akzeptiert das Cookie-Banner"""
        logger.info("Suche Cookie-Banner...")

        try:
            # Warte bis Cookie-Banner da ist
            logger.info("Warte auf Cookie-Banner (max 10 Sekunden)...")

            # Direkter, einfacherer Ansatz
            accept_button = self.page.locator('button:has-text("Alle akzeptieren")').first
            accept_button.wait_for(state="visible", timeout=10000)

            logger.info("Cookie-Banner gefunden, klicke...")
            accept_button.click()

            # Warte bis Banner weg ist
            self.page.wait_for_timeout(2000)
            logger.info("Cookies akzeptiert")

        except Exception as e:
            logger.warning(f"Cookie-Banner konnte nicht geklickt werden: {e}")
            logger.info("Fahre trotzdem fort...")

    def click_login(self):
        """Klickt auf den Anmelden-Button"""
        logger.info("Suche Anmelden-Button...")

        try:
            # Verschiedene Selektoren für "Anmelden" probieren
            selectors = [
                'button:has-text("Anmelden")',
                'a:has-text("Anmelden")',
                '[href*="login"]',
                'text=Anmelden',
                '.login',
                '#login'
            ]

            for selector in selectors:
                logger.info(f"Versuche Selektor: {selector}")
                try:
                    login_button = self.page.locator(selector).first
                    if login_button.is_visible(timeout=2000):
                        logger.info(f"Anmelden-Button gefunden mit: {selector}")
                        login_button.click()
                        self.page.wait_for_timeout(2000)
                        logger.info("Anmelden-Button geklickt")
                        return
                except:
                    continue

            logger.error("Anmelden-Button mit keinem Selektor gefunden")
            raise Exception("Anmelden-Button nicht gefunden")

        except Exception as e:
            logger.error(f"Fehler beim Klicken auf Anmelden: {e}")
            raise

    def login(self):
        """Füllt Login-Formular aus und meldet sich an"""
        logger.info("Fülle Login-Formular aus...")

        if not self.username or not self.password:
            logger.error("Username oder Passwort nicht gesetzt")
            raise ValueError("Username und Passwort müssen angegeben werden")

        try:
            # Warte bis Login-Formular sichtbar ist
            self.page.wait_for_selector('input[placeholder*="Benutzerkennung"], input[name*="username"]', timeout=10000)

            # Benutzername eingeben
            username_field = self.page.locator('input[placeholder*="Benutzerkennung"], input[name*="username"]').first
            username_field.fill(self.username)
            logger.info("Benutzername eingegeben")

            # Passwort eingeben
            password_field = self.page.locator('input[placeholder*="Passwort"], input[type="password"]').first
            password_field.fill(self.password)
            logger.info("Passwort eingegeben")

            # Anmelden-Button im Formular klicken
            login_submit = self.page.locator('button:has-text("ANMELDEN")').first
            login_submit.click()
            logger.info("Login-Button geklickt")

            # Warte und prüfe ob Login erfolgreich war
            logger.info("Warte auf Antwort vom Server...")
            self.page.wait_for_timeout(5000)

            # Prüfe mehrere Indikatoren für erfolgreichen Login
            current_url = self.page.url
            logger.info(f"Aktuelle URL nach Login: {current_url}")

            # 1. Prüfung: Sind wir auf einer anderen Domain?
            if "auth.dfbnet.org" not in current_url:
                logger.info("Login erfolgreich - Weitergeleitet zu DFBnet")
                return

            # 2. Prüfung: Gibt es eine Fehlermeldung?
            try:
                error_message = self.page.locator('.alert-error, .error, [class*="error"]').first
                if error_message.is_visible(timeout=1000):
                    error_text = error_message.inner_text()
                    logger.error(f"Login-Fehler: {error_text}")
                    raise Exception(f"Login fehlgeschlagen: {error_text}")
            except:
                pass

            # 3. Prüfung: Ist Login-Formular noch sichtbar?
            if self.page.locator('input[type="password"]').is_visible(timeout=2000):
                logger.error("Login fehlgeschlagen - Login-Formular noch sichtbar")
                raise Exception("Login fehlgeschlagen - Bitte Credentials prüfen")

            # Wenn wir hier sind, war Login erfolgreich
            logger.info("Login erfolgreich")

        except Exception as e:
            if "Login fehlgeschlagen" in str(e):
                raise
            logger.error(f"Fehler beim Login: {e}")
            raise

    def open_menu_if_needed(self):
        """Öffnet das Menü, falls es noch geschlossen ist"""
        logger.info("Prüfe ob Menü geöffnet werden muss...")

        try:
            # Suche nach dem Menü-Button (nur bei kleinen Bildschirmen sichtbar)
            menu_button = self.page.locator('#dfb-Menu-toggle, button[ng-click*="menuBtnClicked"]').first

            # Prüfe ob Button existiert und sichtbar ist
            if menu_button.is_visible(timeout=2000):
                logger.info("Menü-Button gefunden, klicke...")
                menu_button.click()
                self.page.wait_for_timeout(1000)
                logger.info("Menü geöffnet")
            else:
                logger.info("Menü-Button nicht sichtbar - Menü bereits offen")

        except Exception as e:
            logger.info("Menü-Button nicht gefunden - Menü wahrscheinlich bereits offen")
            # Kein Fehler werfen, da dies normal ist bei großen Bildschirmen

    def __enter__(self):
        """Context Manager: Automatisches Starten"""
        self.start()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context Manager: Automatisches Beenden"""
        self.stop()