# codex-localstack

Windows-first, low-maintenance local AI tool stack for Codex. The system exposes one MCP gateway that Codex can auto-launch on demand, with no always-on databases, OCR daemons, containers, or model workers.

## What this stack does

- `ask_kimi(prompt, attachments?, mode?)`
- `ask_qwen(prompt, attachments?, mode?)`
- `ocr_parse(input_path, output_format?, force_fallback?)`
- `memory_ingest(source_path_or_text, metadata?)`
- `memory_search(query, top_k?, filters?)`

## Architecture

- Gateway: Python MCP stdio server, auto-launched by Codex
- Cloud providers: configurable OpenAI-compatible HTTP endpoints for Kimi and Qwen
- OCR: lazy-loaded local pipeline using PyMuPDF + RapidOCR, with PDF/image support and table extraction when possible
- Memory: local embeddings and reranking via `fastembed`, stored in embedded LanceDB
- Persistence: everything lives under `data/`

## Reboot behavior

- Auto-starts: nothing except the gateway when Codex first needs the MCP server
- Lazy-loads: OCR runtime, embedding model, reranker model, and LanceDB connection
- Persists: `data/lancedb/`, `data/cache/`, `data/logs/`, sample assets, and config files

After reboot the daily pattern is one line: open Codex, then use the tools normally; the gateway auto-launches and local OCR/memory cold-start only on first use.

## Setup

1. Copy `.env.example` to `.env`.
2. Fill in:
   - `KIMI_API_BASE`
   - `KIMI_API_KEY`
   - `QWEN_API_BASE`
   - `QWEN_API_KEY`
3. Run `.\scripts\bootstrap.ps1`
4. Run `.\scripts\selfcheck.ps1`

## Daily use

- Fast sanity check: `.\scripts\smoke_test.ps1`
- Manual gateway debug run: `.\scripts\start_gateway.ps1`

## Recovery

- Rebuild env and validate imports: `.\scripts\bootstrap.ps1`
- Deep diagnostics: `.\scripts\selfcheck.ps1`
- Backup persistent data: `.\scripts\backup_data.ps1`
- Restore persistent data: `.\scripts\restore_data.ps1 -ArchivePath <zip>`

If OCR fails:
- `.\scripts\selfcheck.ps1` will show whether PyMuPDF or RapidOCR failed.
- The gateway keeps the same tool contract; the fallback path uses direct PDF text extraction where OCR is unavailable.

If memory search fails:
- `.\scripts\selfcheck.ps1` verifies LanceDB read/write plus embedding generation.
- Delete only the affected data under `data/lancedb/` if you want a clean rebuild, or restore from backup.

## Notes on implementation choices

- OCR stack chosen: PyMuPDF + RapidOCR ONNX runtime
- Embedding stack chosen: `fastembed` with `BAAI/bge-small-zh-v1.5` on this Windows machine
- Reranker chosen: `fastembed` cross-encoder with `BAAI/bge-reranker-base`
- Vector store chosen: embedded LanceDB
