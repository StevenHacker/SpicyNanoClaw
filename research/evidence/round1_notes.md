# Round 1 Raw Notes

## Upstream freezing

- OpenClaw upstream confirmed at `openclaw/openclaw`
- Pulled tag `v2026.4.1`
- Commit: `da64a978e5814567f7797cc34fbe29b61b7eae7a`

- CC upstream confirmed at `seanlab007/claude-code-leeyeel`
- Pulled commit: `4b9d30f7953273e567a18eb819f4eddd45fcc877`

## OpenClaw path checks

Exists:

- `src/context-engine`
- `src/agents/pi-embedded-runner/run/attempt.ts`
- `src/agents/system-prompt.ts`
- `src/agents/pi-tools.ts`

Does not exist literally:

- `src/agents/pi-extensions/context-pruning`
- `src/agents/pi-extensions/compaction-safeguard.ts`
- `src/memory`

Observed nearby runner files:

- `src/agents/pi-embedded-runner/compact.ts`
- `src/agents/pi-embedded-runner/compact.runtime.ts`
- `src/agents/pi-embedded-runner/compact-reasons.ts`
- `src/agents/pi-embedded-runner/compaction-hooks.ts`
- `src/agents/pi-embedded-runner/compaction-runtime-context.ts`
- `src/agents/pi-embedded-runner/compaction-safety-timeout.ts`
- `src/agents/pi-embedded-runner/run/history-image-prune.ts`

## OpenClaw entrypoint evidence

From `src/context-engine/index.ts`:

- exports `ContextEngine`
- exports `AssembleResult`
- exports `CompactResult`
- exports maintenance and legacy helpers

From `src/agents/pi-embedded-runner/run/attempt.ts` imports:

- `runContextEngineMaintenance`
- `buildEmbeddedExtensionFactories`
- `buildEmbeddedSystemPrompt`
- `createOpenClawCodingTools`
- `assembleAttemptContextEngine`
- `finalizeAttemptContextEngineTurn`
- `runAttemptContextEngineBootstrap`
- `prependSystemPromptAddition`
- `composeSystemPromptWithHookContext`
- compaction timeout helpers
- history-image pruning

## CC path checks

Exists:

- `src/QueryEngine.ts`
- `src/query.ts`
- `src/Tool.ts`
- `src/services/SessionMemory`
- `src/services/extractMemories`
- `src/services/compact`
- `src/memdir`

## CC entrypoint evidence

From `src/QueryEngine.ts`:

- file comment: query lifecycle + session state owner
- stores mutable messages, total usage, read file state, discovered skill names, loaded nested memory paths

From `src/query.ts` imports:

- `buildPostCompactMessages`
- `createMicrocompactBoundaryMessage`
- `applyToolResultBudget`
- `handleStopHooks`
- `StreamingToolExecutor`

From `src/memdir/memdir.ts`:

- `ENTRYPOINT_NAME = 'MEMORY.md'`
- line cap: `MAX_ENTRYPOINT_LINES = 200`
- byte cap: `MAX_ENTRYPOINT_BYTES = 25_000`
- explicit duplicate-memory avoidance guidance
