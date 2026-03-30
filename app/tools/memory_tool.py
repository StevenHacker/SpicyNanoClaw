from __future__ import annotations

import hashlib
import json
from pathlib import Path
from typing import Any

from app.config import CACHE_ROOT
from app.memory.chunking import chunk_text
from app.memory.embedder import embed_texts
from app.memory.lancedb_store import (
    decode_metadata,
    encode_metadata,
    get_table,
    search_rows,
    upsert_rows,
)
from app.memory.reranker import rerank
from app.tools.ocr_tool import parse_document


TEXT_EXTENSIONS = {".txt", ".md", ".rst", ".log", ".json", ".csv"}
INGEST_INDEX = CACHE_ROOT / "ingest_index.json"


def _load_source(source_path_or_text: str) -> tuple[str, str, float, dict[str, Any]]:
    candidate = Path(source_path_or_text).expanduser()
    if candidate.exists():
        path = candidate.resolve()
        stat = path.stat()
        if path.suffix.lower() in {".pdf", ".png", ".jpg", ".jpeg", ".bmp", ".tif", ".tiff"}:
            parsed = parse_document(str(path), output_format="markdown")
            return str(path), parsed["text"], stat.st_mtime, {"kind": "document"}
        text = path.read_text(encoding="utf-8", errors="ignore")
        return str(path), text, stat.st_mtime, {"kind": "file"}
    return "inline:text", source_path_or_text, 0.0, {"kind": "inline"}


def _load_ingest_index() -> dict[str, Any]:
    if not INGEST_INDEX.exists():
        return {}
    return json.loads(INGEST_INDEX.read_text(encoding="utf-8"))


def _save_ingest_index(index: dict[str, Any]) -> None:
    CACHE_ROOT.mkdir(parents=True, exist_ok=True)
    INGEST_INDEX.write_text(json.dumps(index, ensure_ascii=False, indent=2, sort_keys=True), encoding="utf-8")


def memory_ingest(source_path_or_text: str, metadata: dict[str, Any] | None = None) -> dict[str, Any]:
    source_path, text, mtime, base_metadata = _load_source(source_path_or_text)
    ingest_index = _load_ingest_index()
    has_table = get_table() is not None
    if source_path != "inline:text" and has_table and ingest_index.get(source_path) == mtime:
        return {
            "status": "skipped",
            "reason": "already_ingested",
            "source_path": source_path,
            "source_mtime": mtime,
        }

    chunks = chunk_text(text)
    vectors = embed_texts(chunks)
    merged_metadata = {**base_metadata, **(metadata or {})}
    digest = hashlib.sha256(f"{source_path}|{mtime}".encode("utf-8")).hexdigest()[:12]
    rows = []
    for index, (chunk, vector) in enumerate(zip(chunks, vectors)):
        rows.append(
            {
                "id": f"{digest}-{index}",
                "source_path": source_path,
                "source_mtime": mtime,
                "chunk_index": index,
                "text": chunk,
                "metadata_json": encode_metadata(merged_metadata),
                "vector": vector,
            }
        )
    upsert_rows(rows)
    if source_path != "inline:text":
        ingest_index[source_path] = mtime
        _save_ingest_index(ingest_index)
    return {
        "status": "ingested",
        "source_path": source_path,
        "source_mtime": mtime,
        "chunks": len(rows),
    }


def memory_search(query: str, top_k: int = 5, filters: dict[str, Any] | None = None) -> dict[str, Any]:
    vector = embed_texts([query])[0]
    raw_rows = search_rows(vector, max(top_k * 3, top_k))

    if filters:
        filtered_rows = []
        for row in raw_rows:
            metadata = decode_metadata(row.get("metadata_json", ""))
            if all(metadata.get(key) == value for key, value in filters.items()):
                filtered_rows.append(row)
        raw_rows = filtered_rows

    texts = [row["text"] for row in raw_rows]
    rerank_scores = rerank(query, texts)
    if rerank_scores:
        for row, score in zip(raw_rows, rerank_scores):
            row["rerank_score"] = score
        raw_rows.sort(key=lambda row: row.get("rerank_score", row.get("_distance", 0.0)), reverse=True)

    results = []
    for row in raw_rows[:top_k]:
        results.append(
            {
                "source_path": row["source_path"],
                "chunk_text": row["text"],
                "score": row.get("rerank_score", row.get("_distance")),
                "metadata": decode_metadata(row.get("metadata_json", "")),
            }
        )
    return {
        "query": query,
        "top_k": top_k,
        "results": results,
    }
