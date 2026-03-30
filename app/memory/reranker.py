from __future__ import annotations

from functools import lru_cache
from typing import Any

try:
    from fastembed.rerank.cross_encoder import TextCrossEncoder
except Exception:  # pragma: no cover
    TextCrossEncoder = None

from app.config import CACHE_ROOT, load_settings


@lru_cache(maxsize=1)
def get_reranker() -> Any | None:
    if TextCrossEncoder is None:
        return None
    settings = load_settings()
    CACHE_ROOT.mkdir(parents=True, exist_ok=True)
    return TextCrossEncoder(model_name=settings.rerank_model, cache_dir=str(CACHE_ROOT))


def rerank(query: str, texts: list[str]) -> list[float] | None:
    model = get_reranker()
    if model is None or not texts:
        return None
    return [float(score) for score in model.rerank(query, texts)]
