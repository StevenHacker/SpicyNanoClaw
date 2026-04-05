# CC-18 Resume Outcome Communication / Restart Boundary Matrix

## Purpose

Sharpen the Claude Code donor read from "resume sanitizes transcript state" to "how CC honestly communicates continue, resume, restart, stop, and partial carry-forward." This packet exists so SNC can borrow the boundary discipline without inheriting CC-specific product phrasing that overstates what resume means.

## Scope

In scope:

- `src/tools/SendMessageTool/SendMessageTool.ts`
- `src/tools/AgentTool/resumeAgent.ts`
- `src/tools/AgentTool/agentToolUtils.ts`
- `src/tools/AgentTool/prompt.ts`
- `src/tools/AgentTool/AgentTool.tsx`
- `src/utils/task/framework.ts`

Out of scope:

- broader teammate / remote-agent product surfaces
- generic resume sanitization internals already covered by `CC-17`
- SNC implementation edits

## Verified Structure / Lifecycle / Contract

### CC uses different outward language for different control lanes

Verified in `SendMessageTool.ts`:

#### Live follow-up

If the local agent task is still running:

- CC queues a pending message
- outward wording is:
  - `Message queued for delivery ... at its next tool round.`

This is not resume or restart language. It is explicit live follow-up language.

#### Stopped worker with task state still present

If the task exists but is stopped:

- CC calls `resumeAgentBackground(...)`
- outward wording is:
  - `was stopped (...)`
  - `resumed it in the background with your message`
  - `You'll be notified when it finishes`

#### Task evicted from in-memory state, transcript still available

If there is no active task object but transcript exists:

- CC still calls `resumeAgentBackground(...)`
- outward wording becomes:
  - `had no active task`
  - `resumed from transcript in the background`

#### No honest resume lane

If transcript recovery fails:

- outward wording becomes:
  - `has no transcript to resume`
  - `It may have been cleaned up`

That is an explicit no-resume case, not a degraded continue case.

### Mechanism boundary: "resume" means re-entry, not runtime continuation

From `resumeAgent.ts` and the already accepted `CC-17` packet:

- `resumeAgentBackground(...)` reconstructs from transcript
- sanitizes unresolved tool artifacts
- rebuilds replacement state
- appends a fresh user message
- registers a new background task

So the truthful donor mechanism is:

- sanitized re-entry into a new background task

not:

- continue the previous runtime exactly where it was interrupted

### Restart / relaunch boundary is explicit in prompt text

Verified in `AgentTool/prompt.ts`:

- continuing a previously spawned agent uses `SendMessage`
- fresh `Agent` invocations start fresh

The prompt text says both:

- "`SendMessage` ... resumes with its full context preserved"
- and "Each fresh Agent invocation starts fresh"

That pair is important:

- the first sentence is product-facing shorthand
- the second sentence is the real restart boundary

The donor-grade lesson is the boundary itself, not the exact phrase "full context preserved."

### Partial-result carry-forward is selective

Verified in `agentToolUtils.ts` and `AgentTool.tsx`:

- on abort / explicit kill, CC extracts a `partialResult` from the latest assistant text and includes it in the killed notification
- on generic failure, CC sends a failed notification without automatic partial carry-forward

So CC does not universally say "resume from partial progress" after every bad outcome.

It distinguishes:

- stopped/killed with partial salvage
- failed without confident salvage

### Task/UI layer smooths the product feel

Verified in `utils/task/framework.ts`:

- resume replacement is treated as a task replacement, not a new start event
- UI-held state is carried forward on re-register
- human-readable `killed` status text is `was stopped`

These are useful product-shell clues, but they are not the core donor mechanism.

### Resume / restart boundary matrix

| Situation | CC outward wording | Runtime truth underneath | Donor value | Product-coupled layer |
| --- | --- | --- | --- | --- |
| live follow-up | "Message queued for delivery ..." | current task stays live | high | low |
| sanitized resume from stopped task | "was stopped ... resumed it in the background" | new background task created from sanitized transcript state | high | medium |
| sanitized resume from transcript only | "had no active task; resumed from transcript" | transcript-based re-entry despite missing active task object | high | medium |
| clean restart / relaunch | fresh Agent invocation starts fresh | no prior runtime continuity assumed | high | low |
| killed worker with salvage | stopped/killed notification can carry partial result | last trusted assistant text preserved | medium-high | low |
| generic failure | failed notification without guaranteed salvage | no honest partial carry-forward guarantee | high | low |
| no-honest-resume case | "no transcript to resume" / cleanup wording | resume lane unavailable | high | low |

### Where CC wording is stronger than the donor mechanism

The clearest example is the prompt sentence:

- "resumes with its full context preserved"

Mechanically, the accepted evidence is narrower:

- transcript history is filtered
- unresolved tool shells are removed
- replacement state is reconstructed
- a new run starts

So the transferable principle is:

- preserve safe context across re-entry

not:

- promise literal uninterrupted continuation

## Key Findings

- CC communicates live follow-up, sanitized resume, restart, and no-resume as separate lanes instead of collapsing them into one "continue" concept.
- The most valuable donor pattern is honesty about when resume is impossible: no transcript, no reconstructed parent context, or no safe state to re-enter.
- Partial-result carry-forward is conditional. CC preserves it on explicit stop/kill paths, not as a blanket rule for every failure.
- Prompt/UI phrases such as "full context preserved," "you'll be notified," and "was stopped" are product-shell language layered on top of a narrower runtime truth.
- The clean donor boundary is: queue when live, sanitize before re-entry when stopped, start fresh when relaunching, and refuse false resume claims when reconstruction is not safe.

## SNC Relevance

This packet gives SNC the last wording boundary it needs before stronger worker docs:

- follow-up should stay separate from resume
- resume should stay separate from relaunch
- salvage should stay separate from generic failure
- no-resume cases should be stated plainly instead of hidden behind optimistic wording

That is exactly what SNC needs for honest Milestone 2 operator copy.

## Modification Guidance

- Wrap: if SNC later adds resume, define the outward copy around sanitized re-entry, not exact continuation.
- Extend: if SNC preserves partial worker output, do it only on explicit trusted-stop lanes, not on every failure path.
- Defer: do not borrow CC's strongest product phrases literally until SNC has the same substrate and notification model.
- Avoid: do not say "full context preserved" or "continues where it left off" unless SNC can defend those claims with real sanitize-and-reentry machinery.

## Still-unverified questions

- This packet does not attempt a full audit of every UI string that references stopped or resumed agents across the CC product.
- The exact user-facing distinction between resume and restart in all teammate-specific surfaces was not reopened here.
- SNC still needs a separate implementation packet if it ever decides to build resume rather than keeping relaunch and inspection as the only honest lanes.
