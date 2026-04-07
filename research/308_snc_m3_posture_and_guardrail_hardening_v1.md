# SNC M3 Posture And Guardrail Hardening V1

## Purpose

Close the first reviewer-confirmed M3 bug batch instead of continuing to stack new features on top of unstable mode selection and memory semantics.

This slice targets the accepted queue:

- `SNC-M3-001`
- `SNC-M3-002`
- `SNC-M3-003`
- `SNC-M3-004`
- `SNC-M3-005`

## Scope

Files touched:

- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/src/task-posture.ts`
- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/src/task-posture.test.ts`
- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/src/session-state.ts`
- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/src/session-state.test.ts`
- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/src/engine.test.ts`
- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/src/durable-memory.ts`
- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/src/durable-memory.test.ts`

## What Landed

### 1. Current-turn priority is now explicit

`task-posture` and `writing-prose` detection no longer score a blended history window first.

They now:

- extract the current user turn from the live message tail
- prefer that current turn when it exists
- only fall back to persisted history when no current user turn is available

This closes the stale-window failure mode behind:

- `SNC-M3-001`
- `SNC-M3-002`
- `SNC-M3-003`

### 2. Old evidence / outline requests no longer stick as easily

Because current-turn priority is now real:

- stale evidence-first posture no longer keeps contaminating later continuity or drafting turns
- stale outline structure no longer suppresses a current direct prose request by default

### 3. Evidence-mode prompt truth is now cleaner

`buildSncSessionStateSection(...)` now treats assistant plan state differently in evidence-grounding mode:

- `latestAssistantPlan:` is no longer surfaced as a top-level active-state field
- the plan can only survive as a bounded secondary continuity cue

This makes the prompt surface more honest to SNC's intended evidence-first doctrine.

### 4. Conflict suppression now preserves correction guardrails

Durable-memory suppression now recognizes a bounded class of guardrail entries such as:

- `Do not write Sera`
- `不要写成 ...`

If an entry is reinforcing the current correction by prohibiting the rejected alias, it is no longer suppressed as if it were itself the stale wrong cue.

This closes the most obvious false-negative path in long-horizon correction carry-forward.

### 5. Regression coverage now includes the real bug shapes

The new regression set covers:

- saturated history with current evidence request
- stale evidence mode falling back to continuity
- stale outline mode falling back to direct prose
- evidence-mode prompt truth for assistant-plan demotion
- durable-memory correction guardrails that must survive suppression logic

## Validation

Validated with:

- direct vitest on:
  - `task-posture.test.ts`
  - `session-state.test.ts`
  - `durable-memory.test.ts`
  - `engine.test.ts`
- `powershell -ExecutionPolicy Bypass -File scripts/validate_snc_focus_v2.ps1`
- `powershell -ExecutionPolicy Bypass -File scripts/validate_snc_dispatcher.ps1`

Observed results:

- targeted vitest: `46/46`
- shaping focus: `75/75`
- continuity baseline: `27/27`
- dispatcher focused vitest: `83/83`
- workspace `tsc`: pass

## SNC Relevance

This slice matters because it upgrades M3 from:

- "new abilities with some stale-mode tails"

to:

- "new abilities with clearer turn ownership and more honest memory correction semantics"

That is exactly the kind of hardening M3 needs before closeout.

## Next Best Follow-Up

The highest-value remaining work after this batch is:

1. multilingual entity correction / suppression carry-forward
2. explicit-read partial-coverage recovery and honest fallback
3. long-horizon memory inspect / operator truth closeout
