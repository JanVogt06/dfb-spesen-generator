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

        # Browser-Kontext mit fester Größe erstellen
        context = self.browser.new_context(
            viewport={'width': 1920, 'height': 1080},
            screen={'width': 1920, 'height': 1080}
        )
        self.page = context.new_page()

        logger.info(f"Browser gestartet (headless={self.headless}, 1920x1080)")

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

    def navigate_to_schiriansetzung(self):
        """Navigiert zu Schiriansetzung -> Eigene Daten"""
        logger.info("Navigiere zu Schiriansetzung...")

        try:
            # Schritt 1: Auf "Schiriansetzung" klicken
            schiri_menu = self.page.locator('text=Schiriansetzung').first
            schiri_menu.wait_for(state="visible", timeout=5000)
            logger.info("Schiriansetzung-Menüpunkt gefunden, klicke...")
            schiri_menu.click()

            # Warte bis Untermenü erscheint
            self.page.wait_for_timeout(1000)

            # Schritt 2: Auf "Eigene Daten" klicken
            eigene_daten = self.page.locator('text=Eigene Daten').first
            eigene_daten.wait_for(state="visible", timeout=5000)
            logger.info("Eigene Daten gefunden, klicke...")

            # Neuen Tab erwarten
            with self.page.context.expect_page() as new_page_info:
                eigene_daten.click()

            # Wechsle zum neuen Tab
            new_page = new_page_info.value
            new_page.wait_for_load_state("domcontentloaded")

            # Update page reference
            self.page = new_page

            logger.info(f"Neue Seite geöffnet: {self.page.url}")
            logger.info("Erfolgreich zu Eigene Daten navigiert")

        except Exception as e:
            logger.error(f"Fehler beim Navigieren zu Schiriansetzung: {e}")
            raise

    def get_all_matches(self):
        """Sammelt alle Spiele von der Seite"""
        logger.info("Sammle alle Spiele...")

        try:
            # Warte bis Spiele geladen sind
            self.page.wait_for_timeout(2000)

            # Finde alle Spiel-Container (jeder Container = 1 Spiel)
            match_containers = self.page.locator('sria-matches-match-list-item').all()

            anzahl_spiele = len(match_containers)
            logger.info(f"Gefunden: {anzahl_spiele} Spiele")

            return anzahl_spiele

        except Exception as e:
            logger.error(f"Fehler beim Sammeln der Spiele: {e}")
            raise

    def open_mehr_info_modal(self, index: int):
        """Öffnet das 'Mehr Info' Modal für ein bestimmtes Spiel"""
        logger.info(f"Öffne Mehr Info Modal für Spiel {index + 1}...")

        try:
            # Finde alle Spiel-Container
            match_containers = self.page.locator('sria-matches-match-list-item').all()

            if index >= len(match_containers):
                raise Exception(f"Spiel {index + 1} nicht gefunden")

            # Hole den spezifischen Container
            container = match_containers[index]

            # Finde "Mehr Info" Button innerhalb dieses Containers
            # Suche nach sria-matches-game-details-modal
            mehr_info = container.locator('sria-matches-game-details-modal').first

            if mehr_info.is_visible():
                mehr_info.click()
                # Warte bis Modal geladen ist
                self.page.wait_for_timeout(1000)
                logger.info("Mehr Info Modal geöffnet")
            else:
                raise Exception("Mehr Info Button nicht sichtbar")

        except Exception as e:
            logger.error(f"Fehler beim Öffnen des Modals: {e}")
            raise

    def close_modal(self):
        """Schließt ein geöffnetes Modal"""
        logger.info("Schließe Modal...")

        try:
            # Suche nach dem Schließen-Button (X)
            close_button = self.page.locator('button[aria-label="Close"], .modal-close, [class*="close"]').first

            if close_button.is_visible(timeout=2000):
                close_button.click()
                self.page.wait_for_timeout(500)
                logger.info("Modal geschlossen")
            else:
                # Alternative: ESC-Taste drücken
                self.page.keyboard.press('Escape')
                self.page.wait_for_timeout(500)
                logger.info("Modal mit ESC geschlossen")

        except Exception as e:
            logger.warning(f"Fehler beim Schließen des Modals: {e}")
            # Versuche ESC als Fallback
            self.page.keyboard.press('Escape')
            self.page.wait_for_timeout(500)

    def extract_match_info_from_modal(self):
        """Extrahiert Spielinformationen aus dem geöffneten 'Mehr Info' Modal"""
        logger.info("Extrahiere Spielinformationen aus Modal...")

        try:
            match_info = {}

            # Anpfiff (Datum + Uhrzeit)
            anpfiff = self.page.locator('text=/Samstag|Sonntag|Montag|Dienstag|Mittwoch|Donnerstag|Freitag/').first
            if anpfiff.is_visible(timeout=2000):
                match_info['anpfiff'] = anpfiff.inner_text().strip()

            # Heim-Team
            heim_team = self.page.locator('text=Heim').locator('..').locator('.fw-700').first
            if heim_team.is_visible(timeout=1000):
                match_info['heim_team'] = heim_team.inner_text().strip()

            # Gast-Team
            gast_team = self.page.locator('text=Gast').locator('..').locator('.fw-700').first
            if gast_team.is_visible(timeout=1000):
                match_info['gast_team'] = gast_team.inner_text().strip()

            # Mannschaftsart
            mannschaftsart = self.page.locator('text=Mannschaftsart').locator('..').locator('.fw-700').first
            if mannschaftsart.is_visible(timeout=1000):
                match_info['mannschaftsart'] = mannschaftsart.inner_text().strip()

            # Spielklasse
            spielklasse = self.page.locator('text=Spielklasse').locator('..').locator('.fw-700').first
            if spielklasse.is_visible(timeout=1000):
                match_info['spielklasse'] = spielklasse.inner_text().strip()

            # Staffel
            staffel = self.page.locator('text=Staffel').locator('..').locator('.fw-700').first
            if staffel.is_visible(timeout=1000):
                match_info['staffel'] = staffel.inner_text().strip()

            # Spieltag
            spieltag = self.page.locator('text=Spieltag').locator('..').locator('.fw-700').first
            if spieltag.is_visible(timeout=1000):
                match_info['spieltag'] = spieltag.inner_text().strip()

            return match_info

        except Exception as e:
            logger.error(f"Fehler beim Extrahieren der Spielinformationen: {e}")
            return {}

    def open_referee_modal(self, match_index: int):
        """Öffnet das Schiedsrichter-Kontakte Modal für ein Spiel"""
        logger.info(f"Öffne Schiedsrichter-Modal für Spiel {match_index + 1}...")

        try:
            # Finde den Spiel-Container
            match_containers = self.page.locator('sria-matches-match-list-item').all()

            if match_index >= len(match_containers):
                raise Exception(f"Spiel {match_index + 1} nicht gefunden")

            container = match_containers[match_index]

            # Finde das Schiedsrichter-Modal Element
            referee_modal = container.locator('sria-matches-referees-contact-details-modal').first

            if referee_modal.is_visible():
                referee_modal.click()
                self.page.wait_for_timeout(1000)
                logger.info("Schiedsrichter-Modal geöffnet")
            else:
                raise Exception("Schiedsrichter-Modal Button nicht sichtbar")

        except Exception as e:
            logger.error(f"Fehler beim Öffnen des Schiedsrichter-Modals: {e}")
            raise

    def extract_referee_contacts(self):
        """Extrahiert Schiedsrichter-Kontaktdaten aus dem geöffneten Modal"""
        logger.info("Extrahiere Schiedsrichter-Kontakte...")

        try:
            referees = []

            # Finde alle Schiedsrichter-Blöcke
            referee_items = self.page.locator('sria-matches-referee-contact-details-list-item').all()

            for item in referee_items:
                try:
                    referee_data = {}

                    # Rolle und Name aus dem ersten fw-700 div (z.B. "SR Louis Gaudes" oder "SRA 1 Jan Vogt")
                    header = item.locator('.mb-2.fw-700').first
                    if header.is_visible(timeout=500):
                        header_text = header.inner_text().strip()
                        # Parse "SR Louis Gaudes" oder "SRA 1 Jan Vogt"
                        parts = header_text.split(maxsplit=2)
                        if len(parts) >= 2:
                            # Wenn es "SRA 1" ist, kombiniere die ersten zwei Teile
                            if parts[0] in ['SR', 'SRA', 'Beo']:
                                if parts[0] == 'SRA' and len(parts) >= 3:
                                    referee_data['rolle'] = f"{parts[0]} {parts[1]}"  # "SRA 1"
                                    referee_data['name'] = parts[2] if len(parts) > 2 else ''
                                else:
                                    referee_data['rolle'] = parts[0]  # "SR"
                                    referee_data['name'] = ' '.join(parts[1:])

                    # Telefon
                    telefon_row = item.locator('text=/Telefon \\(mobil\\)|Telefon \\(privat\\)/').locator('..')
                    if telefon_row.is_visible(timeout=500):
                        telefon_col = telefon_row.locator('.col-7, .col-sm-6').last
                        if telefon_col.is_visible(timeout=500):
                            telefon_link = telefon_col.locator('a')
                            if telefon_link.is_visible(timeout=500):
                                referee_data['telefon'] = telefon_link.inner_text().strip()

                    # E-Mail
                    email_row = item.locator('text=E-Mail').locator('..')
                    if email_row.is_visible(timeout=500):
                        email_col = email_row.locator('.col-7, .col-sm-6').last
                        if email_col.is_visible(timeout=500):
                            email_link = email_col.locator('a')
                            if email_link.is_visible(timeout=500):
                                referee_data['email'] = email_link.inner_text().strip()

                    # Straße
                    strasse_row = item.locator('text=Straße, Nr.').locator('..')
                    if strasse_row.is_visible(timeout=500):
                        strasse_col = strasse_row.locator('.col-7, .col-sm-6').last
                        if strasse_col.is_visible(timeout=500):
                            referee_data['strasse'] = strasse_col.inner_text().strip()

                    # PLZ, Ort
                    plz_row = item.locator('text=PLZ, Ort').locator('..')
                    if plz_row.is_visible(timeout=500):
                        plz_col = plz_row.locator('.col-7, .col-sm-6').last
                        if plz_col.is_visible(timeout=500):
                            referee_data['plz_ort'] = plz_col.inner_text().strip()

                    if referee_data and 'rolle' in referee_data:
                        referees.append(referee_data)

                except Exception as e:
                    logger.warning(f"Fehler beim Extrahieren eines Schiedsrichters: {e}")
                    continue

            logger.info(f"Extrahiert: {len(referees)} Schiedsrichter")
            return referees

        except Exception as e:
            logger.error(f"Fehler beim Extrahieren der Schiedsrichter-Kontakte: {e}")
            return []

    def open_venue_modal(self, match_index: int):
        """Öffnet das Spielstätte-Modal für ein Spiel"""
        logger.info(f"Öffne Spielstätte-Modal für Spiel {match_index + 1}...")

        try:
            # Finde den Spiel-Container
            match_containers = self.page.locator('sria-matches-match-list-item').all()

            if match_index >= len(match_containers):
                raise Exception(f"Spiel {match_index + 1} nicht gefunden")

            container = match_containers[match_index]

            # Finde das Spielstätte-Modal Element (mit Geotag-Icon)
            venue_modal = container.locator('sria-matches-venue-details-modal').first

            if venue_modal.is_visible():
                venue_modal.click()
                self.page.wait_for_timeout(1000)
                logger.info("Spielstätte-Modal geöffnet")
            else:
                raise Exception("Spielstätte-Modal Button nicht sichtbar")

        except Exception as e:
            logger.error(f"Fehler beim Öffnen des Spielstätte-Modals: {e}")
            raise

    def extract_venue_info(self):
        """Extrahiert Spielstätten-Informationen aus dem geöffneten Modal"""
        logger.info("Extrahiere Spielstätten-Informationen...")

        try:
            venue_info = {}

            # Spielstätte Name - suche nach dem Text direkt unter der Überschrift
            # Der Name steht im Modal-Body, nach "SPIELSTÄTTE"
            venue_name_elem = self.page.locator('#modal-subtitle, .subtitle').first
            if venue_name_elem.is_visible(timeout=1000):
                venue_info['name'] = venue_name_elem.inner_text().strip()

            # Falls leer, versuche alternativen Selektor
            if not venue_info.get('name'):
                # Suche nach dem span mit dem Venue-Namen (z.B. "BSA Ingolstadt Süd-Ost, Stadion")
                venue_span = self.page.locator('dfb-geotag-icon').locator('..').locator('..').locator('span').first
                if venue_span.is_visible(timeout=1000):
                    venue_info['name'] = venue_span.inner_text().strip()

            # Adresse
            address = self.page.locator('dfb-geotag-icon').locator('..').locator('..').locator('div').filter(
                has_text='/Str|straße|platz/').first
            if address.is_visible(timeout=1000):
                venue_info['adresse'] = address.inner_text().strip()
            else:
                # Alternativer Ansatz: Suche nach der Adresszeile
                address_lines = self.page.locator('text=/\\d{5}/').all()  # Suche nach PLZ (5 Ziffern)
                if address_lines:
                    for line in address_lines:
                        text = line.inner_text().strip()
                        if len(text) > 5:  # Mehr als nur PLZ
                            venue_info['adresse'] = text
                            break

            # Rasenplatz / Kunstrasen
            platz_typ = self.page.locator('text=/Rasenplatz|Kunstrasen|Hartplatz/').first
            if platz_typ.is_visible(timeout=500):
                venue_info['platz_typ'] = platz_typ.inner_text().strip()

            return venue_info

        except Exception as e:
            logger.error(f"Fehler beim Extrahieren der Spielstätten-Info: {e}")
            return {}

    def __enter__(self):
        """Context Manager: Automatisches Starten"""
        self.start()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context Manager: Automatisches Beenden"""
        self.stop()