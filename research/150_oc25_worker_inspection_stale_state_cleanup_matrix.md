# OC-25 Worker Inspection / Stale-State Cleanup Matrix

## Purpose

Define the exact host-side truth for when worker state is still live, when it is only a recent completed record, and when it has already been cleaned up enough that SNC should stop treating local worker memory as current runtime truth.

This packet exists to prevent ad hoc stale-worker cleanup rules in SNC's controller path.

## Scope

In scope:

- `src/agents/subagent-registry.ts`
- `src/agents/subagent-registry-run-manager.ts`
- `src/agents/subagent-registry-lifecycle.ts`
- `src/agents/subagent-registry-cleanup.ts`
- `src/agents/subagent-registry-helpers.ts`
- `src/agents/subagent-registry-queries.ts`
- `src/agents/subagent-control.ts`
- `src/agents/tools/subagents-tool.ts`
- `src/agents/tools/sessions-list-tool.ts`
- `src/agents/tools/session-status-tool.ts`
- `src/agents/tools/sessions-history-tool.ts`
- `src/agents/tools/sessions-send-tool.ts`

Out of scope:

- broader worker productization already covered by earlier packets
- SNC implementation edits
- generic delivery UI outside the worker/session inspection problem

## Verified Structure / Lifecycle / Contract

### Registration happens before cleanup truth exists

Verified in `subagent-registry-run-manager.ts`:

- `registerSubagentRun(...)` writes a run record immediately
- it then starts `waitForSubagentCompletion(...)`
- the run record starts with:
  - `cleanupHandled: false`
  - no `cleanupCompletedAt`
  - a live `childSessionKey`

This means a controller-owned run record can exist before there is meaningful post-launch truth about completion or announce delivery.

### Completion and cleanup are separate phases

Verified across `subagent-registry-run-manager.ts` and `subagent-registry-lifecycle.ts`:

1. a run reaches an end state (`endedAt`, `outcome`, `endedReason`)
2. frozen completion output may be captured
3. cleanup / announce flow runs
4. only after cleanup settles does the registry mark the run as fully cleaned:
   - `cleanupCompletedAt` for `cleanup: "keep"`
   - or full record removal for `cleanup: "delete"`

So "ended" is not the same as "fully cleaned up."

### Public seams are authoritative, but they each cover different truth

#### `subagents list`

Verified in `subagents-tool.ts` and `subagent-control.ts`:

- it is controller-owned truth
- it shows `active` and `recent` runs
- "recent" is bounded by `recentMinutes`
- old completed runs can disappear from `subagents list` even when session artifacts still exist

Meaning:

- absence from `subagents list` alone is not enough to conclude that the worker never existed or that every session artifact was cleaned up

#### `session_status`

- best public seam for current visible session state
- authoritative when a `childSessionKey` still resolves
- if it says the session is unknown or inaccessible, that is stronger than SNC-local memory

#### `sessions_history`

- best public seam for transcript truth when the session still exists and is visible
- useful for deciding whether a timed-out follow-up later produced visible output

#### `sessions_list`

- broader visible-session inventory
- useful when `subagents list` aged a run out of its recent window
- can still show the child session after controller-facing recent-run visibility has dropped

### Cleanup semantics inside the host

#### Keep-cleanup runs

Verified in `completeCleanupBookkeeping(...)`:

- `cleanup: "keep"` retains the run record
- the host sets `cleanupCompletedAt`
- the run becomes a completed record, not live work

#### Delete-cleanup runs

Verified in `completeCleanupBookkeeping(...)`, `sweepSubagentRuns(...)`, and `runSubagentAnnounceFlow(...)`:

- the run record can be removed from the registry
- the child session can be deleted with `sessions.delete`
- transcript deletion is part of that cleanup path

Meaning:

- later public "not found" results can be the expected success condition of cleanup

#### Orphan-prune runs

Verified in `reconcileOrphanedRun(...)`:

- if restored/resumed registry state no longer has a backing session entry or session id, the host prunes the run
- this is explicit stale-state cleanup, not accidental forgetting

### Stale-state decision matrix

| Situation | Strongest host truth to check first | What it means | Safe local-ledger action | Safe next action |
| --- | --- | --- | --- | --- |
| launched-but-not-yet-visible | `subagents list` plus `session_status` recheck | controller run exists, but session truth may not have stabilized yet | retain as live / inspect-needed | wait a little, then recheck before relaunch |
| running or spawned | `subagents list`, then `session_status` / `sessions_history` as needed | still live host work | retain as live | wait more, or use yield / inspect / steer / kill according to prior packets |
| completed-but-not-yet-announced | host still has ended run, but cleanup is not complete yet (`cleanupCompletedAt` absent internally) | result/announce handling is still in flight | retain as pending completion, not stale | wait/recheck; do not clear yet |
| timed-out follow-up | `sessions_history` or `session_status` for the target child session | this call did not observe a reply in time; host may still have later session truth | retain worker/session record until inspected | inspect first; do not clear on timeout alone |
| completed keep-cleanup run | `subagents list` recent view, then `sessions_list` / `session_status` if older | work is over, but a visible session/record may still remain | demote from live to recent/completed; keep fold-back history | relaunch only if a new job is actually needed |
| cleaned-up or no-longer-visible delete run | no live `subagents` record and no visible session tools resolve | host no longer exposes live runtime truth for that child | clear live-tracking assumptions; keep only historical notes if useful | relaunch later only as a new worker, not as a continuation |
| orphan-pruned restored run | host registry/session state is gone by design | stale restored run was explicitly invalidated | clear stale runtime record | treat any new attempt as a fresh launch |

### Two non-obvious cleanup boundaries

#### 1. Recent-window disappearance is not cleanup by itself

`buildSubagentList(...)` only includes:

- active runs
- and recent completed runs within the chosen `recentMinutes`

So an older completed `keep` run can disappear from `subagents list` while:

- the session still exists
- the transcript still exists
- and `sessions_list` / `session_status` can still show it

#### 2. Timeout is not stale-state evidence

From `sessions-send-tool.ts`:

- `timeout` means the wait window ended without a visible reply
- it does not itself prove that the child session is dead, cleaned up, or safe to purge from local state

So timeout belongs in the inspect-first lane, not the cleanup lane.

### Host truth versus SNC-local ledger

The correct precedence is:

1. public host session/subagent inspection
2. host cleanup semantics when known from accepted packets
3. SNC-local worker ledger

SNC-local state is useful for:

- remembering `childSessionKey`
- remembering `runId`
- preserving fold-back notes

But it is not authoritative when current host inspection says:

- the child session is gone
- the controller no longer has the run
- or the run was explicitly cleaned up/pruned

## Key Findings

- OpenClaw separates "run ended" from "cleanup settled." Treating every ended run as stale too early would erase valid completion/announce handling windows.
- `subagents list` is controller-owned and recent-window bounded; it is not a universal proof of whether a child session still exists.
- `session_status` and `sessions_history` are stronger than SNC-local memory when deciding whether a timed-out or ambiguous worker still has live state.
- `cleanup: "delete"` and orphan-prune paths can legitimately make a once-real child session disappear. Later "not found" is often successful cleanup, not contradictory evidence.
- Timeout is an inspection trigger, not a cleanup trigger.

## SNC Relevance

This packet directly informs SNC worker-state hygiene:

- keep local worker records long enough to support inspect-first recovery
- stop treating them as live once host truth says the run/session is gone
- distinguish "completed but pending cleanup" from "stale and safe to clear"

That is exactly the missing boundary for Milestone 2 operator-safe cleanup notes.

## Modification Guidance

- Wrap: any SNC cleanup helper should check `subagents list` and session tools before clearing live worker assumptions.
- Extend: if SNC adds a stale-worker doctor, teach it to distinguish recent-window disappearance from true no-longer-visible cleanup.
- Defer: automatic ledger pruning should wait until SNC has a conservative, host-truth-first rule set rather than age-only heuristics.
- Avoid: do not clear local worker state just because `sessions_send` timed out or because `subagents list` no longer shows an old completed run.

## Still-unverified questions

- This packet does not prove whether every deployment lane preserves identical session-visibility timing immediately after launch acceptance.
- The exact public visibility of older `keep` runs outside the default recent window still depends on operator choice of inspection tool and visibility policy.
- SNC-specific pruning policy is intentionally not designed here; this packet only establishes the host truth SNC should obey.
