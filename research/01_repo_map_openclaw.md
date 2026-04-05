# OpenClaw Repo Map - Round 1

## Frozen Snapshot

- Root: `data/external/openclaw-v2026.4.1`
- Tag: `v2026.4.1`
- Commit: `da64a978e5814567f7797cc34fbe29b61b7eae7a`

## Top-Level Shape

Main top-level directories observed:

- `.agents`
- `.pi`
- `apps`
- `docs`
- `extensions`
- `packages`
- `skills`
- `src`
- `ui`
- `test`

Interpretation:

- platform skeleton: `apps`, `ui`, `packages`, `extensions`, `src`
- runtime core: `src`
- extension/plugin surfaces: `extensions`, `skills`, `.agents`, `.pi`

## SNC-Relevant Areas

### Confirmed existing paths

- `src/context-engine`
- `src/agents/pi-embedded-runner/run/attempt.ts`
- `src/agents/system-prompt.ts`
- `src/agents/pi-tools.ts`
- `extensions/`

### Confirmed memo-path drift

These memo paths do **not** exist literally in this tag:

- `src/agents/pi-extensions/context-pruning`
- `src/agents/pi-extensions/compaction-safeguard.ts`
- `src/memory`

Related logic appears to have moved into `src/agents/pi-embedded-runner/*` and plugin-based memory surfaces.

## Main Runtime Spine Candidates

### 1. Context assembly spine

- `src/context-engine/index.ts`
- `src/agents/pi-embedded-runner/run/attempt.ts`
- `src/agents/pi-embedded-runner/run/attempt.context-engine-helpers.ts`
- `src/agents/pi-embedded-runner/run/attempt.prompt-helpers.ts`

Evidence:

- `src/context-engine/index.ts` exports `ContextEngine`, `AssembleResult`, `CompactResult`, maintenance hooks, legacy adapters, and initialization helpers.
- `src/agents/pi-embedded-runner/run/attempt.ts` imports:
  - `assembleAttemptContextEngine`
  - `finalizeAttemptContextEngineTurn`
  - `runAttemptContextEngineBootstrap`
  - `prependSystemPromptAddition`
  - `composeSystemPromptWithHookContext`

### 2. System prompt assembly spine

- `src/agents/system-prompt.ts`
- `src/agents/pi-embedded-runner/system-prompt.ts`
- `src/agents/pi-embedded-runner/run/attempt.ts`

Evidence:

- `src/agents/system-prompt.ts` builds explicit sections for skills, memory, docs, messaging, time, user identity, voice, and runtime guidance.
- `attempt.ts` imports `buildEmbeddedSystemPrompt`, `applySystemPromptOverrideToSession`, and `createSystemPromptOverride`.

### 3. Tool exposure spine

- `src/agents/pi-tools.ts`
- `src/agents/pi-embedded-runner/tool-*`
- `src/agents/pi-embedded-runner/tool-result-*`

Evidence:

- `attempt.ts` imports `createOpenClawCodingTools`, `collectAllowedToolNames`, `installToolResultContextGuard`, and `splitSdkTools`.

### 4. Compaction / history hygiene spine

Observed under `src/agents/pi-embedded-runner/`:

- `compact.ts`
- `compact.runtime.ts`
- `compact.hooks.test.ts`
- `compact-reasons.ts`
- `compaction-hooks.ts`
- `compaction-runtime-context.ts`
- `compaction-safety-timeout.ts`
- `run/compaction-timeout.ts`
- `run/compaction-retry-aggregate-timeout.ts`
- `run/history-image-prune.ts`

This is the strongest evidence so far that compaction-related seams are now embedded runner local, not under the memo's older `pi-extensions/*` location.

### 5. Memory surfaces

Round 1 only confirms memory-related prompt/tool presence, not the full recall chain.

Signals found:

- `src/agents/system-prompt.ts` imports `buildMemoryPromptSection` from `src/plugins/memory-state.js`
- `attempt.ts` includes evidence of memory flush forwarding tests and memory tools in policy/test search
- top-level `extensions/` exists, implying extension-based memory surfaces remain relevant

## Directory Shortlist For Round 2

- `src/context-engine/*`
- `src/agents/pi-embedded-runner/run/*`
- `src/agents/pi-embedded-runner/compact*`
- `src/agents/pi-embedded-runner/system-prompt.ts`
- `src/agents/system-prompt.ts`
- `src/agents/pi-tools.ts`
- `src/plugins/*memory*`
- `extensions/*memory*`

## Engineering Value

For SNC, the most promising OpenClaw insertion seams are likely to sit near:

- context-engine assembly
- embedded runner prompt assembly
- compaction / post-turn maintenance
- tool-result context guarding

This is still a structure-level conclusion only; exact insertion recommendations remain unproven.
