# External Thread Phase 8 Acceptance - Round 1

## Purpose

Close the phase-8 packet wave that existed to support:

- `SNC-Milestone2-04 Durable Memory Diagnostics And Controls`

This acceptance round is not about broad repo coverage.
It is about whether the remaining durable-memory/operator blind spots are now small enough that main-thread implementation can move without vague claims.

## Accepted Packets

1. `41` `OC-18 Plugin Diagnostics / Doctor / Config-Validate Surface Matrix`
   - `research/128_oc18_plugin_diagnostics_doctor_matrix.md`
2. `42` `OC-19 Gateway Launch / Working-Directory Matrix`
   - `research/129_oc19_gateway_working_directory_matrix.md`
3. `43` `CC-15 SessionMemory / ExtractMemories Failure-Skip-Control Matrix`
   - `research/130_cc15_memory_failure_skip_control_matrix.md`
4. `44` `SYN-09 SNC Durable-Memory Operator Envelope`
   - `research/131_syn09_snc_durable_memory_operator_envelope.md`

## What Actually Closed

### 1. Host diagnostics are now precise enough for operator docs

OpenClaw now has a code-accurate support stack for plugin health:

- `openclaw config validate`
- `openclaw plugins inspect`
- `openclaw plugins doctor`

The important acceptance outcome is not just that these commands exist.
It is that we now know what each one proves and what it does not prove.

That removes a real docs risk:

- pretending host validation already proves live SNC runtime adoption

### 2. Gateway/CWD reality is now sharp enough for honest path guidance

Phase 7 already proved SNC plugin paths are CWD-sensitive.
Phase 8 now closes the next operator question:

- which launch lanes actually define or inherit that CWD

That means Milestone 2 guidance can now be honest:

- foreground/dev lanes can tolerate relative shorthand
- service/clean-host lanes should prefer `~`-anchored or absolute paths

### 3. CC donor value is now clearer at the memory-control plane

The strongest accepted donor value from this round is:

- skip/coalesce/fallback discipline
- success-only advancement
- "do not force the write" behavior when state quality is weak

This is a better donor for SNC than copying CC memory shell features.

### 4. Durable-memory outward contract is now bounded

SNC durable memory now has an accepted operator envelope:

- what it really stores
- when it really projects
- what diagnostics exist now
- what should still not be promised

This closes the last big ambiguity around `SNC-Milestone2-04`.

## Acceptance Decision

All four packets are accepted.

Why:

- each packet stayed narrow
- each packet answered a real Milestone-2 implementation or operator question
- none of them reopened broad architecture unnecessarily

## Real Progress Evaluation

### OpenClaw

Current read after this acceptance:

- SNC-relevant host understanding: about `99%`
- broader host/platform understanding: about `90%`

Real reason:

- the remaining unknowns are now mostly deployment-contact and operator-behavior edge cases, not structural host blind spots

### CC

Current read after this acceptance:

- SNC-relevant donor understanding: about `96%`
- broader repo/product understanding: about `86%`

Real reason:

- the remaining valuable donor work is now mostly worker-failure/control nuance and a few peripheral product layers, not broad missing memory architecture

## What This Changes For Main-Thread Work

This acceptance makes three things safer:

1. durable-memory docs and controls can now be written without pretending host doctor/config surfaces do more than they really do
2. `stateDir` and artifact-path guidance can now be honest in clean-host lanes
3. future SNC memory-control behavior can now borrow CC's "skip instead of forcing bad maintenance" discipline more precisely

## Remaining Pressure

The next meaningful research pressure is no longer durable memory.

It is worker/operator precision:

- launch failure surfaces
- follow-up / wait / control transition reality
- worker failure / partial-result donor behavior
- one bounded worker operator envelope for Milestone 2

## Dispatcher Read

Phase 8 is successful.

It closed the durable-memory/operator lane enough that the main thread can keep development-first posture without bluffing around diagnostics, path semantics, or donor failure-control behavior.
