# SNC Bilingual Shaping Audit

## Scope

This note records the architect-audit response for SNC's Chinese-writing path.

The goal was not to defend the code reflexively.
It was to separate:

- real runtime defects
- console-encoding false alarms
- intentionally deferred runtime surfaces

## Hard Conclusions

### 1. The Chinese `session-state` extraction path was not actually broken in source

This part of the audit needed correction.

What looked like mojibake in shell output was a console-encoding artifact, not the actual file contents.
Direct UTF-8 reads from:

- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/src/session-state.ts`
- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/src/session-state.test.ts`

show that the file and the tests already contain real Chinese cues.

A direct runtime probe using escaped UTF-8 Chinese input also confirmed:

- `storyLedger.userDirectives` extracted correctly
- `storyLedger.assistantPlans` extracted correctly
- `chapterState.constraints` extracted correctly

So the stronger accurate read is:

- `session-state` bilingual extraction was already live
- that specific part was not the real product break

### 2. The real Chinese gap was in transcript shaping and the product-wired shaping path

This part of the audit was correct in spirit and required code changes.

Before this fix:

- `transcript-shaping.ts` only had meaningful English shaping cues
- `hook-scaffold.ts` used its own English-first shaping logic
- `engine.ts maintain()` used a separate heuristic path

That meant Chinese writing sessions could persist state correctly but still miss the shaping behavior that trims assistant planning/meta chatter into bounded continuity notes.

### 3. Helper tools and worker policy still are not registered into the runtime surface

This observation is factually true, but it is not an accidental integration bug.

It matches accepted Milestone 1 decisions:

- `research/87_snc_helper_tool_registration_decision.md`
- `research/88_snc_worker_policy_host_wiring_v1.md`

So the correct statement is:

- these capabilities exist as bounded internal utilities
- they are not yet product-exposed by default
- this is currently deferred by architecture decision, not silently forgotten wiring

## Code Response

This audit round landed three real changes:

1. `transcript-shaping.ts`
   - added Chinese plan/meta/continuity/story/ack cues
   - added Chinese punctuation-aware segment splitting
   - made rewrite analysis text-only-safe

2. `hook-scaffold.ts`
   - now uses the shared transcript-shaping utility
   - Chinese assistant planning chatter now rewrites through the product hook path
   - this reduces drift between utility behavior and live runtime behavior

3. `engine.ts`
   - `maintain()` now also uses the shared transcript-shaping utility
   - maintenance shaping and hook shaping now share one classification/summarization core

## What This Fix Actually Changes

After this pass:

- Chinese `session-state` extraction remains working
- Chinese transcript shaping is now working
- Chinese hook-based assistant-plan shaping is now working
- Chinese maintenance rewriting is now working
- hook/maintain shaping no longer rely on separate classifier families

This does **not** yet mean:

- helper tools are runtime-registered
- worker policy is wired into live host spawn flow
- SNC is feature-complete

## Validation

Direct validation completed successfully:

- targeted Vitest:
  - `extensions/snc/src/session-state.test.ts`
  - `extensions/snc/src/transcript-shaping.test.ts`
  - `extensions/snc/src/hook-scaffold.test.ts`
  - `extensions/snc/src/engine.test.ts`
  - `26/26` tests passed
- focus gate:
  - `scripts/validate_snc_focus_v2.ps1`
  - shaping focus `24/24`
  - continuity baseline `11/11`
- dispatcher gate:
  - `scripts/validate_snc_dispatcher.ps1`
  - focused SNC Vitest `11/11`
  - workspace typecheck passed
- full workspace typecheck:
  - `NODE_OPTIONS=--max-old-space-size=8192`
  - `tsc -p tsconfig.json --noEmit`

## Practical Read

The architect's broad conclusion should be tightened to:

- SNC is not broken junk
- it was also not as complete as the most optimistic reading suggested
- the Chinese state-extraction path was stronger than the audit claimed
- the Chinese shaping/product path was weaker than it needed to be
- this round fixes the real bilingual shaping/product-path gap and reduces shaping-rule drift
