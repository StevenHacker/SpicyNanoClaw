# SYN-13 SNC Milestone 2 Release / Operator Packet

## Purpose

Define the bounded release and operator packet for SNC Milestone 2 using the current codebase and the verified OpenClaw/CC host truths collected so far.

## Scope

This packet is limited to Milestone 2 release/operator wording: install, update, remove, restart, cleanup, persistence boundaries, and explicit no-claims. It is not a Milestone 3 plan or custom-Claw kernel roadmap.

## Verified Structure / Lifecycle / Contract

### Primary entry files

- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/openclaw.plugin.json`
- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/README.md`
- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/src/engine.ts`
- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/src/worker-state.ts`
- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/src/worker-policy.ts`
- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/src/worker-execution.ts`

### Verified current SNC boundary

SNC is still a normal OpenClaw `context-engine` plugin. Its real persistence boundary is `stateDir`. Current engine/runtime code shows:

- session state, worker state, and durable-memory catalog all load from/write to `stateDir`
- many worker-state paths return `null` when `stateDir` is absent
- prompt sections already expose `Worker diagnostics`, `Worker state`, `Durable memory`, and `Durable memory diagnostics`
- current worker scaffold is bounded to `runtime="subagent"`, `spawnMode="run"`, `completionMode="one-shot"`
- worker control surface currently centers on inspect/follow-up/`steer`/`kill`, not first-class resume

### Release / operator truth matrix

| Topic | Milestone 2 safe wording |
| --- | --- |
| Product unit | ordinary OpenClaw context-engine plugin |
| Default value | continuity plus bounded delegation hygiene |
| Persistence | requires explicit `stateDir` for durable session/worker/memory artifacts |
| Restart | restart gateway after plugin config changes; after restart, re-inspect host truth before assuming worker liveness |
| Update/remove | treat plugin update/remove and `stateDir` cleanup as separate actions |
| Follow-up | bounded host-backed follow-up/inspection, not exact resume guarantee |

### Install / update / remove / restart / cleanup language

| Operator action | Must-have wording |
| --- | --- |
| Install | install SNC as a normal plugin, then enable/select it as the active `contextEngine` |
| Configure | prefer `~` or absolute `stateDir`; avoid fragile relative paths in clean-host/service lanes |
| Restart | restart gateway after plugin config changes |
| Update | update plugin package/config separately from SNC-owned `stateDir` artifacts |
| Remove | disable/reselect a safe context engine, then uninstall SNC; clean SNC `stateDir` only as a deliberate separate step |
| Cleanup | inspect host truth first; do not treat stale local worker files as proof of liveness |

## Key Findings

1. SNC Milestone 2 is releasable only as a bounded plugin/operator packet, not as a generalized controller platform.
2. `stateDir` is the real operator contract: without it, durable memory and worker-state surfaces degrade sharply.
3. Current code and accepted research support continuity, diagnostics, and bounded delegation hygiene, but not a first-class resume platform claim.

## SNC Relevance

This packet is itself the SNC-facing synthesis:

- it narrows what Milestone 2 should claim
- it gives operator-safe wording around restart, update, remove, cleanup, and follow-up
- it protects SNC from inheriting stronger resume/control promises than the host and donor evidence support

## Modification Guidance

- Wrap: README/release-note/operator-doc wording around `stateDir`, restart, remove, and inspection-first worker handling.
- Extend: doctor/checklist surfaces that validate selected `contextEngine`, resolved `stateDir`, and basic durable-memory visibility.
- Defer: first-class resume, long-lived orchestration control, and richer helper-tool product surfaces.
- Avoid: describing SNC as a worker-control platform, guaranteed resume system, or automatic cleanup manager.
- Do-not-touch: Milestone 2 boundary by pulling in Milestone 3/kernel ambitions.

## Still-unverified questions

- Whether future SNC releases should wrap more of the host inspection surface directly, or keep follow-up/recovery primarily host-native.
- Whether future host releases will add symmetric `contextEngine` cleanup and stronger doctor coverage for stale selected ids.
- What the final clean-host packaging lane will look like if SNC moves from direct working-copy distribution to a more formal package registry lane.

## Explicit Defer List

- First-class worker resume product surface
- Long-lived multi-worker orchestration platform features
- Automatic deletion of SNC-owned `stateDir`
- Marketplace/registry polish beyond Milestone 2 needs

## Explicit No-Claims List

- No claim that SNC guarantees exact continuation of interrupted worker execution
- No claim that restart alone proves prior workers are still live
- No claim that uninstall removes SNC-owned persistent state
- No claim that relative `stateDir` examples are safe across all clean-host/service deployments
