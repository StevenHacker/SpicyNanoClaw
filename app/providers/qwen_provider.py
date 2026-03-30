from __future__ import annotations

from app.config import load_settings
from app.providers.base import OpenAICompatProvider


def build_qwen_provider() -> OpenAICompatProvider:
    return OpenAICompatProvider(load_settings().qwen)

