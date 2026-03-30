from __future__ import annotations

import json
import subprocess
import time
from pathlib import Path

from app.config import DATA_ROOT, load_settings
from app.memory.embedder import embed_texts
from app.providers.kimi_provider import build_kimi_provider
from app.providers.qwen_provider import build_qwen_provider
from app.tools.memory_tool import memory_ingest, memory_search
from app.tools.ocr_tool import parse_document
from app.tests.generate_samples import main as ensure_samples


def provider_status() -> dict[str, str]:
    settings = load_settings()
    return {
        "kimi": "configured" if settings.kimi.api_base and settings.kimi.api_key else "missing_credentials",
        "qwen": "configured" if settings.qwen.api_base and settings.qwen.api_key else "missing_credentials",
    }


def provider_health() -> dict[str, object]:
    settings = load_settings()
    checks: dict[str, object] = {}
    providers = {
        "kimi": (settings.kimi, build_kimi_provider),
        "qwen": (settings.qwen, build_qwen_provider),
    }
    for name, (config, builder) in providers.items():
        if not config.api_base or not config.api_key:
            checks[name] = {"status": "missing_credentials"}
            continue
        try:
            response = builder().ask("Reply with exactly: pong")
            checks[name] = {
                "status": "ok",
                "latency_ms": response.get("latency_ms"),
                "model": response.get("provider", {}).get("model"),
            }
        except Exception as exc:
            checks[name] = {"status": "error", "error": str(exc)}
    return checks


def gateway_startup_test() -> dict[str, str]:
    process = subprocess.Popen(
        [str(Path(".venv") / "Scripts" / "python.exe"), "-m", "app.mcp_gateway"],
        cwd=Path(__file__).resolve().parents[2],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
    )
    try:
        time.sleep(2)
        if process.poll() is not None:
            stdout, stderr = process.communicate(timeout=5)
            raise RuntimeError(f"gateway exited early stdout={stdout!r} stderr={stderr!r}")
        return {"status": "started"}
    finally:
        if process.poll() is None:
            process.terminate()
            try:
                process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                process.kill()


def main() -> int:
    ensure_samples()
    samples = DATA_ROOT / "samples"
    generated = samples / "generated"
    text_path = samples / "sample_note.txt"
    image_path = generated / "sample_ocr.png"
    pdf_path = generated / "sample_doc.pdf"

    report = {
        "imports": "ok",
        "providers": provider_status(),
        "provider_health": provider_health(),
        "embedding_test": embed_texts(["hello local stack"])[0][:8],
        "memory_ingest": memory_ingest(str(text_path), {"suite": "selfcheck"}),
        "memory_search": memory_search("vector memory sentence", top_k=3),
        "ocr_image": parse_document(str(image_path), output_format="text"),
        "ocr_pdf": parse_document(str(pdf_path), output_format="markdown"),
        "gateway_startup": gateway_startup_test(),
    }
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
