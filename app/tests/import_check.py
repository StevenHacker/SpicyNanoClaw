from __future__ import annotations

import importlib


MODULES = [
    "httpx",
    "mcp",
    "lancedb",
    "fastembed",
    "fitz",
    "pdfplumber",
    "PIL",
    "rapidocr_onnxruntime",
]


def main() -> int:
    for name in MODULES:
        importlib.import_module(name)
        print(f"ok import {name}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

