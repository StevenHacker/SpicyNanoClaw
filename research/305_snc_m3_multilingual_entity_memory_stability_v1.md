# SNC M3 Multilingual Entity Memory Stability V1

## Purpose

Land a bounded `Milestone 3` slice that improves multilingual and mixed-script continuity quality through better normalization and durable-memory ranking.

This slice is intentionally narrow:

- no identity graph
- no alias service
- no host takeover

It only hardens the parts of SNC that already decide whether a continuity cue survives and projects.

## What Landed

### 1. Unicode-normalized continuity keys

`session-state.ts` now normalizes continuity keys with Unicode `NFKC` before dedupe.

Practical effect:

- mixed-width variants like `AI系统` vs `ＡＩ系统` no longer create duplicate continuity cues
- same-session continuity state is less likely to drift on superficial script-width differences

### 2. Mixed-script durable-memory overlap

`durable-memory.ts` no longer relies on ASCII-only token overlap.

The ranking path now:

- keeps ordinary word tokens for Latin/alnum text
- adds bounded Han-character bigram overlap for CJK text
- preserves small direct Han tokens for tighter name matching

Practical effect:

- multilingual and Chinese continuity cues can now rank on actual overlap instead of being structurally underweighted
- mixed-script prompts like `Lin Yan (林砚)` can now recall Chinese durable cues more honestly

### 3. Internal normalization only where safe

`transcript-shaping.ts` keeps visible user-facing surface text intact, but internal dedupe keys are Unicode-normalized.

That preserves readable multilingual surface form while still reducing duplicate internal segment keys.

## Why It Matters

Before this patch, SNC's multilingual groundwork existed, but memory overlap still favored ASCII-heavy text.

That meant the plugin could:

- classify bilingual turns reasonably well
- but still under-rank or miss multilingual continuity cues at recall time

This patch improves the actual continuity substrate instead of only improving regex classification.

## Validation

Validated with:

- focused SNC validation
- dispatcher validation
- workspace typecheck

Current outcome:

- shaping focus: green
- continuity baseline: green
- dispatcher focused vitest: green
- workspace `tsc`: green

Additional regression coverage now includes:

- mixed-width continuity dedupe
- mixed-script durable-memory overlap recall

## Carry-Forward

This slice should be read together with:

- `research/220_snc_m3_long_horizon_memory_quality_v1.md`
- `research/254_snc_m3_durable_memory_operator_explainability_v1.md`
- `research/304_snc_m3_writing_output_discipline_v1.md`

The next likely `M3` pressure is still:

- explicit-read partial-coverage behavior
- multilingual entity correction / suppression ordering
- prompt-budget / section-ordering hardening
