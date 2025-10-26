import logging
import sys


def setup_logger(name: str = "dfb_scraper", level: int = logging.INFO) -> logging.Logger:
    """
    Richtet einen einfachen Logger ein.

    Args:
        name: Name des Loggers
        level: Log-Level (default: INFO)

    Returns:
        Konfigurierter Logger
    """
    logger = logging.getLogger(name)
    logger.setLevel(level)

    # Verhindere doppelte Handler
    if logger.handlers:
        return logger

    # Console Handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(level)

    # Format: [2025-01-15 14:30:45] INFO - Nachricht
    formatter = logging.Formatter(
        '[%(asctime)s] %(levelname)s - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    console_handler.setFormatter(formatter)

    logger.addHandler(console_handler)

    return logger