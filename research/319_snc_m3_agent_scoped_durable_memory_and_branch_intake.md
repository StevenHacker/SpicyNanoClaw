# SNC M3 Agent-Scoped Durable Memory And Branch Intake

## Purpose

This round closed two late `M3` concerns:

- prevent cross-agent contamination in cross-session durable memory
- inspect a colleague's early SNC branch without destabilizing the current `M3` line

## What Landed

Updated runtime and tests:

- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/src/config.ts`
- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/src/durable-memory.ts`
- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/src/durable-memory.test.ts`
- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/src/engine.ts`
- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/src/engine.test.ts`
- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/README.md`
- `README.md`

## Durable-Memory Isolation Read

Before this round:

- session continuity state was already isolated by `sessionId/sessionKey`
- worker controller state was already isolated by `sessionId/sessionKey`
- cross-session durable memory still defaulted to one shared catalog per `stateDir`

That meant two agent families sharing one `stateDir` could still see the same durable-memory pool.

After this round:

- SNC resolves a durable-memory namespace per agent-family by default
- if `sessionKey` is present, the default namespace is derived from the agent-family portion of the key
- durable-memory files now live under namespaced roots inside `stateDir/durable-memory/namespaces/...`
- operators can still opt into a shared pool by setting `memoryNamespace`

Operationally this means:

- same agent family can keep cross-session carry-forward
- different agent families no longer share durable cues by accident
- the shared-memory case becomes explicit instead of accidental

## Colleague Branch Intake

Remote branch inspected:

- `origin/codex/snc-runtime-20260407`

Read:

- it is an early SNC prototype, not based on the current `0.1.1` / `M3` line
- it contains a full older `extensions/snc` implementation
- it is not safe to merge directly into the current `M3` closeout line

Useful ideas retained conceptually:

- `humanity-lint` style heuristics for report-mode / AI-smell detection
- more writing-specialized packet structuring ideas

What did **not** happen:

- no early runtime files were merged
- no old engine/session-state implementation was cherry-picked
- no package/docs/manifest from that line were adopted into `M3`

## Validation

Latest validation run:

- `powershell -ExecutionPolicy Bypass -File scripts/validate_snc_focus_v2.ps1`
- `powershell -ExecutionPolicy Bypass -File scripts/validate_snc_dispatcher.ps1`
- `powershell -ExecutionPolicy Bypass -File scripts/validate_snc_milestone3.ps1`

Results:

- shaping focus: `79/79`
- continuity baseline: `35/35`
- dispatcher focused vitest: `95/95`
- workspace `tsc`: pass
- package rebuild: pass
- clean-host rehearsal: pass

## Practical Read

SNC is not built on one flat global agent-memory pool.

The current truth is:

- session state: session-scoped
- worker state: session-scoped
- durable memory: now agent-family-scoped by default
- shared durable memory: explicit opt-in only

That is the right default for `M3`, because it reduces cross-agent contamination risk without taking away deliberate shared-memory layouts later.
