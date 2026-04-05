# CC-17 Worker Resume Sanitization / Unresolved-Tool Cleanup Matrix

## Purpose

Capture the part of Claude Code's worker-resume behavior that is actually valuable to SNC: sanitized transcript re-entry, removal of unresolved tool artifacts, and preservation of safe replacement state. The point of this packet is to separate donor-grade resume hygiene from broader Claude Code product behavior.

## Scope

In scope:

- `src/tools/SendMessageTool/SendMessageTool.ts`
- `src/tools/AgentTool/resumeAgent.ts`
- `src/utils/messages.ts`
- `src/utils/conversationRecovery.ts`
- `src/utils/toolResultStorage.ts`

Out of scope:

- remote-agent product surfaces
- teammate UI or inbox flows
- generic delegation control semantics already covered by earlier packets

## Verified Structure / Lifecycle / Contract

### Live follow-up versus stopped-worker resume

Verified in `SendMessageTool.ts`, CC splits follow-up handling into two different lanes:

- if the worker is still running, it queues a pending message with `queuePendingMessage(...)`
- if the worker is stopped, or has no active task but still has transcript state, it uses `resumeAgentBackground(...)`

This means resume is not just a slower version of live follow-up. It is a different lifecycle with explicit transcript reconstruction.

### Resume entry order

Verified in `resumeAgent.ts`, `resumeAgentBackground(...)` proceeds in this order:

1. read transcript and agent metadata
2. fail immediately if no transcript exists
3. sanitize transcript with message filters
4. reconstruct replacement-state context from resumed content
5. validate and resolve the worktree path
6. append the fresh user follow-up message
7. register a new background task
8. start a new agent lifecycle asynchronously

This is resume by sanitized re-entry, not continuation of a paused in-memory coroutine.

### Transcript sanitization rules

Verified in `messages.ts`:

#### `filterUnresolvedToolUses(...)`

- scans tool-use ids and tool-result ids across the transcript
- computes unresolved tool-use ids
- removes assistant messages whose tool-use blocks are entirely unresolved

Meaning:

- CC will not blindly rehydrate half-open assistant tool invocations as if they had completed
- unresolved tool shells are treated as cleanup candidates before resume

#### `filterOrphanedThinkingOnlyMessages(...)`

- removes assistant messages that contain only thinking or redacted-thinking content
- keeps those thoughts only when a sibling message with the same `message.id` contains non-thinking content

Meaning:

- thinking fragments are preserved only when they still belong to a real assistant message
- pure orphaned thinking artifacts are dropped before resume

#### `filterWhitespaceOnlyAssistantMessages(...)`

- removes assistant messages that contain no meaningful content beyond whitespace
- then merges adjacent user messages to keep the recovered transcript structurally sane

Meaning:

- CC explicitly repairs malformed or useless assistant residue before re-entry

### Recovery doctrine beyond the one resume helper

Verified in `conversationRecovery.ts`, `deserializeMessagesWithInterruptDetection(...)` uses the same filter chain:

- unresolved tool cleanup
- orphaned thinking-only cleanup
- whitespace-only assistant cleanup

This shows the behavior is not a one-off convenience in `resumeAgent.ts`. It is part of a broader recovery doctrine.

### Preserved replacement state

Verified in `toolResultStorage.ts`:

- `reconstructContentReplacementState(...)` restores previously seen tool-result ids and replacement records from resumed messages
- `reconstructForSubagentResume(...)` can combine resumed transcript evidence with inherited replacement state from the parent

Meaning:

- resume is not a raw transcript replay
- CC deliberately preserves safe prior replacement decisions while cleaning away unresolved tool shells

### Resume-sanitization matrix

| Situation | CC lane | Sanitization applied? | What is preserved | What is discarded or cleaned |
| --- | --- | --- | --- | --- |
| live worker follow-up | queue pending message | no resume filter pass | current live task state | none at resume layer |
| stopped worker with transcript | `resumeAgentBackground(...)` | yes | resolved transcript, replacement state, fresh follow-up prompt | unresolved tool-use shells, orphaned thinking-only messages, whitespace-only assistant residue |
| transcript recovery after interruption | recovery helpers | yes | valid message history and tool-result replacement context | same cleanup categories as resume |

## Key Findings

- CC resume is not "continue where it stopped" in a literal runtime sense. It is sanitized transcript re-entry into a new background task.
- The most valuable donor behavior is negative control: removing unresolved tool-use scaffolding before resume.
- CC treats orphaned thinking-only fragments and whitespace-only assistant residue as recovery noise, not durable conversational truth.
- Replacement-state reconstruction is preserved even while unresolved tool shells are discarded. This keeps useful prior tool-result substitutions without pretending unfinished tool calls succeeded.
- The same cleanup logic appears in broader recovery utilities, which suggests a stable doctrinal pattern rather than a one-off patch.

## SNC Relevance

This packet sets the bar for any future SNC "resume" claim:

- a believable resume feature needs sanitize-before-re-entry behavior
- unresolved tool artifacts should be cleaned before relaunching or replaying worker context
- preserved worker memory should not imply preservation of half-open tool execution

SNC currently has worker state and diagnostics, but not this sanitize-before-resume substrate. That means SNC should keep resume language narrow until equivalent hygiene exists.

## Modification Guidance

- Wrap: if SNC later adds resume, define it as transcript or state re-entry after cleanup, not as continuation of unresolved tool execution.
- Extend: copy the donor idea of filtering unresolved tool-use artifacts, orphaned thinking-only fragments, and empty assistant residue before re-entry.
- Defer: do not promise worker resume semantics in SNC release docs until a concrete sanitization pipeline exists.
- Avoid: do not treat stored worker history or `stateDir` persistence as proof that half-complete tool calls can safely continue.

## Still-unverified questions

- This packet did not reopen every downstream caller of the recovery helpers, only the paths directly tied to worker resume and transcript recovery.
- The exact UX wording Claude Code uses around resume versus restart was not the focus here; the packet focuses on mechanism, not product copy.
- Whether SNC should sanitize prompt-side worker summaries, transcript snapshots, or both remains an open design question for a future implementation packet.
