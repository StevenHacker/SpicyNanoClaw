from __future__ import annotations

from functools import lru_cache
from typing import Iterable

from fastembed import TextEmbedding

from app.config import CACHE_ROOT, load_settings


@lru_cache(maxsize=1)
def get_embedder() -> TextEmbedding:
    settings = load_settings()
    CACHE_ROOT.mkdir(parents=True, exist_ok=True)
    return TextEmbedding(model_name=settings.embed_model, cache_dir=str(CACHE_ROOT))


def embed_texts(texts: Iterable[str]) -> list[list[float]]:
    return [vector.tolist() for vector in get_embedder().embed(list(texts))]

