# SNC Hook Scaffold v1

## Purpose

Add a bounded hook integration scaffold without changing SNC runtime behavior by default.

This is not the real hook layer yet.
It is the safe starting shape for later:

- transcript shaping
- tool-result shaping
- sidecar upkeep

## Landed Shape

Files:

- [index.ts](C:\Users\Administrator\Documents\codex_project_1\data\working\openclaw-v2026.4.1-snc-v1\extensions\snc\index.ts)
- [config.ts](C:\Users\Administrator\Documents\codex_project_1\data\working\openclaw-v2026.4.1-snc-v1\extensions\snc\src\config.ts)
- [hook-scaffold.ts](C:\Users\Administrator\Documents\codex_project_1\data\working\openclaw-v2026.4.1-snc-v1\extensions\snc\src\hook-scaffold.ts)
- [openclaw.plugin.json](C:\Users\Administrator\Documents\codex_project_1\data\working\openclaw-v2026.4.1-snc-v1\extensions\snc\openclaw.plugin.json)

## Current Behavior

- hook capability is explicit in SNC config
- default state is disabled
- missing config means behavior is unchanged
- enabled state registers only no-op-safe placeholder hooks

Current target set:

- `before_message_write`
- `tool_result_persist`
- `session_end`

## Why This Is The Right First Slice

1. It keeps SNC aligned with the host-first rule.
   - no host-internal OpenClaw edits

2. It proves SNC can carry hook behavior in the same plugin package as the context-engine.

3. It avoids premature transcript mutation.
   - registration exists
   - behavioral risk stays near zero

4. It gives the dispatcher a stable next expansion seam.

## Validation

Validated in the working host copy with:

- focused SNC Vitest
- full workspace typecheck under `NODE_OPTIONS=--max-old-space-size=8192`

At landing time:

- `4` test files
- `14` tests
- all passing

## Next Natural Step

Promote one placeholder into a real bounded behavior.

Best current candidate:

- `before_message_write`

Why:

- closest to deterministic transcript shaping
- easier to keep bounded than a broad `session_end` sidecar
- complements existing `assemble/maintain/compact` work without taking host ownership
