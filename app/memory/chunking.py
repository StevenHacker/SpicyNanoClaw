from __future__ import annotations

from typing import Iterable


def chunk_text(text: str, chunk_size: int = 900, overlap: int = 120) -> list[str]:
    clean = " ".join(text.split())
    if not clean:
        return []

    chunks: list[str] = []
    start = 0
    while start < len(clean):
        end = min(len(clean), start + chunk_size)
        chunks.append(clean[start:end])
        if end == len(clean):
            break
        start = max(end - overlap, start + 1)
    return chunks


def join_nonempty(parts: Iterable[str]) -> str:
    return "\n\n".join(part for part in parts if part and part.strip())

