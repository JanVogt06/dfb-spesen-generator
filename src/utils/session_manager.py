"""
Session Manager - Verwaltet Session-basierte Ausgabeordner fuer Web-Anfragen
VERBESSERT: Findet automatisch das Projekt-Root
"""
import os
import secrets
from datetime import datetime
from pathlib import Path
import json
from typing import Dict, List, Optional

from utils.logger import setup_logger

logger = setup_logger("session_manager")


def find_project_root() -> Path:
    """
    Findet das Projekt-Root-Verzeichnis (wo .env liegt).
    Sucht von der aktuellen Datei aus nach oben.
    """
    current = Path(__file__).resolve()

    # Gehe von utils/session_manager.py aus nach oben
    # utils/session_manager.py -> utils/ -> src/ -> projekt-root/
    for parent in [current.parent, current.parent.parent, current.parent.parent.parent]:
        # Pruefe ob .env oder .git existiert (typische Root-Marker)
        if (parent / ".env").exists() or (parent / ".git").exists():
            return parent

    # Fallback: 2 Ebenen hoch von dieser Datei
    # session_manager.py liegt in src/utils/
    # -> src/utils/ -> src/ -> projekt-root/
    return current.parent.parent.parent


class SessionManager:
    """Verwaltet Session-Ordner fuer parallele Web-Anfragen"""

    def __init__(self, base_output_dir: str = None):
        """
        Initialisiert den Session Manager.

        Args:
            base_output_dir: Basis-Verzeichnis fuer alle Sessions.
                           Falls None oder relativ: Wird automatisch im Projekt-Root platziert.
        """
        if base_output_dir is None:
            base_output_dir = "output"

        base_path = Path(base_output_dir)

        # Wenn relativer Pfad: Kombiniere mit Projekt-Root
        if not base_path.is_absolute():
            project_root = find_project_root()
            base_path = project_root / base_output_dir
            logger.info(f"Relativer Pfad erkannt. Verwende Projekt-Root: {project_root}")

        self.base_output_dir = base_path
        self.base_output_dir.mkdir(exist_ok=True, parents=True)
        logger.info(f"Session Manager initialisiert mit Basis-Verzeichnis: {self.base_output_dir.resolve()}")

    def create_session(self) -> Path:
        """
        Erstellt einen eindeutigen Session-Ordner.

        Returns:
            Pfad zum erstellten Session-Ordner
        """
        # Generiere eindeutigen Session-Namen
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        session_id = secrets.token_hex(4)  # 8-stellige Hex-ID
        session_name = f"session_{timestamp}_{session_id}"

        # Erstelle Session-Ordner
        session_path = self.base_output_dir / session_name
        session_path.mkdir(exist_ok=True)

        # Erstelle Metadata-Datei
        metadata = {
            "session_id": session_name,
            "created_at": datetime.now().isoformat(),
            "status": "in_progress",
            "files": [],
            "progress": {
                "current": 0,
                "total": 0,
                "step": "Initialisierung..."
            }
        }

        metadata_path = session_path / "metadata.json"
        with open(metadata_path, 'w', encoding='utf-8') as f:
            json.dump(metadata, f, ensure_ascii=False, indent=2)

        logger.info(f"Session erstellt: {session_name} in {session_path.resolve()}")
        return session_path

    def update_session_metadata(
        self,
        session_path: Path,
        status: str = None,
        files: List[str] = None,
        progress: Dict = None
    ):
        """
        Aktualisiert die Metadata einer Session.

        Args:
            session_path: Pfad zum Session-Ordner
            status: Neuer Status (optional)
            files: Liste der generierten Dateien (optional)
            progress: Fortschritts-Info (optional) - Dict mit current, total, step
        """
        metadata_path = session_path / "metadata.json"

        # Lade existierende Metadata
        with open(metadata_path, 'r', encoding='utf-8') as f:
            metadata = json.load(f)

        # Aktualisiere Felder
        if status:
            metadata["status"] = status
        if files:
            metadata["files"] = files
        if progress:
            metadata["progress"] = progress

        metadata["updated_at"] = datetime.now().isoformat()

        # Speichere aktualisierte Metadata
        with open(metadata_path, 'w', encoding='utf-8') as f:
            json.dump(metadata, f, ensure_ascii=False, indent=2)

        logger.debug(f"Session Metadata aktualisiert: {session_path.name}")

    def get_session_files(self, session_path: Path) -> List[Dict[str, any]]:
        """
        Gibt Liste aller Dateien in einer Session zurueck.

        Args:
            session_path: Pfad zum Session-Ordner

        Returns:
            Liste mit Datei-Informationen
        """
        files = []

        # Finde alle DOCX-Dateien
        for file_path in session_path.glob("*.docx"):
            files.append({
                "name": file_path.name,
                "path": str(file_path.relative_to(self.base_output_dir)),
                "size": file_path.stat().st_size,
                "created_at": datetime.fromtimestamp(file_path.stat().st_ctime).isoformat()
            })

        # Finde JSON-Datei
        for file_path in session_path.glob("spesen_data.json"):
            files.append({
                "name": file_path.name,
                "path": str(file_path.relative_to(self.base_output_dir)),
                "size": file_path.stat().st_size,
                "created_at": datetime.fromtimestamp(file_path.stat().st_ctime).isoformat()
            })

        return files

    def get_session_by_id(self, session_id: str) -> Optional[Path]:
        """
        Findet Session-Ordner anhand der Session-ID.

        Args:
            session_id: Session-ID

        Returns:
            Pfad zum Session-Ordner oder None
        """
        session_path = self.base_output_dir / session_id
        if session_path.exists() and session_path.is_dir():
            return session_path
        return None