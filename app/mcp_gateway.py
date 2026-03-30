from __future__ import annotations

import logging
from typing import Any

from mcp.server.fastmcp import FastMCP

from app.config import load_settings
from app.logging_utils import configure_logging
from app.providers.kimi_provider import build_kimi_provider
from app.providers.qwen_provider import build_qwen_provider
from app.tools.memory_tool import memory_ingest as memory_ingest_impl
from app.tools.memory_tool import memory_search as memory_search_impl
from app.tools.ocr_tool import parse_document

settings = load_settings()
configure_logging(settings.log_level)
logger = logging.getLogger(__name__)
mcp = FastMCP("codex-localstack")


@mcp.tool()
def ask_kimi(prompt: str, attachments: list[str] | None = None, mode: str | None = None) -> dict[str, Any]:
    logger.info("ask_kimi called")
    return build_kimi_provider().ask(prompt=prompt, attachments=attachments, mode=mode)


@mcp.tool()
def ask_qwen(prompt: str, attachments: list[str] | None = None, mode: str | None = None) -> dict[str, Any]:
    logger.info("ask_qwen called")
    return build_qwen_provider().ask(prompt=prompt, attachments=attachments, mode=mode)


@mcp.tool()
def ocr_parse(input_path: str, output_format: str = "text", force_fallback: bool = False) -> dict[str, Any]:
    logger.info("ocr_parse called for %s", input_path)
    return parse_document(input_path=input_path, output_format=output_format, force_fallback=force_fallback)


@mcp.tool()
def memory_ingest(source_path_or_text: str, metadata: dict[str, Any] | None = None) -> dict[str, Any]:
    logger.info("memory_ingest called")
    return memory_ingest_impl(source_path_or_text=source_path_or_text, metadata=metadata)


@mcp.tool()
def memory_search(query: str, top_k: int = 5, filters: dict[str, Any] | None = None) -> dict[str, Any]:
    logger.info("memory_search called")
    return memory_search_impl(query=query, top_k=top_k, filters=filters)


def main() -> None:
    logger.info("Starting codex-localstack gateway")
    mcp.run()


if __name__ == "__main__":
    main()

