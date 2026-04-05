# Bridge Deep Dive

Last updated: 2026-04-01

## Scope

This pass focused on:

- `src/bridge/bridgeMain.ts`
- `src/bridge/sessionRunner.ts`
- earlier context from `src/utils/messages/systemInit.ts`

## Core Reading

`bridgeMain.ts` is not a simple remote poll loop. It is a control plane for managed child sessions.

What stands out:

1. It keeps a dense set of runtime maps:
   - `activeSessions`
   - `sessionStartTimes`
   - `sessionWorkIds`
   - `sessionCompatIds`
   - `sessionIngressTokens`
   - `sessionTimers`
   - `completedWorkIds`
   - `sessionWorktrees`
   - `timedOutSessions`
   - `titledSessions`

2. It couples those maps to operational behaviors:
   - heartbeat
   - reconnect on auth expiry
   - token refresh scheduling
   - capacity wake-up
   - timeout watchdog
   - worktree create/cleanup
   - safe spawn

3. `sessionRunner.ts` confirms bridge sessions are spawned child runs with:
   - activity extraction
   - transcript capture
   - permission request forwarding
   - completion status reporting

## Valuable Designs

### 1. Bridge as a session control plane

Design:

- The bridge tracks active session state explicitly instead of treating remote work as opaque jobs.

Problem solved:

- Prevents lost ownership over long-running work.
- Makes reconnect, timeout, and cleanup possible.

Openclaw implication:

- `openclaw-gateway` should not just proxy requests.
- It should own a session registry and child lifecycle state.

Priority:

- P0.

### 2. Managed child sessions instead of hidden remote execution

Design:

- A bridge session is a spawned child process with explicit handles and status.

Problem solved:

- Reduces ambiguity around where work is happening.
- Makes interruption and cleanup operationally concrete.

Openclaw implication:

- Treat remote or detached runs as managed child runtimes, not invisible background tasks.

Priority:

- P0.

### 3. Worktree-per-session isolation

Design:

- The bridge can create and later remove per-session worktrees.

Problem solved:

- Reduces file conflicts between parallel tasks.
- Makes cleanup and rollback boundaries clearer.

Openclaw implication:

- If `openclaw` grows async or multi-session execution, worktree isolation is one of the cleanest ways to keep runs from contaminating one another.

Priority:

- P0 if concurrent coding sessions are a real goal.

### 4. Heartbeat and auth refresh as runtime responsibilities

Design:

- Active work is heartbeated.
- Expired auth can trigger reconnect or token refresh.

Problem solved:

- Avoids sessions silently dying while still "owned" by the system.

Openclaw implication:

- Long-running sessions need liveness and lease management.
- This is more important than fancy orchestration features.

Priority:

- P0.

### 5. Capacity-aware wakeup instead of dumb polling

Design:

- The bridge can wake from at-capacity waiting as soon as a session frees up.

Problem solved:

- Avoids both constant busy polling and delayed reuse of available capacity.

Openclaw implication:

- Worth borrowing conceptually.
- The exact implementation can wait.

Priority:

- Research first, simplified version later.

### 6. Compat IDs and protocol translation

Design:

- The bridge keeps compat-surface IDs separately from infrastructure IDs.

Problem solved:

- Allows protocol changes without breaking the outward session surface.

Openclaw implication:

- Useful if `openclaw-gateway` needs a stable external contract while internal runtime ids evolve.

Priority:

- P1, not P0.

## What Looks Worth Copying

The most transferable bridge ideas are:

1. explicit session registry
2. child runtime lifecycle management
3. timeout watchdog
4. heartbeat/reconnect loop
5. worktree isolation
6. activity summaries for parent visibility

## What Looks Too Product-Specific

These parts should be studied but not copied directly:

1. remote session URL/product wiring
2. trusted device token flow
3. Anthropic-specific work secret/session compatibility layers
4. dense feature-gate ecosystem around bridge variants

## Openclaw P0 Recommendation

If we distill this into a first useful bridge layer for `openclaw`, P0 should be:

1. session registry
2. child process handle model
3. per-session timeout
4. heartbeat or liveness checks
5. worktree isolation where needed
6. structured session activity summaries

## Open Questions

1. Does current `openclaw-gateway` already maintain any comparable session state?
2. Is worktree isolation appropriate for all `openclaw` tasks, or only coding-heavy ones?
3. Should session liveness live in gateway code or in the enhancement plugin layer?
