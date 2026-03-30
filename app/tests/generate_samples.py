from __future__ import annotations

from pathlib import Path

import fitz
from PIL import Image, ImageDraw

from app.config import DATA_ROOT


def main() -> int:
    samples = DATA_ROOT / "samples"
    generated = samples / "generated"
    generated.mkdir(parents=True, exist_ok=True)

    text_file = samples / "sample_note.txt"
    if not text_file.exists():
        text_file.write_text(
            "Codex local stack sample note.\nThe vector memory should be able to find this sentence.\n",
            encoding="utf-8",
        )

    image_path = generated / "sample_ocr.png"
    if not image_path.exists():
        image = Image.new("RGB", (1000, 500), "white")
        draw = ImageDraw.Draw(image)
        draw.text((40, 40), "Invoice 42\nWidget A  10\nWidget B  25\nTotal 35", fill="black")
        image.save(image_path)

    pdf_path = generated / "sample_doc.pdf"
    if not pdf_path.exists():
        doc = fitz.open()
        page = doc.new_page()
        page.insert_text((72, 72), "Project Brief\n\nCodex local stack PDF sample.\nTable follows below.")
        page.insert_text((72, 160), "Item    Count\nWidget  3\nCable   5")
        doc.save(pdf_path)
        doc.close()

    print(str(text_file))
    print(str(image_path))
    print(str(pdf_path))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

