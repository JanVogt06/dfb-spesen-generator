"""
Session Manager - Verwaltet Session-basierte Ausgabeordner für Web-Anfragen
"""
import os
import secrets
from datetime import datetime
from pathlib import Path
import json
from typing import Dict, List

from utils.logger import setup_logger

logger = setup_logger("session_manager")


class SessionManager:
    """Verwaltet Session-Ordner für parallele Web-Anfragen"""

    def __init__(self, base_output_dir: str = "output"):
        """
        Initialisiert den Session Manager.

        Args:
            base_output_dir: Basis-Verzeichnis für alle Sessions
        """
        self.base_output_dir = Path(base_output_dir)
        self.base_output_dir.mkdir(exist_ok=True, parents=True)
        logger.info(f"Session Manager initialisiert mit Basis-Verzeichnis: {self.base_output_dir}")

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
            "files": []
        }

        metadata_path = session_path / "metadata.json"
        with open(metadata_path, 'w', encoding='utf-8') as f:
            json.dump(metadata, f, ensure_ascii=False, indent=2)

        logger.info(f"Session erstellt: {session_name}")
        return session_path

    def update_session_metadata(self, session_path: Path, status: str = None, files: List[str] = None):
        """
        Aktualisiert die Metadata einer Session.

        Args:
            session_path: Pfad zum Session-Ordner
            status: Neuer Status (optional)
            files: Liste der generierten Dateien (optional)
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

        metadata["updated_at"] = datetime.now().isoformat()

        # Speichere aktualisierte Metadata
        with open(metadata_path, 'w', encoding='utf-8') as f:
            json.dump(metadata, f, ensure_ascii=False, indent=2)

        logger.info(f"Session Metadata aktualisiert: {session_path.name}")

    def get_session_files(self, session_path: Path) -> List[Dict[str, any]]:
        """
        Gibt Liste aller Dateien in einer Session zurück.

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

    def get_session_by_id(self, session_id: str) -> Path:
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