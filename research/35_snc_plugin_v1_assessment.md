# SNC Plugin V1 Assessment

## Artifact

Incoming bundle:

- `data/incoming/snc-codex-transfer/snc-codex-transfer`

Primary code:

- `overlay/extensions/snc/*`

Primary docs:

- `overlay/README.md`
- `overlay/docs/snc/plugin-delivery.md`

## What This Plugin Already Gets Right

### 1. It chose the right host shape

The plugin is a native OpenClaw `context-engine` plugin, not a host fork.

Evidence:

- `overlay/extensions/snc/openclaw.plugin.json`
- `overlay/extensions/snc/index.ts`

This aligns with the current research direction:

- SNC should enter OpenClaw through plugin delivery first
- SNC should own the `contextEngine` slot rather than starting as only a memory plugin

### 2. It already implements the right first lifecycle slice

Current engine behavior:

- `assemble(...)` injects configured writing packet files plus persisted session snapshot
- `afterTurn(...)` persists structured session state
- `compact(...)` delegates back to OpenClaw runtime
- `maintain(...)` exists as a placeholder, returning a no-op result

Evidence:

- `overlay/extensions/snc/src/engine.ts`

This is a meaningful partial match to the bounded host shape in current research.

### 3. It externalizes session continuity into a reusable artifact

The strongest implemented idea here is not "prompt stuffing."
It is:

- per-session external state
- ledger/chapter-state extraction
- recent-message window preservation
- re-injection of that artifact on future turns

Evidence:

- `overlay/extensions/snc/src/session-state.ts`

This is the right direction for SNC because it turns continuity into a maintained artifact instead of relying only on raw transcript replay.

## Current Gaps

### 1. `maintain()` is still intentionally empty

Current result:

- no transcript rewrite
- no deterministic cleanup
- no canonicalization pass after compaction or successful turns

Evidence:

- `overlay/extensions/snc/src/engine.ts`

Why it matters:

- this leaves one of the strongest CC donor ideas still unimplemented:
  maintained state influencing transcript hygiene and compaction recovery

### 2. SNC does not yet own compaction policy in a meaningful way

Current result:

- `ownsCompaction: false`
- `compact(...)` delegates straight back to runtime

Evidence:

- `overlay/extensions/snc/src/engine.ts`

Why it matters:

- this is safe for v0.1
- but it means SNC state artifacts are not yet reused as a first-class compaction input

### 3. `assemble()` currently adds state only as system-prompt prepend

Current result:

- no custom message projection
- no reordered working set
- no transcript-aware pruning in engine assembly

Evidence:

- `overlay/extensions/snc/src/engine.ts`

Why it matters:

- this is enough for early private iteration
- but it is still weaker than the stronger SNC direction suggested by the research packet

### 4. Extraction quality is still heuristic and regex-driven

Current result:

- directives, focus, constraints, plans, and continuity are inferred from lightweight pattern matching

Evidence:

- `overlay/extensions/snc/src/session-state.ts`

Why it matters:

- this is a practical first pass
- but false positives and weak bilingual precision are the obvious next quality bottleneck

### 5. Packet/context files are reloaded from disk on each assembly

Current result:

- `briefFile`, `ledgerFile`, `packetFiles`, and `packetDir` contents are read during `assemble()`

Evidence:

- `overlay/extensions/snc/src/engine.ts`

Why it matters:

- acceptable for early iteration
- but likely worth caching or file-watch invalidation later if the writing packet grows

## Alignment With Current Research

### Strong alignment

- plugin-first delivery
- `contextEngine` ownership
- externalized session continuity artifact
- helper state persisted outside raw transcript
- conservative host strategy: no early host surgery

### Partial alignment

- `afterTurn()` is present, which is good
- `maintain()` exists, but is not yet active
- `compact()` exists, but is still runtime-delegated rather than SNC-informed

### Still behind the current target shape

- deterministic transcript shaping
- maintained-artifact reuse during compaction
- richer model-visible working-context projection beyond simple prompt prepend

## Compatibility Read

The bundle's docs reference an older OpenClaw research snapshot:

- `d2d9a928b1`

But the inspected API surface still looks compatible with the current local OpenClaw `v2026.4.1` snapshot on the key paths used here:

- `openclaw/plugin-sdk`
- `openclaw/plugin-sdk/core`
- `definePluginEntry`
- `registerContextEngine`
- `delegateCompactionToRuntime`
- `normalizeHyphenSlug`

So the current read is:

- API compatibility looks good on inspected surfaces
- real install/typecheck/test smoke against our local `v2026.4.1` host is still unverified in this session

## Local Validation Re-Run

Validation has now been re-run in this session against a dedicated development copy:

- working host copy:
  `data/working/openclaw-v2026.4.1-snc-v1`
- installed toolchain:
  - `node v22.14.0`
  - `pnpm 10.32.1`
  - `git 2.53.0.windows.2`

Local notes:

- the incoming SNC plugin was staged into `extensions/snc`
- docs from the handoff were also overlaid into `docs/snc`
- the development copy uses `pnpm install --no-frozen-lockfile` because adding `extensions/snc` changes workspace lock resolution

Commands re-run successfully:

- `pnpm exec vitest run extensions/snc/src/session-state.test.ts extensions/snc/src/engine.test.ts`
- `NODE_OPTIONS=--max-old-space-size=8192 pnpm exec tsc -p tsconfig.json --pretty false --noEmit`

Observed result:

- `2` test files passed
- `5` tests passed
- workspace typecheck passed

One notable environment detail:

- a plain `tsc` run hit V8 heap exhaustion
- the `NODE_OPTIONS=--max-old-space-size=8192` setting mentioned in the handoff was necessary and correct

## Current Recommendation

This plugin is a good base for continued SNC work.

Not because it is feature-complete.
Because it has already chosen the right architectural lane:

- host plugin
- context-engine slot
- externalized writing state
- conservative compaction ownership

The best next work should likely be:

1. improve extraction quality and schema clarity in `session-state.ts`
2. make `maintain()` real before attempting broad host changes
3. let SNC state influence compaction more directly
4. only then consider richer message-level projection in `assemble()`

## Bottom Line

This is not just a scaffold.
It is already a credible `SNC v0.1` directionally-correct base.

But it is still an early base:

- strong on package shape
- promising on state externalization
- still shallow on maintenance and compaction intelligence
