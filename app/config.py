from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv


REPO_ROOT = Path(__file__).resolve().parents[1]
DATA_ROOT = REPO_ROOT / "data"
LOG_ROOT = DATA_ROOT / "logs"
CACHE_ROOT = DATA_ROOT / "cache"
LANCEDB_ROOT = DATA_ROOT / "lancedb"

load_dotenv(REPO_ROOT / ".env")


@dataclass(frozen=True)
class ProviderConfig:
    name: str
    api_base: str
    api_key: str
    model: str


@dataclass(frozen=True)
class Settings:
    log_level: str
    embed_model: str
    rerank_model: str
    ocr_lang: str
    kimi: ProviderConfig
    qwen: ProviderConfig


def load_settings() -> Settings:
    return Settings(
        log_level=os.getenv("GATEWAY_LOG_LEVEL", "INFO"),
        embed_model=os.getenv("EMBED_MODEL", "BAAI/bge-small-zh-v1.5"),
        rerank_model=os.getenv("RERANK_MODEL", "BAAI/bge-reranker-base"),
        ocr_lang=os.getenv("OCR_LANG", "ch"),
        kimi=ProviderConfig(
            name="kimi",
            api_base=os.getenv("KIMI_API_BASE", "").strip(),
            api_key=os.getenv("KIMI_API_KEY", "").strip(),
            model=os.getenv("KIMI_MODEL", "kimi-k2.5").strip(),
        ),
        qwen=ProviderConfig(
            name="qwen",
            api_base=os.getenv("QWEN_API_BASE", "").strip(),
            api_key=os.getenv("QWEN_API_KEY", "").strip(),
            model=os.getenv("QWEN_MODEL", "qwen3.5-plus").strip(),
        ),
    )
