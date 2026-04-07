# SNC Milestone 3 Long-Horizon Memory Quality V1

## Purpose

Land the first bounded `Milestone 3` memory-quality slice without expanding SNC into a larger memory platform.

This slice is about:

- better durable-memory promotion quality
- less accidental cross-session carry-forward from short-lived operational tasks
- safer reuse of existing durable catalogs that may still contain old transient entries

It is not about:

- host memory-slot takeover
- shared memory services
- larger projection payloads

## What Landed

SNC durable memory now distinguishes more clearly between:

- session-local continuity that should stay inside the current session
- cross-session durable cues that are actually worth carrying forward

The plugin now suppresses transient operational entries across the whole durable-memory path:

1. `harvest`
   - short-lived read / inspect / list / compare / debug / review directives do not get promoted into durable memory just because they were strong in the current turn

2. `persist`
   - existing catalogs are now hardened through the same filter
   - old transient operational entries are removed on the next successful durable-memory write

3. `projection`
   - even if an older catalog still contains transient operational items, they are suppressed from prompt projection

4. `diagnostics`
   - durable-memory diagnostics now call out suppressed transient operational entries explicitly

There is also one sharper rule for derived continuity:

- mixed operational `autoCompactionSummary` content is no longer promoted into durable memory just because it also mentions continuity-like language

That keeps summary promotion from smuggling temporary operator tasks into cross-session memory.

## Why This Matters

Before this slice, SNC durable memory was still vulnerable to one important long-horizon failure mode:

- current-task instructions could become cross-session memory too easily

That created the wrong shape of memory:

- good for immediate continuity
- too eager for durable carry-forward

After this slice:

- session continuity still keeps useful near-turn state
- durable memory becomes more selective about what deserves cross-session trust
- old polluted entries stop surviving forever just because they were written once

This is directly aligned with the accepted donor/community doctrine:

- promotion quality matters as much as projection quality
- suppression is often more important than larger recall
- maintained artifacts and durable memory should not collapse into one lane

## Files

Primary implementation:

- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/src/durable-memory.ts`

Primary tests:

- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/src/durable-memory.test.ts`
- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/src/engine.test.ts`

Validation updates:

- `scripts/validate_snc_focus_v2.ps1`
- `scripts/validate_snc_dispatcher.ps1`

## Validation

Validated with:

- targeted Vitest for `durable-memory` and `engine`
- `scripts/validate_snc_focus_v2.ps1`
- `scripts/validate_snc_dispatcher.ps1`

Results:

- targeted Vitest: `26/26`
- focused SNC shaping: `67/67`
- continuity baseline: `22/22`
- dispatcher focused vitest: `70/70`
- workspace `tsc`: passed with `8GB` heap

## Architectural Read

This is the right kind of `Milestone 3` memory improvement:

- plugin-local
- host-safe
- conservative
- quality-oriented

It improves cross-session memory trust without pretending SNC now has a finished agent-memory architecture.

## Next Recommendation

The next best order is now:

1. continue `SNC-Milestone3-02` with trust/ranking follow-up
2. continue `SNC-Milestone3-01` where explicit-read posture still needs broader coverage
3. move into `SNC-Milestone3-03` multilingual stability once long-horizon memory and evidence-first lanes are both less noisy
