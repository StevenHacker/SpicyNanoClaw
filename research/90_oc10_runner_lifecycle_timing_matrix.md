# OC-10 OpenClaw Runner Lifecycle Timing Matrix

## Purpose

This packet pins the exact runner-side timing of an OpenClaw embedded turn.

The goal is not to restate that `run.ts` calls `attempt.ts`. The goal is to verify, in code order:

- where a run-level `contextEngine` is created and reused
- what happens before the prompt is sent
- how in-attempt delegated compaction differs from run-level recovery compaction
- where timeout and overflow branches split
- which lifecycle seams are safe for SNC to depend on

This packet is written to support SNC Milestone 1 integration work, especially worker runtime wiring, continuity state, and future hook/context-engine extensions.

## Scope

This packet stays strictly on runner lifecycle and timing order inside OpenClaw's embedded runner.

It covers:

- normal turn timing
- timeout path
- overflow path
- delegated compaction path
- direct implications for SNC integration safety

It does not attempt to re-document unrelated product shell behavior, provider catalog policy, or plugin marketplace behavior.

## Main Entry Files

- `data/external/openclaw-v2026.4.1/src/agents/pi-embedded-runner/run.ts`
- `data/external/openclaw-v2026.4.1/src/agents/pi-embedded-runner/run/attempt.ts`
- `data/external/openclaw-v2026.4.1/src/agents/pi-embedded-runner/run/attempt.context-engine-helpers.ts`
- `data/external/openclaw-v2026.4.1/src/agents/pi-embedded-runner/run/attempt.prompt-helpers.ts`
- `data/external/openclaw-v2026.4.1/src/agents/pi-embedded-runner/run/compaction-timeout.ts`
- `data/external/openclaw-v2026.4.1/src/agents/pi-embedded-subscribe.ts`
- `data/external/openclaw-v2026.4.1/src/agents/pi-embedded-subscribe.handlers.compaction.ts`
- `data/external/openclaw-v2026.4.1/src/agents/pi-embedded-runner/context-engine-maintenance.ts`
- `data/external/openclaw-v2026.4.1/src/agents/pi-embedded-runner/compact.ts`

## Verified Structure / Lifecycle / Contract

### 1. Run-level ownership starts in `run.ts`, and the same context engine is reused across retries

`runEmbeddedPiAgent(...)` resolves the active `contextEngine` once before entering the retry loop, then reuses that same engine instance across repeated calls to `runEmbeddedAttempt(...)`.

That means OpenClaw's timing model is not "new engine per attempt". For SNC, any plugin-owned continuity state that lives inside the engine instance should be treated as run-scoped unless the engine implementation explicitly resets itself.

`run.ts` also defines run-owned compaction hook shims:

- `runOwnsCompactionBeforeHook(...)`
- `runOwnsCompactionAfterHook(...)`

Those shims only execute when `contextEngine.info.ownsCompaction === true`.

### 2. Normal turn timing inside `attempt.ts` is ordered and layered

The verified normal-path order is:

| Stage | Trigger | Verified order | Notes |
| --- | --- | --- | --- |
| 1 | attempt start | repair session file, compute `hadSessionFile`, open guarded `SessionManager` | Transcript repair and write-guard happen before prompt work |
| 2 | existing session only | `runAttemptContextEngineBootstrap(...)` | Runs only if session file already existed and engine has `bootstrap` or `maintain` |
| 3 | session bootstrap | create agent session, apply base system prompt override | Session object exists before transcript sanitation |
| 4 | prompt preparation | sanitize history, validate turns, limit history, repair tool-use/result pairing | This is the prompt-side transcript baseline |
| 5 | context-engine assemble | `assembleAttemptContextEngine(...)` can replace messages and prepend `systemPromptAddition` | Context-engine assembly runs before prompt-build hooks |
| 6 | prompt-build hook phase | `resolvePromptBuildHookResult(...)` may prepend prompt context or override/extend system prompt | Hooks can still modify prompt/system prompt after context-engine assemble |
| 7 | prompt execution | `activeSession.prompt(...)` runs | This is the main LLM turn |
| 8 | post-prompt compaction wait | `waitForCompactionRetryWithAggregateTimeout(...)` waits for in-attempt compaction retry completion | This is the delegated compaction rendezvous point |
| 9 | snapshot resolution | append cache TTL only if safe, select current or pre-compaction snapshot | Timeout during compaction changes which snapshot is trusted |
| 10 | context-engine turn finalization | `afterTurn(...)` or `ingestBatch(...)` / `ingest(...)` fallback | Happens after prompt and compaction-retry wait |
| 11 | maintenance | `runContextEngineMaintenance(... reason: "turn")` | Runs only if no prompt error, no abort, no yield-abort, and post-turn finalization succeeded |
| 12 | teardown | `agent_end` hooks fire-and-forget, then cleanup and unsubscribe | `agent_end` still runs even on compaction timeout |

Two ordering facts matter for SNC:

1. context-engine `assemble(...)` is not the last writer of prompt context; `before_prompt_build` can still override system prompt after that
2. `afterTurn(...)` runs after the compaction-retry wait, not immediately after the first prompt call returns

### 3. Bootstrap timing is narrower than a generic "before turn" hook

`runAttemptContextEngineBootstrap(...)` only runs when:

- the session file already existed
- and the engine has `bootstrap` or `maintain`

Its internal order is:

1. call `contextEngine.bootstrap(...)` if present
2. call maintenance with `reason: "bootstrap"`
3. swallow failures into warnings

So bootstrap is an "existing transcript warm-start" phase, not a universal first-turn lifecycle callback.

### 4. Timeout behavior has two layers: in-attempt grace, then run-level timeout recovery

Inside `attempt.ts`, the runner does not immediately abort when the main timeout hits during compaction.

The verified order is:

1. initial abort timer expires
2. `resolveRunTimeoutDuringCompaction(...)` checks whether compaction is pending or in flight
3. if compaction is active and grace has not yet been used, the run extends once by `compactionTimeoutMs`
4. if timeout hits again, or compaction is not active, the run aborts
5. `timedOutDuringCompaction` is flagged when timeout/abort happened while compaction was pending or in flight
6. snapshot selection prefers the pre-compaction snapshot when available

This is different from run-level timeout recovery in `run.ts`.

After an attempt returns, `run.ts` only enters explicit timeout recovery when:

- `timedOut === true`
- `timedOutDuringCompaction === false`
- prompt-token usage ratio is above `0.65`
- `timeoutCompactionAttempts < 2`

The verified timeout-recovery order in `run.ts` is:

1. increment timeout compaction attempt counter
2. fire `runOwnsCompactionBeforeHook("timeout recovery")` when engine-owned compaction is active
3. build timeout recovery runtime context with `trigger: "timeout_recovery"`
4. call `contextEngine.compact(...)` with `force: true` and `compactionTarget: "budget"`
5. fire `runOwnsCompactionAfterHook("timeout recovery", result)`
6. if compacted:
7. increment `autoCompactionCount`
8. if engine owns compaction, run `runPostCompactionSideEffects(...)`
9. `continue` the outer loop and retry the prompt
10. otherwise fall through to normal failover/error handling

Important code fact: this timeout-recovery branch does not explicitly call `runContextEngineMaintenance(... reason: "compaction")`.

### 5. Overflow recovery is a different branch with different bookkeeping

`run.ts` derives `contextOverflowError` from either:

- `promptError`
- or assistant-side error text

It then splits into three distinct sub-branches.

#### 5.1 Overflow after in-attempt delegated compaction

If the attempt already compacted (`attempt.compactionCount > 0`) and the overflow is not classified as a compaction failure:

1. increment `overflowCompactionAttempts`
2. do not compact again immediately
3. `continue` and retry the prompt without additional explicit compaction

The code comment explicitly frames this as the "SDK auto-compaction" case.

#### 5.2 Overflow without prior in-attempt compaction

If the attempt did not already compact, and overflow attempts are still below the cap:

1. increment `overflowCompactionAttempts`
2. fire `runOwnsCompactionBeforeHook("overflow recovery")` when applicable
3. build overflow runtime context with `trigger: "overflow"` and observed token count when available
4. call `contextEngine.compact(...)`
5. if compaction succeeds, explicitly run `runContextEngineMaintenance(... reason: "compaction")`
6. fire `runOwnsCompactionAfterHook("overflow recovery", result)`
7. if compacted, increment `autoCompactionCount` and retry the prompt
8. if not compacted, fall through to truncation / failure handling

This branch does have an explicit post-compaction maintenance call.

#### 5.3 Oversized tool-result fallback

If overflow remains unresolved, `run.ts` can fall back to:

1. `sessionLikelyHasOversizedToolResults(...)`
2. `truncateOversizedToolResultsInSession(...)`
3. retry prompt if truncation succeeded

This is not the same as compaction. It is a transcript surgery fallback for oversize tool payloads.

### 6. Delegated compaction is an attempt-internal lifecycle driven by session events

The delegated compaction path is not implemented in `run.ts`. It is tracked through `subscribeEmbeddedPiSession(...)` and its event handlers.

The verified delegated-compaction order is:

| Stage | Event / trigger | Verified order | Effect on outer runner |
| --- | --- | --- | --- |
| 1 | `auto_compaction_start` | mark `compactionInFlight = true`, create compaction wait promise, emit compaction event, run `before_compaction` hook fire-and-forget | attempt now treats compaction as active |
| 2 | compaction completes with result | `auto_compaction_end` clears `compactionInFlight`; if successful and not aborted, increment `compactionCount` | `attempt.compactionCount` becomes visible to `run.ts` |
| 3 | compaction will retry prompt | `willRetry === true` causes `noteCompactionRetry()` and `resetForCompactionRetry()` | attempt waits for retry completion before final snapshot/finalization |
| 4 | compaction ended without retry | resolve compaction wait and clear stale assistant usage snapshots | attempt can finish normally |
| 5 | after compaction | `after_compaction` hook only fires on `willRetry === false` in the session-event path | different hook timing from run-level recovery compaction |
| 6 | prompt path re-enters | `waitForCompactionRetryWithAggregateTimeout(...)` blocks until retry completes or aggregate timeout expires | timeout here can set `timedOutDuringCompaction` |

So delegated compaction is a session-level retry lifecycle, not a late cleanup step.

### 7. Direct runner-exposed compaction has a third timing shape

The exported `compactEmbeddedPiSession(...)` path in `compact.ts` also matters because SNC may later use it or imitate it.

Its verified order is:

1. enqueue on session lane and global lane
2. resolve context engine
3. if engine owns compaction, manually fire `before_compaction`
4. call `contextEngine.compact(...)`
5. if compacted, run `runContextEngineMaintenance(... reason: "compaction")`
6. if engine owns compaction, run `runPostCompactionSideEffects(...)`
7. if engine owns compaction and compaction succeeded, manually fire `after_compaction`

This direct compaction API is more symmetric than timeout recovery inside `run.ts`.

## Key Findings

### 1. The same context engine instance survives across run-loop retries

OpenClaw does not resolve a fresh engine for every attempt. Retry loops reuse the same engine instance. SNC should treat engine-local state as run-scoped unless it deliberately reinitializes.

### 2. Timeout recovery and overflow recovery are not symmetric

Overflow recovery explicitly runs context-engine maintenance after successful compaction. Timeout recovery does not show the same explicit maintenance call. Any SNC logic that expects all successful compactions to be followed by maintenance will be wrong.

### 3. Delegated compaction is a real lifecycle branch, not just "compaction happened"

The attempt subscribes to `auto_compaction_start` / `auto_compaction_end`, waits for retry completion, and reports `compactionCount` back to `run.ts`. That count directly changes overflow recovery behavior on the next branch decision.

### 4. Prompt shaping order is layered, not single-owner

Prompt context can be shaped by:

1. base system prompt construction
2. context-engine `assemble(...)`
3. context-engine `systemPromptAddition`
4. prompt-build hooks that can still override or wrap the system prompt

SNC should not assume one hook owns the final prompt surface.

### 5. Timeout during compaction uses snapshot fallback, not transcript trust

When compaction times out, the runner can prefer the pre-compaction snapshot instead of the current live session messages. This is a strong signal that OpenClaw treats the transcript as temporarily unstable during compaction.

## SNC relevance

This packet directly matters to SNC in five places.

1. `engine.afterTurn(...)` in SNC worker runtime wiring sits after prompt execution and after delegated compaction retry wait, so it can safely observe the final turn snapshot but should not assume compaction-free timing.

2. SNC continuity or durable-memory code should prefer context-engine lifecycle seams such as `bootstrap`, `assemble`, `afterTurn`, and `maintain` instead of trying to write directly into runner internals.

3. SNC compaction-aware features must treat timeout recovery and overflow recovery differently. A post-compaction refresh step that works on overflow may not fire on timeout recovery unless SNC adds its own wrapper.

4. SNC should not insert transcript-mutating side effects between prompt completion and compaction-retry settlement. OpenClaw deliberately waits for compaction retry resolution before selecting the final snapshot and before turn finalization.

5. The safest host-grade seam for "turn complete" bookkeeping is after `afterTurn(...)` / ingest fallback and before or inside `maintain("turn")`, not earlier in the raw stream event pipeline.

## Modification guidance

### Wrap / extend

- Prefer extending via context-engine methods already present in the runner contract: `bootstrap`, `assemble`, `afterTurn`, `maintain`, and `compact`.
- Prefer read-only observation or fire-and-forget sidecars in `agent_end`, `before_compaction`, and `after_compaction` hooks.
- If SNC needs post-compaction normalization, wrap it around the context-engine compaction seam or direct compaction API instead of assuming all run-level recovery branches are symmetric.

### Defer

- Defer any attempt to unify timeout recovery and overflow recovery until SNC has a concrete production need; the current asymmetry is code reality and may be intentional.
- Defer changes to the delegated compaction event pipeline unless SNC must integrate with prompt retry control itself.

### Avoid

- Do not treat prompt-build hooks as the sole prompt owner.
- Do not mutate session transcript state between `activeSession.prompt(...)` return and compaction-retry settlement.
- Do not assume `maintain("turn")` runs on aborted, timed-out, yield-aborted, or post-turn-failure branches.
- Do not assume `after_compaction` hook timing is identical across delegated compaction, timeout recovery, overflow recovery, and direct compaction API paths.

## Still-unverified questions

1. The exact upstream conditions inside `pi-coding-agent` that trigger delegated auto-compaction were not re-derived here; this packet verifies the runner-side handling after those events are emitted.

2. This packet verifies that timeout recovery lacks an explicit `runContextEngineMaintenance(... reason: "compaction")` call in `run.ts`, but it does not prove whether engine-owned `compact()` implementations internally perform equivalent maintenance.

3. The full stability contract of compaction-related event names (`auto_compaction_start`, `auto_compaction_end`) across future OpenClaw versions remains unproven.

4. This packet does not fully map every failover branch after timeout/overflow; it focuses on lifecycle timing up to retry, compaction, snapshot selection, and turn finalization.
