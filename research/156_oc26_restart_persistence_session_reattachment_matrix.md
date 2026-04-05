# OC-26 Restart Persistence / Session Reattachment Matrix

## Purpose

Pin down what OpenClaw actually persists across gateway restart, how subagent/session truth is re-established after restart, and what SNC should treat as active state versus local residue.

## Scope

Focused on host-owned subagent registry persistence, restart restoration, orphan recovery, and public inspection seams. This packet does not redefine SNC worker product semantics or introduce a host-fork resume promise.

## Verified Structure / Lifecycle / Contract

### Primary entry files

- `data/external/openclaw-v2026.4.1/src/agents/subagent-registry-state.ts`
- `data/external/openclaw-v2026.4.1/src/agents/subagent-registry.ts`
- `data/external/openclaw-v2026.4.1/src/agents/subagent-orphan-recovery.ts`
- `data/external/openclaw-v2026.4.1/src/agents/subagent-registry.store.ts`
- `data/external/openclaw-v2026.4.1/src/agents/subagent-registry-run-manager.ts`
- `data/external/openclaw-v2026.4.1/src/agents/openclaw-tools.ts`

### Restart persistence substrate

`resolveSubagentRegistryPath()` stores registry state under `<resolveStateDir(...)>/subagents/runs.json`. Outside test mode, `getSubagentRunsSnapshotForRead(...)` merges disk-backed state with in-memory state, so restored controller records are intentionally visible after process restart.

### Restart restore order

`restoreSubagentRunsOnce()` performs a host restart restore sequence:

| Step | Verified host behavior |
| --- | --- |
| 1 | Load persisted runs from disk-backed registry state |
| 2 | Reconcile orphaned restored runs |
| 3 | Call `resumeSubagentRun(runId)` for every restored run |
| 4 | Restart archive sweeper if timers exist |
| 5 | Schedule delayed orphan-recovery import/bootstrap |

### `resumeSubagentRun(...)` downgrade ladder

`resumeSubagentRun(runId)` does not blindly mark everything live again. Verified branches include:

| Branch | Verified behavior |
| --- | --- |
| Orphan reason present | reconcile/prune orphaned run and persist downgrade |
| Cleanup already completed | return without reattachment |
| Retries exhausted or retry window expired | finalize resumed announce give-up |
| Ended but cleanup still pending | restart announce cleanup flow |
| Still live enough to watch | wait again for completion/announce path |

### Orphan recovery truth

`subagent-orphan-recovery.ts` adds a second, narrower path: after boot delay, the host scans runs whose session store says `abortedLastRun: true`, then sends a synthetic resume message through the gateway `agent` method. Only successful recovery clears the aborted marker, and retries use backoff. This is host-internal best-effort repair, not a public guarantee that SNC should advertise as durable resume.

### Public seams for re-establishing live truth

Verified public tools in `openclaw-tools.ts` that can re-establish session truth after restart:

- `sessions_list`
- `sessions_history`
- `session_status`
- `subagents`

These are the host-truth seams SNC can rely on after restart. Persisted local worker state can guide inspection, but cannot by itself prove that a worker is still live.

### Trigger / timing matrix

| Situation after restart | Persisted local/controller residue | Host public proof | Safe operator classification |
| --- | --- | --- | --- |
| Child session still visible and inspectable | Yes | Yes | `active` |
| Controller/run record survived, but host truth not yet checked | Yes | Not yet | `inspect-needed` |
| SNC/plugin-owned worker state survived, but no host proof remains | Yes | No | `historical-only` |
| Restore path pruned orphaned run | Maybe | No | `historical-only` |
| Synthetic orphan recovery in progress | Yes | Not yet stable | `inspect-needed` |

## Key Findings

1. OpenClaw does persist subagent controller state across restart, and it actively tries to restore and re-watch that state.
2. Restart persistence is not the same thing as live session truth. The host itself re-inspects, reconciles, and may prune or downgrade restored runs.
3. The most reliable post-restart rule for SNC is host-truth-first: local residue is useful for inspection routing, not for asserting liveness.

## SNC Relevance

For SNC worker state hygiene, restart should not automatically reassert that previously tracked helpers are live. The safe posture is:

- use persisted SNC state only to remember what needs inspection
- re-establish truth through host public seams
- downgrade to historical if host truth does not confirm a live child session

This directly supports bounded worker diagnostics and avoids overclaiming restart continuity.

## Modification Guidance

- Wrap: SNC operator wording around `active`, `inspect-needed`, and `historical-only`.
- Extend: inspector/checklist flows that query `session_status`, `sessions_history`, `sessions_list`, or `subagents` after restart.
- Defer: any SNC-level promise of automatic child-session resume or exact reattachment.
- Avoid: treating persisted plugin state or registry residue as sufficient proof of current worker liveness.
- Do-not-touch: host orphan-recovery internals unless OpenClaw itself makes them a public contract.

## Still-unverified questions

- Whether future OpenClaw builds will expose a more explicit machine-readable restart/reattachment status for restored runs.
- How much of the current synthetic orphan-recovery behavior is intended to remain stable as public operator-facing semantics.
- Whether future host doctor surfaces will directly classify restored subagent runs as live, inspect-needed, or historical.
