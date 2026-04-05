# Dispatcher Validation Helper

## Purpose

Provide one repeatable dispatcher-side check for the SNC working host copy.

The helper is intentionally narrow:

- run the focused SNC regression tests
- run the full workspace typecheck with the 8 GB heap setting

## Script

Use:

- `scripts/validate_snc_dispatcher.ps1`

Recommended invocation on this machine:

- `powershell -ExecutionPolicy Bypass -File scripts/validate_snc_dispatcher.ps1`

Default target:

- `data/working/openclaw-v2026.4.1-snc-v1`

## What It Runs

1. `vitest run extensions/snc/src/session-state.test.ts extensions/snc/src/engine.test.ts`
2. `tsc -p tsconfig.json --pretty false --noEmit --incremental false`
3. with `NODE_OPTIONS=--max-old-space-size=8192` during the typecheck step

## Why This Is The Right Dispatcher Helper

1. It matches the current SNC acceptance baseline.
2. It keeps validation repeatable without touching SNC runtime code.
3. It produces a simple pass/fail signal that the dispatcher thread can use before acceptance, commit, or handoff.

## Output Shape

The script prints:

- the host copy path
- the Node home path
- the heap setting
- per-step success/failure lines
- a final success line when everything passes

## Acceptance Use

Dispatcher workflow:

1. run the helper
2. review the step output
3. if both steps pass, accept the current SNC baseline or slice
4. if one step fails, dispatch a fix packet before merging

## Notes

- This helper does not modify the SNC extension code.
- It is intended for the validated working host copy, not the frozen snapshot.
- It can be extended later with additional checks, but it should stay focused on the SNC acceptance baseline.
