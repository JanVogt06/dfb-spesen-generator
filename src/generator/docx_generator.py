"""
DOCX Generator - Füllt Spesenabrechnung-Vorlage mit Daten
"""
from pathlib import Path
from docx import Document
from utils.logger import setup_logger

logger = setup_logger("docx_generator")


class SpesenGenerator:
    """Generiert ausgefüllte Spesenabrechnung-Dokumente"""

    def __init__(self, template_path: str, output_dir: str = "output"):
        """
        Initialisiert den Generator.

        Args:
            template_path: Pfad zur DOCX-Vorlage
            output_dir: Verzeichnis für generierte Dokumente
        """
        self.template_path = Path(template_path)
        self.output_dir = Path(output_dir)

        # Lösche alten Output-Ordner und erstelle ihn neu
        if self.output_dir.exists():
            import shutil
            shutil.rmtree(self.output_dir)
            logger.info(f"Alter Output-Ordner gelöscht: {self.output_dir}")

        self.output_dir.mkdir(exist_ok=True)
        logger.info(f"Output-Ordner erstellt: {self.output_dir}")

        if not self.template_path.exists():
            raise FileNotFoundError(f"Vorlage nicht gefunden: {self.template_path}")

        logger.info(f"Generator initialisiert mit Vorlage: {self.template_path}")

    def _determine_checkboxes(self, match_data: dict) -> dict:
        """
        Bestimmt welche Checkboxen aktiviert werden müssen.

        Args:
            match_data: Spieldaten aus JSON

        Returns:
            Dictionary mit Checkbox-Status
        """
        spiel_info = match_data.get('spiel_info', {})

        checkboxes = {
            'CHECKBOX_PUNKTSPIEL': '☐',
            'CHECKBOX_POKALSPIEL': '☐',
            'CHECKBOX_ENTSCHEIDUNG': '☐',
            'CHECKBOX_FREUNDSCHAFT': '☐',
            'CHECKBOX_MAENNER': '☐',
            'CHECKBOX_FRAUEN': '☐',
            'CHECKBOX_MAEDCHEN': '☐',
            'CHECKBOX_ALTE_HERREN': '☐',
            'CHECKBOX_SONSTIGE': '☐',
            'CHECKBOX_A_JUN': '☐',
            'CHECKBOX_B_JUN': '☐',
            'CHECKBOX_C_JUN': '☐',
            'CHECKBOX_D_JUN': '☐',
            'CHECKBOX_E_JUN': '☐',
            'CHECKBOX_F_JUN': '☐',
        }

        # Spielklasse prüfen
        spielklasse = spiel_info.get('spielklasse', '').lower()
        if 'pokal' in spielklasse:
            checkboxes['CHECKBOX_POKALSPIEL'] = '☑'
        elif 'freundschaft' in spielklasse:
            checkboxes['CHECKBOX_FREUNDSCHAFT'] = '☑'
        else:
            checkboxes['CHECKBOX_PUNKTSPIEL'] = '☑'

        # Mannschaftsart prüfen
        mannschaftsart = spiel_info.get('mannschaftsart', '').lower()
        if 'herren' in mannschaftsart or 'männer' in mannschaftsart:
            if 'alte' in mannschaftsart:
                checkboxes['CHECKBOX_ALTE_HERREN'] = '☑'
            else:
                checkboxes['CHECKBOX_MAENNER'] = '☑'
        elif 'frauen' in mannschaftsart:
            checkboxes['CHECKBOX_FRAUEN'] = '☑'
        elif 'mädchen' in mannschaftsart:
            checkboxes['CHECKBOX_MAEDCHEN'] = '☑'
        elif 'a-junioren' in mannschaftsart:
            checkboxes['CHECKBOX_A_JUN'] = '☑'
        elif 'b-junioren' in mannschaftsart:
            checkboxes['CHECKBOX_B_JUN'] = '☑'
        elif 'c-junioren' in mannschaftsart:
            checkboxes['CHECKBOX_C_JUN'] = '☑'
        elif 'd-junioren' in mannschaftsart:
            checkboxes['CHECKBOX_D_JUN'] = '☑'
        elif 'e-junioren' in mannschaftsart:
            checkboxes['CHECKBOX_E_JUN'] = '☑'
        elif 'f-junioren' in mannschaftsart:
            checkboxes['CHECKBOX_F_JUN'] = '☑'
        else:
            checkboxes['CHECKBOX_SONSTIGE'] = '☑'

        return checkboxes

    def _parse_anpfiff(self, anpfiff_str: str) -> tuple:
        """
        Parsed Anpfiff-String in Datum und Uhrzeit.

        Args:
            anpfiff_str: z.B. "Samstag · 08.11.2025 · 13:00 Uhr"

        Returns:
            Tuple (datum, uhrzeit)
        """
        try:
            parts = anpfiff_str.split('·')
            if len(parts) >= 3:
                datum = parts[1].strip()
                uhrzeit = parts[2].replace('Uhr', '').strip()
                return datum, uhrzeit
        except:
            pass
        return anpfiff_str, ''

    def _get_referee_by_role(self, referees: list, role: str) -> dict:
        """
        Findet Schiedsrichter nach Rolle.

        Args:
            referees: Liste aller Schiedsrichter
            role: Rolle (z.B. "SR", "SRA 1", "SRA 2")

        Returns:
            Schiedsrichter-Dict oder leeres Dict
        """
        for ref in referees:
            if ref.get('rolle') == role:
                return ref
        return {}

    def _replace_placeholders(self, doc: Document, replacements: dict):
        """
        Ersetzt Platzhalter in allen Paragraphs und Tabellen.

        Args:
            doc: Document-Objekt
            replacements: Dictionary mit Platzhaltern und Werten
        """
        # Ersetze in Paragraphs
        for paragraph in doc.paragraphs:
            for key, value in replacements.items():
                if f"{{{{{key}}}}}" in paragraph.text:
                    for run in paragraph.runs:
                        if f"{{{{{key}}}}}" in run.text:
                            run.text = run.text.replace(f"{{{{{key}}}}}", str(value))

        # Ersetze in Tabellen
        for table in doc.tables:
            for row in table.rows:
                for cell in row.cells:
                    for paragraph in cell.paragraphs:
                        for key, value in replacements.items():
                            if f"{{{{{key}}}}}" in paragraph.text:
                                for run in paragraph.runs:
                                    if f"{{{{{key}}}}}" in run.text:
                                        run.text = run.text.replace(f"{{{{{key}}}}}", str(value))

    def generate_document(self, match_data: dict, output_filename: str = None) -> Path:
        """
        Generiert ein ausgefülltes Dokument für ein Spiel.

        Args:
            match_data: Spieldaten aus JSON
            output_filename: Optionaler Dateiname (wird sonst automatisch generiert)

        Returns:
            Pfad zur generierten Datei
        """
        spiel_info = match_data.get('spiel_info', {})
        schiedsrichter = match_data.get('schiedsrichter', [])
        spielstaette = match_data.get('spielstaette', {})

        # Lade Vorlage
        doc = Document(self.template_path)

        # Datum und Uhrzeit parsen
        datum, anstoss = self._parse_anpfiff(spiel_info.get('anpfiff', ''))

        # Checkboxen bestimmen
        checkboxes = self._determine_checkboxes(match_data)

        # Schiedsrichter nach Rolle finden
        sr = self._get_referee_by_role(schiedsrichter, 'SR')
        sra1 = self._get_referee_by_role(schiedsrichter, 'SRA 1')
        sra2 = self._get_referee_by_role(schiedsrichter, 'SRA 2')

        # Erstelle Replacements-Dictionary
        replacements = {
            # Checkboxen
            **checkboxes,

            # Spielinformationen
            'HEIM_TEAM': spiel_info.get('heim_team', ''),
            'GAST_TEAM': spiel_info.get('gast_team', ''),
            'SPIELKLASSE': spiel_info.get('spielklasse', ''),
            'SPIELNUMMER': '',  # Wird später manuell eingetragen
            'DATUM': datum,
            'ANSTOSS': anstoss,
            'SPIELORT': spielstaette.get('name', ''),

            # Schiedsrichter (SR)
            'SR_NAME': sr.get('name', ''),
            'SR_STRASSE': sr.get('strasse', ''),
            'SR_PLZ_ORT': sr.get('plz_ort', ''),

            # Schiedsrichter-Assistent 1
            'SRA1_NAME': sra1.get('name', ''),
            'SRA1_STRASSE': sra1.get('strasse', ''),
            'SRA1_PLZ_ORT': sra1.get('plz_ort', ''),

            # Schiedsrichter-Assistent 2
            'SRA2_NAME': sra2.get('name', ''),
            'SRA2_STRASSE': sra2.get('strasse', ''),
            'SRA2_PLZ_ORT': sra2.get('plz_ort', ''),

            # Spesen (leer lassen für manuelle Eingabe)
            'SR_Spesen': '',
            'SR1_Spesen': '',
            'SR2_Spesen': '',
        }

        # Ersetze alle Platzhalter
        self._replace_placeholders(doc, replacements)

        # Generiere Dateinamen falls nicht angegeben
        if not output_filename:
            heim = spiel_info.get('heim_team', 'Heim').replace('/', '-')
            gast = spiel_info.get('gast_team', 'Gast').replace('/', '-')
            datum_clean = datum.replace('.', '-')
            output_filename = f"Spesen_{heim}_vs_{gast}_{datum_clean}.docx"

        # Speichere Dokument
        output_path = self.output_dir / output_filename
        doc.save(output_path)

        logger.info(f"Dokument erstellt: {output_path}")
        return output_path

    def generate_all_documents(self, matches_data: list) -> list:
        """
        Generiert Dokumente für alle Spiele.

        Args:
            matches_data: Liste aller Spieldaten

        Returns:
            Liste der generierten Dateipfade
        """
        logger.info(f"Generiere {len(matches_data)} Dokumente...")

        generated_files = []
        for i, match_data in enumerate(matches_data, 1):
            try:
                output_path = self.generate_document(match_data)
                generated_files.append(output_path)
                logger.info(f"[{i}/{len(matches_data)}] ✓ Erstellt")
            except Exception as e:
                logger.error(f"[{i}/{len(matches_data)}] ✗ Fehler: {e}")
                continue

        logger.info(f"Erfolgreich {len(generated_files)}/{len(matches_data)} Dokumente generiert")
        return generated_files