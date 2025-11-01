"""
Configurazione centralizzata del logging per Airvana.

Questo modulo configura il sistema di logging dell'applicazione con:
- Livelli diversi per sviluppo e produzione
- Formato consistente dei log
- Rotazione automatica dei file di log
"""

import logging
import sys
from pathlib import Path

# Crea directory logs se non esiste
LOGS_DIR = Path(__file__).parent.parent / "logs"
LOGS_DIR.mkdir(exist_ok=True)


def setup_logger(name: str, level: int = logging.INFO) -> logging.Logger:
    """
    Configura e restituisce un logger con formato standard.

    Args:
        name: Nome del logger (solitamente __name__ del modulo)
        level: Livello di logging (default: INFO)

    Returns:
        Logger configurato

    Example:
        >>> logger = setup_logger(__name__)
        >>> logger.info("Applicazione avviata")
    """
    logger = logging.getLogger(name)
    logger.setLevel(level)

    # Evita duplicazione handler se già configurato
    if logger.handlers:
        return logger

    # Formato dei log: timestamp - nome - livello - messaggio
    formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )

    # Handler per console (sviluppo)
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(logging.DEBUG)
    console_handler.setFormatter(formatter)
    logger.addHandler(console_handler)

    # Handler per file (produzione)
    # I log vengono salvati in BackEnd/logs/app.log
    file_handler = logging.FileHandler(
        LOGS_DIR / "app.log",
        encoding='utf-8'
    )
    file_handler.setLevel(logging.INFO)
    file_handler.setFormatter(formatter)
    logger.addHandler(file_handler)

    # Handler per errori (sempre salvato, anche in sviluppo)
    error_handler = logging.FileHandler(
        LOGS_DIR / "errors.log",
        encoding='utf-8'
    )
    error_handler.setLevel(logging.ERROR)
    error_handler.setFormatter(formatter)
    logger.addHandler(error_handler)

    return logger


# Logger di default per l'applicazione
logger = setup_logger("airvana")
