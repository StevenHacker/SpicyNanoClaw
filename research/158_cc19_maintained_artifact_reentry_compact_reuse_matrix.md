# CC-19 Maintained-Artifact Reentry / Compaction-Reuse Matrix

## Purpose

Pin down which maintained artifacts CC actually reuses across compaction and re-entry, and separate donor-worthy runtime substrate from product-shell smoothing.

## Scope

Focused on session-memory reuse, transcript reconstruction, content-replacement replay, and full-compaction maintained artifacts. This packet does not try to restate all of CC memory or delegation product behavior.

## Verified Structure / Lifecycle / Contract

### Primary entry files

- `data/external/claude-code-leeyeel-4b9d30f/src/services/compact/autoCompact.ts`
- `data/external/claude-code-leeyeel-4b9d30f/src/services/compact/sessionMemoryCompact.ts`
- `data/external/claude-code-leeyeel-4b9d30f/src/services/compact/compact.ts`
- `data/external/claude-code-leeyeel-4b9d30f/src/tools/AgentTool/resumeAgent.ts`
- `data/external/claude-code-leeyeel-4b9d30f/src/utils/toolResultStorage.ts`
- `data/external/claude-code-leeyeel-4b9d30f/src/utils/conversationRecovery.ts`

### Two maintained-artifact classes

| Artifact class | Verified owner/path | Verified use |
| --- | --- | --- |
| Session memory + `lastSummarizedMessageId` | session-memory compaction path | compact reuse when a maintained summary artifact already exists |
| `ContentReplacementState` + content-replacement records | transcript reconstruction / resume path | exact replay of prior reduction decisions during re-entry |

### Compaction reuse path

`autoCompactIfNeeded(...)` tries `trySessionMemoryCompaction(...)` before full `compactConversation(...)`.

Verified `trySessionMemoryCompaction(...)` flow:

| Step | Verified behavior |
| --- | --- |
| 1 | wait for in-flight session-memory extraction |
| 2 | load `getLastSummarizedMessageId()` and `getSessionMemoryContent()` |
| 3 | return `null` if session memory is missing or empty template |
| 4 | compute invariant-preserving `messagesToKeep` tail |
| 5 | run `processSessionStartHooks('compact', ...)` |
| 6 | build compaction result from maintained session memory plus kept tail |
| 7 | build post-compact messages |
| 8 | reject reuse path if resulting tokens still exceed threshold |

### Re-entry / resume path

`resumeAgentBackground(...)` does not resume from session memory. Instead it reconstructs from transcript + maintained replacement state:

- load transcript and metadata
- filter whitespace-only assistant messages
- filter orphaned thinking-only messages
- filter unresolved tool uses
- rebuild replacement state via `reconstructForSubagentResume(...)`
- append a fresh user message
- register a new background task

This is sanitized re-entry, not exact continuation of an interrupted execution frame.

### Maintained replacement artifact truth

`toolResultStorage.ts` stores exact replacement records and reconstructs `ContentReplacementState`. That means CC preserves prior reduction decisions precisely enough to replay them during resume/re-entry. This is a deeper donor asset than product-language claims like "full context preserved."

### Full compaction maintained artifacts

`compact.ts` rebuilds a runnable post-compact packet, including maintained tail, boundary annotations, plan attachment, async/file attachments, deferred-tools metadata, MCP delta material, and re-appended session metadata. Full compaction is not just "summary text"; it is a maintained runnable re-entry package.

### Donor-value boundary matrix

| Layer | Donor-worthy substrate | Product-shell smoothing |
| --- | --- | --- |
| Compaction reuse | maintained summary artifact reuse with threshold checks | user-facing simplification about context preservation |
| Resume/re-entry | sanitize-before-reentry, replacement-state replay, unresolved-tool cleanup | wording that makes resume sound like exact continuation |
| Full compact output | maintained runnable post-compact packet | product comfort language around invisible continuity |

## Key Findings

1. CC has two distinct maintained-artifact contracts: session-memory reuse for compaction, and transcript/replacement-state reconstruction for re-entry.
2. Resume in CC is sanitize-first and re-entry-oriented, not an exact continuation of half-finished tool execution.
3. The strongest donor value for SNC or future custom Claw is maintained-artifact discipline, not shell-level wording.

## SNC Relevance

For SNC, the useful donor pattern is:

- reuse maintained artifacts only when invariant checks still pass
- sanitize unresolved tool/thinking residue before re-entry
- distinguish "reconstructed re-entry" from "continued exact execution"

This directly informs any future SNC follow-up/resume work without overclaiming current Milestone 2 behavior.

## Modification Guidance

- Wrap: operator and product wording that distinguishes re-entry from exact resume.
- Extend: maintained-artifact bookkeeping if SNC later adds richer compaction/re-entry behavior.
- Defer: product-shell comfort language until the underlying maintained-artifact substrate exists.
- Avoid: copying CC’s outward messaging without copying its sanitize/replay discipline.
- Do-not-touch: donor boundary between runtime substrate and Anthropic-specific product smoothing.

## Still-unverified questions

- How much of CC’s maintained-artifact/replay substrate is intended to remain stable versus being product-internal implementation.
- Whether later CC paths add more archival/GC treatment around maintained artifacts beyond the verified compaction and resume flows.
- Which subset of this substrate is worth lifting into a future custom-Claw kernel versus remaining SNC-specific helper logic.
