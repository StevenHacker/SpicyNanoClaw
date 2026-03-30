from __future__ import annotations

from app.config import load_settings
from app.providers.base import OpenAICompatProvider


def build_kimi_provider() -> OpenAICompatProvider:
    return OpenAICompatProvider(load_settings().kimi)

