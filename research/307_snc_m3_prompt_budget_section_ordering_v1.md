# SNC M3 Prompt Budget / Section Ordering V1

## Purpose

Turn the accepted prompt-budget doctrine into real SNC behavior so prompt pressure trims optional residue before it harms higher-trust context.

## Scope

Files touched in this slice:

- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/src/engine.ts`
- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/src/engine.test.ts`

## What Landed

### 1. Section classes are now explicit

SNC context sections now carry bounded budget metadata:

- `critical`
- `standard`
- `shrink-first`

SNC also tracks two budget groups:

- `packet-dir`
- `diagnostics`

### 2. Prompt pressure now follows a real shrink order

When SNC prompt context must shrink, it now behaves in this order:

1. enforce packet-dir and diagnostics group budgets
2. drop `shrink-first` sections from the tail
3. clamp non-critical sections
4. preserve critical sections as long as possible

This means packet residue and diagnostics no longer compete on equal footing with:

- task posture
- writing-output discipline
- session snapshot
- explicit `brief` / `ledger` anchors

### 3. Truthful trimming is now surfaced

SNC now adds bounded `SNC budget notes` when optional context had to be trimmed and the notes can fit honestly without displacing higher-trust core sections.

### 4. Clamp behavior is now safe

The old UTF-8 truncation helper could exceed the requested byte budget after appending the SNC truncation marker. Under pressure that could make the budget loop fail to converge.

This slice fixes that by reserving marker bytes before truncation, so budget reduction is real and loop-safe.

### 5. Explicit configured anchors gained higher priority

Configured `brief` / `ledger` files now behave as higher-trust sections than packet-dir residue. This better matches SNC's intended operator doctrine.

## Validation

Validated with:

- `powershell -ExecutionPolicy Bypass -File scripts/validate_snc_focus_v2.ps1`
- `powershell -ExecutionPolicy Bypass -File scripts/validate_snc_dispatcher.ps1`

Observed results:

- shaping focus: `71/71`
- continuity baseline: `25/25`
- dispatcher focused vitest: `77/77`
- workspace `tsc`: pass

## SNC Relevance

This is not just a cosmetic prompt cleanup.

It directly strengthens `Milestone 3` in three ways:

- keeps evidence-first and continuity-critical sections alive under pressure
- reduces deceptive silent clipping of optional packet residue
- makes later explainability work more trustworthy because trimming has a declared order

## Follow-On

Best next follow-up after this slice:

1. multilingual entity correction / suppression
2. explicit-read partial-coverage recovery
3. memory/operator inspect truth closeout
