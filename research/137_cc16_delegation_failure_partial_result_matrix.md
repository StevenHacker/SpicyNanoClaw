# CC-16 Delegation Failure / Partial-Result Salvage Matrix

## Purpose

Pin down what CC actually preserves when delegated work stops, fails, or is resumed, and separate the reusable donor logic from CC-specific product shells. This packet is about failure and salvage rules, not about broad delegation architecture.

## Scope

- Repo: `data/external/claude-code-leeyeel-main`
- Focus:
  - local background-agent stop, failure, and resume
  - in-process teammate variation where relevant
  - remote-agent and remote-review salvage only where it changes the donor story
  - partial-result preservation versus discard
  - retry, resume, and stop distinctions
- Main entry files:
  - `data/external/claude-code-leeyeel-main/src/tools/AgentTool/agentToolUtils.ts`
  - `data/external/claude-code-leeyeel-main/src/tasks/LocalAgentTask/LocalAgentTask.tsx`
  - `data/external/claude-code-leeyeel-main/src/tools/AgentTool/resumeAgent.ts`
  - `data/external/claude-code-leeyeel-main/src/tools/SendMessageTool/SendMessageTool.ts`
  - `data/external/claude-code-leeyeel-main/src/tasks/InProcessTeammateTask/InProcessTeammateTask.tsx`
  - `data/external/claude-code-leeyeel-main/src/tasks/RemoteAgentTask/RemoteAgentTask.tsx`
  - `data/external/claude-code-leeyeel-main/src/tasks/stopTask.ts`

## Verified Structure / Lifecycle / Contract

### 1. Local background-agent completion salvage

Verified completion behavior for local delegated agents:

- `finalizeAgentTool(...)` first tries the last assistant message.
- if that last assistant message is pure `tool_use` with no text, it walks backward and uses the most recent assistant message that still has text.
- `completeAgentTask(...)` stores the completed result.
- `enqueueAgentNotification(...)` carries the final message text to the coordinator side.

This is important donor evidence:

- CC does not require the final turn to end on a clean text-only assistant message.
- completion salvage is text-first.
- "last meaningful assistant text" is a real preserved artifact.

### 2. Local background-agent kill and partial-result preservation

Verified kill path in `runAsyncAgentLifecycle(...)`:

- aborts are caught as `AbortError`
- status is transitioned to `killed`
- `extractPartialResult(agentMessages)` walks backward through assistant messages and returns the latest text content it can find
- the killed-task notification includes that partial result as `finalMessage`

`stopTask.ts` explicitly documents why agent kills are not treated like noisy shell kills:

- shell kills suppress exit-noise notifications
- agent kills keep the notification because `extractPartialResult(agentMessages)` is useful payload

So for local agents, a user stop is not a discard path. It is a salvage path.

### 3. Local background-agent hard failure behavior

Verified non-abort failure path:

- generic exceptions call `failAgentTask(...)`
- task status becomes `failed`
- failure notification includes the error message
- there is no equivalent partial-result attachment in this generic hard-failure path

This creates a sharp donor distinction:

- `killed` preserves partial assistant text
- generic `failed` preserves the failure reason, not an automatically salvaged partial answer

### 4. Transcript-based resume contract

Verified `resumeAgentBackground(...)` behavior:

- reads persisted transcript and metadata
- filters:
  - whitespace-only assistant messages
  - orphaned thinking-only messages
  - unresolved tool uses
- reconstructs tool-result replacement state for resume
- appends the new user prompt
- re-registers the agent as a background task

This is not "continue the exact interrupted tool call."

It is:

- sanitize transcript
- rebuild resumable context
- start a new background run from that cleaned state

### 5. Follow-up versus resume distinction

Verified `SendMessageTool` behavior for local agents:

| Worker condition | Tool behavior | Meaning |
| --- | --- | --- |
| local agent task exists and is `running` | `queuePendingMessage(...)` | follow-up stays inside the current live worker |
| local agent task exists but is stopped | `resumeAgentBackground(...)` | stopped worker is resumed from transcript with the new message |
| task was evicted from app state but transcript still exists | `resumeAgentBackground(...)` from disk | resume is still possible without live task presence |
| resume fails | explicit error to caller | stop and resume are separate verbs, not silently merged |

This is one of the most reusable donor rules in CC:

- follow up to a running worker
- resume a stopped worker
- do not pretend those are the same operation

### 6. In-process teammate variation

Verified in-process teammate differences:

- `injectUserMessageToTeammate(...)` accepts messages while running or idle
- terminal states reject injection
- shutdown is a separate request or approval flow
- shutdown approval aborts the in-process teammate or falls back to graceful shutdown

What is missing compared with local background agents:

- no equivalent transcript-based resume contract is exposed here
- no explicit `extractPartialResult(...)` salvage path is visible here

So in-process teammate control is useful donor material for control separation, but weaker donor material for partial-result salvage.

### 7. Remote-agent and remote-review variation

Verified remote-agent behavior:

- generic remote tasks poll until completion or failure and send generic completed or failed notifications
- killing a remote task archives the remote session and stops polling
- generic remote-agent failure does not show the same local partial-text salvage contract as background local agents

Verified remote-review special case:

- review output is extracted from tagged hook or assistant events
- if found, findings are injected directly into the local task notification
- if not found, CC emits a review-specific failure message

This is salvage, but it is strongly product-coupled:

- tied to remote review workflow
- tied to review or ultraplan tag conventions
- not a general worker-failure donor contract

### 8. Failure and salvage matrix

| Delegation type | Stop or failure condition | Preserved artifact | Next verb | Donor value |
| --- | --- | --- | --- | --- |
| local background agent | normal success but final message has no text | most recent assistant text | complete | high |
| local background agent | user kill or abort | latest assistant text via `extractPartialResult(...)` | stop, then maybe later resume | high |
| local background agent | generic runtime error | error message, plus transcript on disk | inspect, maybe resume manually | high |
| local background agent | stopped worker receives new user follow-up | transcript is cleaned and resumed | resume | high |
| in-process teammate | running or idle receives message | pending message queue and visible transcript entry | follow up | medium |
| in-process teammate | shutdown requested or approved | control message plus abort path | stop | medium |
| remote review | output produced before remote failure boundary | extracted tagged review content | accept findings | low, product-coupled |
| generic remote agent | killed or failed | generic task status and session archive | stop or retry | low, product-coupled |

## Key Findings

1. CC's strongest reusable partial-result salvage logic is local-agent specific:
   - successful completion falls back to the latest meaningful assistant text
   - killed agents preserve partial assistant text
   - generic hard failures preserve error, not partial answer
2. Resume is transcript reconstruction, not resurrection of half-finished tool calls. CC explicitly filters unresolved tool uses and other non-resumable artifacts before resuming.
3. CC sharply separates:
   - follow-up to a live worker
   - resume of a stopped worker
   - shutdown or kill of a worker
4. Remote review and ultraplan salvage are real, but they are service or product shells rather than portable delegation donor substrate.

## SNC Relevance

This packet directly informs SNC worker failure handling:

- preserve the last trustworthy worker text on explicit stop or abort
- do not promise generic partial-result salvage on every hard error
- keep "follow up" and "resume" separate
- treat transcript cleanup before resume as first-class, not optional

That is enough donor value for Milestone 2 without importing CC's remote-review or team-product shell.

## Modification Guidance

- `wrap`:
  - SNC should preserve partial helper output on operator stop or controller abort, using a last-meaningful-text rule.
  - SNC should separate live follow-up from stopped-worker resume in user and operator wording.
- `extend`:
  - If SNC adds resume, it should resume from sanitized persisted state, not from unresolved half-open tool activity.
  - SNC can reuse the donor idea of "status first, embellishments later": mark the worker ended, then compute extra diagnostics.
- `defer`:
  - remote-review-style tag extraction
  - bridge-specific or mailbox-specific control surfaces
  - service-coupled remote orchestration
- `avoid`:
  - Do not claim that every worker failure can yield a useful partial answer.
  - Do not merge kill, fail, and resume into one generic "recover worker" action.
  - Do not import CC remote review or ultraplan shells into SNC Milestone 2 wording.

## Still-unverified questions

1. Whether later CC revisions add a generic hard-failure partial-result salvage path beyond current abort handling.
2. Whether SNC should preserve partial helper output only for explicit stop, or also for selected host-detected failure classes.
3. How far SNC should go in transcript sanitation if it later supports helper resume across host restarts.
