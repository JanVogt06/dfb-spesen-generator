"""
DOCX Generator - Füllt Spesenabrechnung-Vorlage mit Daten
"""
from pathlib import Path
from docx import Document
from utils.logger import setup_logger
from utils.match_utils import parse_anpfiff, generate_filename_from_match, sanitize_team_name
from generator.spesen_calculator import calculate_spesen, format_spesen

logger = setup_logger("docx_generator")


class SpesenGenerator:
    """Generiert ausgefüllte Spesenabrechnung-Dokumente"""

    def __init__(self, template_path: str, output_dir: Path):
        """
        Initialisiert den Generator.

        Args:
            template_path: Pfad zur DOCX-Vorlage
            output_dir: Verzeichnis für generierte Dokumente (Path-Objekt vom SessionManager)
        """
        self.template_path = Path(template_path)
        self.output_dir = Path(output_dir)  # Verwende Session-spezifischen Ordner

        # KEIN Löschen mehr! Verwende den übergebenen Session-Ordner direkt
        self.output_dir.mkdir(exist_ok=True, parents=True)

        if not self.template_path.exists():
            raise FileNotFoundError(f"Vorlage nicht gefunden: {self.template_path}")

        logger.info(f"Generator initialisiert mit Vorlage: {self.template_path}")
        logger.info(f"Output-Verzeichnis: {self.output_dir}")

    def _determine_checkboxes(self, match_data: dict) -> dict:
        """Bestimmt welche Checkboxen aktiviert werden müssen."""
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

    def _get_referee_by_role(self, referees: list, role: str) -> dict:
        """Findet Schiedsrichter nach Rolle."""
        for ref in referees:
            if ref.get('rolle') == role:
                return ref
        return {}

    def _replace_placeholders(self, doc: Document, replacements: dict):
        """Ersetzt Platzhalter in allen Paragraphs und Tabellen."""
        # Ersetze in Paragraphs
        for paragraph in doc.paragraphs:
            for key, value in replacements.items():
                placeholder = f"{{{{{key}}}}}"
                if placeholder in paragraph.text:
                    full_text = paragraph.text
                    if placeholder in full_text:
                        new_text = full_text.replace(placeholder, str(value))
                        for run in paragraph.runs[1:]:
                            run.text = ''
                        if paragraph.runs:
                            paragraph.runs[0].text = new_text

        # Ersetze in Tabellen
        for table in doc.tables:
            for row in table.rows:
                for cell in row.cells:
                    for paragraph in cell.paragraphs:
                        for key, value in replacements.items():
                            placeholder = f"{{{{{key}}}}}"
                            if placeholder in paragraph.text:
                                full_text = paragraph.text
                                if placeholder in full_text:
                                    new_text = full_text.replace(placeholder, str(value))
                                    for run in paragraph.runs[1:]:
                                        run.text = ''
                                    if paragraph.runs:
                                        paragraph.runs[0].text = new_text

    def _calculate_spesen_for_match(self, match_data: dict, is_punktspiel: bool) -> tuple:
        """
        Berechnet Spesen für ein Spiel.

        Args:
            match_data: Match-Daten
            is_punktspiel: True wenn Punktspiel (Checkbox aktiviert)

        Returns:
            Tuple (sr_spesen_str, sra_spesen_str) - formatierte Strings oder leer
        """
        # Nur für Punktspiele berechnen
        if not is_punktspiel:
            return ("", "")

        spiel_info = match_data.get('spiel_info', {})
        spielklasse = spiel_info.get('spielklasse', '')
        mannschaftsart = spiel_info.get('mannschaftsart', '')

        sr_spesen, sra_spesen = calculate_spesen(spielklasse, mannschaftsart)

        sr_spesen_str = format_spesen(sr_spesen)
        sra_spesen_str = format_spesen(sra_spesen)

        if sr_spesen_str:
            logger.info(f"Spesen berechnet: SR={sr_spesen_str}, SRA={sra_spesen_str or '-'}")

        return (sr_spesen_str, sra_spesen_str)

    def generate_document(self, match_data: dict, output_filename: str = None) -> Path:
        """Generiert ein ausgefülltes Dokument für ein Spiel."""
        spiel_info = match_data.get('spiel_info', {})
        schiedsrichter = match_data.get('schiedsrichter', [])
        spielstaette = match_data.get('spielstaette', {})

        doc = Document(self.template_path)
        logger.debug(f"Neue Vorlage geladen für: {spiel_info.get('heim_team', '')} vs {spiel_info.get('gast_team', '')}")

        # Nutze zentrale parse_anpfiff Funktion
        datum, anstoss = parse_anpfiff(spiel_info.get('anpfiff', ''))
        checkboxes = self._determine_checkboxes(match_data)

        # Spesen berechnen (nur für Punktspiele)
        is_punktspiel = checkboxes['CHECKBOX_PUNKTSPIEL'] == '☑'
        sr_spesen_str, sra_spesen_str = self._calculate_spesen_for_match(match_data, is_punktspiel)

        sr = self._get_referee_by_role(schiedsrichter, 'SR')
        sra1 = self._get_referee_by_role(schiedsrichter, 'SRA 1')
        sra2 = self._get_referee_by_role(schiedsrichter, 'SRA 2')

        spielort_name = spielstaette.get('name', '')
        spielort_adresse = spielstaette.get('adresse', '')
        spielort_typ = spielstaette.get('platz_typ', '')
        spielort_komplett = f"{spielort_name}\n{spielort_adresse}\n{spielort_typ}"

        # SRA-Spesen nur eintragen wenn auch ein SRA angesetzt ist
        sra1_spesen = sra_spesen_str if sra1.get('name') else ''
        sra2_spesen = sra_spesen_str if sra2.get('name') else ''

        replacements = {
            **checkboxes,
            'HEIM_TEAM': spiel_info.get('heim_team', ''),
            'GAST_TEAM': spiel_info.get('gast_team', ''),
            'SPIELKLASSE': spiel_info.get('spielklasse', ''),
            'SPIELNUMMER': '',
            'DATUM': datum,
            'ANSTOSS': anstoss,
            'SPIELORT': spielort_komplett,
            'SR_NAME': sr.get('name', ''),
            'SR_STRASSE': sr.get('strasse', ''),
            'SR_PLZ_ORT': sr.get('plz_ort', ''),
            'SRA1_NAME': sra1.get('name', ''),
            'SRA1_STRASSE': sra1.get('strasse', ''),
            'SRA1_PLZ_ORT': sra1.get('plz_ort', ''),
            'SRA2_NAME': sra2.get('name', ''),
            'SRA2_STRASSE': sra2.get('strasse', ''),
            'SRA2_PLZ_ORT': sra2.get('plz_ort', ''),
            'SR_Spesen': sr_spesen_str,
            'SR1_Spesen': sra1_spesen,
            'SR2_Spesen': sra2_spesen,
        }

        self._replace_placeholders(doc, replacements)

        # Nutze zentrale Dateinamen-Generierung falls kein Filename übergeben
        if not output_filename:
            output_filename = generate_filename_from_match(match_data)

        output_path = self.output_dir / output_filename
        doc.save(output_path)

        logger.info(f"Dokument erstellt: {output_path}")
        return output_path

    def generate_all_documents(self, matches_data: list) -> list:
        """Generiert Dokumente für alle Spiele."""
        logger.info(f"Generiere {len(matches_data)} Dokumente...")

        generated_files = []
        for i, match_data in enumerate(matches_data, 1):
            try:
                logger.info(f"[{i}/{len(matches_data)}] Verarbeite: {match_data.get('spiel_info', {}).get('heim_team', 'Unbekannt')} vs {match_data.get('spiel_info', {}).get('gast_team', 'Unbekannt')}")
                output_path = self.generate_document(match_data)
                generated_files.append(output_path)
                logger.info(f"[{i}/{len(matches_data)}] ✓ Erstellt")
            except Exception as e:
                logger.error(f"[{i}/{len(matches_data)}] ✗ Fehler: {e}")
                continue

        logger.info(f"Erfolgreich {len(generated_files)}/{len(matches_data)} Dokumente generiert")
        return generated_files