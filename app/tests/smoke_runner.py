from __future__ import annotations

import json

from app.config import DATA_ROOT
from app.tools.memory_tool import memory_ingest, memory_search
from app.tests.generate_samples import main as ensure_samples


def main() -> int:
    ensure_samples()
    text_path = DATA_ROOT / "samples" / "sample_note.txt"
    ingest = memory_ingest(str(text_path), {"suite": "smoke"})
    search = memory_search("Codex local stack", top_k=1)
    print(json.dumps({"ingest": ingest, "search": search}, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
