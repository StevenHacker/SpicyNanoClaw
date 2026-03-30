from __future__ import annotations

import json
from functools import lru_cache
from typing import Any

import lancedb

from app.config import LANCEDB_ROOT


@lru_cache(maxsize=1)
def get_db() -> Any:
    LANCEDB_ROOT.mkdir(parents=True, exist_ok=True)
    return lancedb.connect(str(LANCEDB_ROOT))


def get_table() -> Any | None:
    db = get_db()
    names = set(db.table_names())
    if "memory_chunks" in names:
        return db.open_table("memory_chunks")
    return None


def upsert_rows(rows: list[dict[str, Any]]) -> None:
    if not rows:
        return
    db = get_db()
    table = get_table()
    if table is None:
        db.create_table("memory_chunks", data=rows)
        return
    table.add(rows)


def search_rows(vector: list[float], top_k: int) -> list[dict[str, Any]]:
    table = get_table()
    if table is None:
        return []
    return table.search(vector, vector_column_name="vector").limit(top_k).to_list()


def encode_metadata(metadata: dict[str, Any]) -> str:
    return json.dumps(metadata, ensure_ascii=False, sort_keys=True)


def decode_metadata(raw: str) -> dict[str, Any]:
    return json.loads(raw) if raw else {}
