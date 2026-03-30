from __future__ import annotations

import base64
import mimetypes
import time
from pathlib import Path
from typing import Any

import httpx

from app.config import ProviderConfig


def _attachment_to_content(path_str: str) -> dict[str, Any]:
    path = Path(path_str).expanduser().resolve()
    mime, _ = mimetypes.guess_type(path.name)
    mime = mime or "application/octet-stream"
    encoded = base64.b64encode(path.read_bytes()).decode("ascii")
    return {
        "type": "image_url",
        "image_url": {
            "url": f"data:{mime};base64,{encoded}",
        },
    }


class OpenAICompatProvider:
    def __init__(self, config: ProviderConfig):
        self.config = config

    def ask(self, prompt: str, attachments: list[str] | None = None, mode: str | None = None) -> dict[str, Any]:
        if not self.config.api_base or not self.config.api_key:
            raise RuntimeError(f"{self.config.name} API credentials are not configured")

        content: list[dict[str, Any]] = [{"type": "text", "text": prompt}]
        for attachment in attachments or []:
            try:
                content.append(_attachment_to_content(attachment))
            except Exception:
                content.append({"type": "text", "text": f"[attachment unavailable: {attachment}]"})

        payload = {
            "model": self.config.model,
            "messages": [{"role": "user", "content": content}],
        }
        if mode:
            payload["reasoning_effort"] = mode

        headers = {
            "Authorization": f"Bearer {self.config.api_key}",
            "Content-Type": "application/json",
        }
        url = self.config.api_base.rstrip("/") + "/chat/completions"

        started = time.perf_counter()
        with httpx.Client(timeout=120.0) as client:
            response = client.post(url, headers=headers, json=payload)
            response.raise_for_status()
            data = response.json()
        latency_ms = round((time.perf_counter() - started) * 1000, 2)
        choice = (data.get("choices") or [{}])[0]
        message = choice.get("message") or {}
        raw_text = message.get("content", "")

        return {
            "raw_text": raw_text,
            "usage": data.get("usage", {}),
            "latency_ms": latency_ms,
            "provider": {
                "name": self.config.name,
                "model": data.get("model", self.config.model),
                "base_url": self.config.api_base,
                "mode": mode or "default",
            },
            "raw_response": data,
        }

