from __future__ import annotations

import logging
from pathlib import Path

from app.config import LOG_ROOT


def configure_logging(level: str) -> None:
    LOG_ROOT.mkdir(parents=True, exist_ok=True)
    log_file = Path(LOG_ROOT) / "gateway.log"
    logging.basicConfig(
        level=getattr(logging, level.upper(), logging.INFO),
        format="%(asctime)s %(levelname)s %(name)s %(message)s",
        handlers=[
            logging.FileHandler(log_file, encoding="utf-8"),
            logging.StreamHandler(),
        ],
    )

