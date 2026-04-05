# SYN-09 SNC Durable-Memory Operator Envelope

## Purpose

Define the bounded outward contract for SNC durable memory in Milestone 2: what an operator can reasonably expect, what to inspect, which host diagnostics are already useful, what path/freshness rules are real in current code, and what still should not be promised.

## Scope

- synthesis base:
  - `research/123_cc14_memory_hygiene_explainability_matrix.md`
  - `research/128_oc18_plugin_diagnostics_doctor_matrix.md`
  - `research/129_oc19_gateway_working_directory_matrix.md`
  - `research/130_cc15_memory_failure_skip_control_matrix.md`
- SNC runtime files:
  - `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/src/durable-memory.ts`
  - `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/src/engine.ts`
  - `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/src/config.ts`
  - `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/openclaw.plugin.json`
  - `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/README.md`
- bounded goal:
  - durable-memory operator contract only
  - no reopening of memory-slot takeover
  - no restart of broad SNC/OpenClaw architecture discussion

## Verified Structure / Lifecycle / Contract

### 1. Outward contract matrix

| Surface | Current code contract | Operator-safe reading |
| --- | --- | --- |
| plugin activation | SNC is a normal `context-engine` plugin selected through `plugins.slots.contextEngine = "snc"` | durable memory is part of the SNC plugin lane, not a separate host subsystem |
| persistence gate | all durable-memory load/persist functions return `null` when `stateDir` is absent | without `stateDir`, durable memory should be treated as effectively off |
| storage layout | files live under `${stateDir}/durable-memory/catalog.json` and `${stateDir}/durable-memory/entries/*.json` | durable memory is inspectable as plain plugin-owned files |
| harvest sources | current harvest reads from SNC session artifacts: story-ledger directives, chapter constraints/focus, continuity notes, auto-compaction summary | durable memory is fed by SNC-owned continuity artifacts, not by a separate host memory service |
| dedupe / merge | entry ids hash normalized `category:text`; repeated evidence merges and raises `confirmationCount` | repeated identical cues reinforce existing entries instead of multiplying duplicates |
| hygiene | weak single-signal derived entries can age out after `staleEntryDays` on later successful writes | stale low-confidence memory is pruned, but not instantly and not out-of-band |
| projection | prompt projection is score-based and bounded by `projectionLimit` / `projectionMinimumScore` | not every catalog entry appears every turn |
| prompt diagnostics | `engine.ts` adds a `Durable memory diagnostics` section only when catalog exists and diagnostics are warranted | current operator-facing health is mostly prompt-visible, not CLI-driven |
| failure handling | durable read/write failures are caught and logged via `warnOnce(...)`; main plugin flow continues | durable memory is best-effort sidecar behavior, not a hard availability requirement |

### 2. What SNC durable memory actually stores today

Current durable-memory categories and strength model are code-explicit:

- categories:
  - `directive`
  - `constraint`
  - `continuity`
  - `fact`
- strengths:
  - `explicit-user`
  - `repeated`
  - `derived`

Evidence sources are also bounded:

- `story-ledger`
- `chapter-state`
- `auto-compaction-summary`

So SNC durable memory is currently a conservative continuity-cue catalog, not a generic long-term knowledge platform.

### 3. What current operator-visible diagnostics really are

Host-provided support already available:

- `openclaw config validate`
  - proves config file validity/schema correctness
- `openclaw plugins inspect snc`
  - proves the plugin loads, exposes config schema, and is visible to the loader in the current CLI process
- `openclaw plugins doctor`
  - catches plugin load errors and error-level plugin diagnostics

SNC-provided support already available:

- prompt section `Durable memory`
  - only when entries score high enough for the current turn
- prompt section `Durable memory diagnostics`
  - only when catalog exists and one of these conditions holds:
    - weak single-signal entries exist
    - stale weak entries are waiting for prune
    - no entry currently clears the score threshold
    - projection is saturated at the current limit
- plain file artifacts under `stateDir/durable-memory`

Not currently present:

- dedicated SNC CLI doctor
- dedicated host validator for SNC durable-memory catalog quality
- manual prune/promote/delete control surface

### 4. Recommended operator check flow

The most honest current check flow is:

1. `openclaw config validate`
2. `openclaw plugins inspect snc`
3. `openclaw plugins doctor`
4. restart the gateway after config/plugin changes
5. verify that the configured `stateDir` actually resolves where intended
6. inspect `${stateDir}/durable-memory/catalog.json` and `entries/` when durable-memory behavior is under question
7. read the prompt-visible `Durable memory diagnostics` section before raising retention/projection knobs

This flow uses host diagnostics where they are already strong, and only falls back to plugin-local file/prompt inspection where the host does not yet expose SNC-specific health.

### 5. Freshness / duplication / path guidance

Freshness:

- weak single-signal entries are `derived` entries with `confirmationCount <= 1`
- these age out only on later successful writes and only after `staleEntryDays`
- current default is conservative: `30` days

Duplication:

- normalized identical entries collapse into the same durable-memory id
- repeated evidence increases `confirmationCount`
- evidence lists are merged, not duplicated blindly

Projection discipline:

- projection is score-based against:
  - recent current text
  - current focus
  - current constraints
- default projection is deliberately narrow:
  - limit `3`
  - minimum score `3`

Path guidance:

- `stateDir` is resolved through plugin `resolvePath(...)`
- current host/plugin contract means relative `stateDir` remains process-CWD-sensitive
- for clean-host or service lanes, the operator-safe rule is:
  - prefer `~`-anchored or absolute `stateDir`
  - treat relative `./.snc/state` as development-lane shorthand, not as a universal service-safe default

### 6. Explicit non-promises

Milestone 2 should not promise that SNC durable memory is:

- a host-owned memory slot
- always active without `stateDir`
- guaranteed to write every turn
- a fully explainable CLI/doctor control plane
- config-file-relative in path semantics
- a remote/shared/team memory service
- a manual memory management product with prune/promote/delete verbs

## Key Findings

1. SNC durable memory is already operator-usable, but its true contract is modest: plugin-owned files plus bounded prompt projection, gated by `stateDir`.
2. The best current operator diagnostics are hybrid:
   - host: `config validate`, `plugins inspect`, `plugins doctor`
   - SNC: prompt-side `Durable memory diagnostics` plus on-disk catalog inspection
3. Current code strongly supports conservative freshness/dedup/projection claims, but not broad claims about automatic self-healing, universal path stability, or a full CLI memory control plane.
4. The sharpest docs risk is still path honesty: current README examples use relative `stateDir`, while the verified host launch lanes do not guarantee a universal working directory.

## SNC Relevance

This packet is the outward contract for `SNC-Milestone2-04 Durable Memory Diagnostics And Controls`.

It gives the next implementation/docs pass a bounded target:

- explain what durable memory does now
- tell operators how to verify it now
- add controls only where current evidence justifies them
- avoid turning durable memory into a vague "smarter memory platform" story

## Modification Guidance

- `wrap`:
  - README and operator notes should present durable memory as `stateDir`-backed and best-effort.
  - Docs should recommend host diagnostics first, then resolved-path/file inspection.
- `extend`:
  - If Milestone 2 adds more controls, the safest next additions are small explainability surfaces:
    - resolved durable-memory root
    - catalog entry count
    - stale/weak/saturated notes
  - These should remain plugin-local and bounded.
- `defer`:
  - manual prune/promote/delete UI/CLI
  - host memory-slot takeover
  - remote/shared memory service behavior
- `avoid`:
  - Do not promise durable-memory writes on every turn.
  - Do not say `plugins doctor` validates SNC catalog quality.
  - Do not keep implying that relative `stateDir` examples are equally safe in clean-host service lanes.

## Still-unverified questions

1. Whether Milestone 2 implementation will add a dedicated operator fixture or helper surface for resolved durable-memory path/catalog stats.
2. How visible SNC logger-side durable read/write warnings are in every real OpenClaw deployment lane.
3. Whether later host releases will narrow the CWD ambiguity enough that relative SNC durable-memory paths become safer to recommend again.
