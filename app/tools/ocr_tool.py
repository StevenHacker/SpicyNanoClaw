from __future__ import annotations

import io
import logging
from functools import lru_cache
from pathlib import Path
from typing import Any

import fitz
import pdfplumber
from PIL import Image
from rapidocr_onnxruntime import RapidOCR

from app.memory.chunking import join_nonempty

logger = logging.getLogger(__name__)


@lru_cache(maxsize=1)
def get_ocr_engine() -> RapidOCR:
    logger.info("Initializing RapidOCR engine")
    return RapidOCR()


def _image_to_text(image: Image.Image) -> str:
    result, _ = get_ocr_engine()(image)
    if not result:
        return ""
    return "\n".join(item[1] for item in result)


def _tables_from_pdf(path: Path) -> list[str]:
    tables: list[str] = []
    with pdfplumber.open(path) as pdf:
        for page_index, page in enumerate(pdf.pages):
            for table in page.extract_tables() or []:
                if not table:
                    continue
                lines = [f"Table page {page_index + 1}"]
                for row in table:
                    cells = [cell.strip() if cell else "" for cell in row]
                    lines.append("| " + " | ".join(cells) + " |")
                tables.append("\n".join(lines))
    return tables


def parse_document(input_path: str, output_format: str = "text", force_fallback: bool = False) -> dict[str, Any]:
    path = Path(input_path).expanduser().resolve()
    if not path.exists():
        raise FileNotFoundError(f"Input not found: {path}")

    suffix = path.suffix.lower()
    text_parts: list[str] = []
    table_parts: list[str] = []
    used_ocr = False

    if suffix == ".pdf":
        doc = fitz.open(path)
        for page in doc:
            page_text = "" if force_fallback else page.get_text("text").strip()
            if page_text:
                text_parts.append(page_text)
                continue
            used_ocr = True
            pix = page.get_pixmap(dpi=180)
            image = Image.open(io.BytesIO(pix.tobytes("png")))
            text_parts.append(_image_to_text(image))
        doc.close()
        try:
            table_parts = _tables_from_pdf(path)
        except Exception as exc:
            logger.warning("table extraction failed for %s: %s", path, exc)
    else:
        used_ocr = True
        with Image.open(path) as image:
            text_parts.append(_image_to_text(image))

    text = join_nonempty(text_parts)
    tables = join_nonempty(table_parts)
    if output_format == "markdown":
        markdown_parts = [text]
        if tables:
            markdown_parts.append("## Tables\n\n" + tables)
        rendered = join_nonempty(markdown_parts)
    else:
        rendered = text if not tables else f"{text}\n\n{tables}".strip()

    return {
        "input_path": str(path),
        "output_format": output_format,
        "text": rendered,
        "tables": tables,
        "used_ocr": used_ocr,
    }

