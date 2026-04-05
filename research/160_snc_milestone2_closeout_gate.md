# SNC Milestone 2 Closeout Gate

## Purpose

This round turns `Milestone 2` from "almost ready to admit" into "has one canonical closeout gate."

The goal was not to add another subsystem.
The goal was to make `Milestone 2` easy to judge:

- one validation script
- one package artifact build step
- one clean-host rehearsal step
- one README/runtime story that matches the actual landed feature surface

## What Landed

New validation script:

- `scripts/validate_snc_milestone2.ps1`

Updated release-facing docs:

- `README.md`
- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/README.md`

## What Changed

### 1. `Milestone 2` now has a canonical validation gate

`scripts/validate_snc_milestone2.ps1` now runs the bounded closeout sequence:

1. focused SNC validation
2. dispatcher validation plus workspace typecheck
3. package artifact build
4. clean-host install rehearsal

This matters because `Milestone 2` is no longer being judged through scattered scripts and tribal memory.

### 2. The package artifact is rebuilt as part of the gate

The closeout gate rebuilds:

- `data/releases/snc/openclaw-snc-0.1.0.tgz`

before running the clean-host rehearsal.

That closes a real release-confidence gap:

- clean-host install is now validated against the current plugin code
- not merely against an older artifact that happened to exist

### 3. README wording now matches the real `Milestone 2` surface

The release-facing docs now describe:

- `Milestone 2`, not `Milestone 1`
- general-assistant compatibility through `specializationMode`
- bounded worker launch/follow-up/diagnostics reality
- bounded durable-memory controls and diagnostics
- `Milestone 2` no-claims:
  - no resume guarantee
  - no guaranteed late reply delivery
  - no orchestration-platform claim

This matters because operator docs now align with the accepted admission envelope rather than older milestone language.

## Validation

Canonical closeout gate:

- `powershell -ExecutionPolicy Bypass -File scripts/validate_snc_milestone2.ps1`

Result:

- focused shaping tests: `56/56`
- continuity baseline tests: `20/20`
- dispatcher focused vitest: `57/57`
- workspace `tsc`: passed with `8 GB` heap
- package artifact rebuilt successfully
- clean-host rehearsal passed

Clean-host rehearsal verified:

- packaged install into a fresh OpenClaw mirror
- recommended base config write
- config validation
- `plugins inspect`
- `plugins list`

## Practical Read

`Milestone 2` now has the kind of gate you would actually want before an admission or release call:

- code is validated
- packaging is validated
- clean-host installation is validated
- docs use the same bounded claims the code can defend

That does not automatically mean `Milestone 2` must be admitted immediately.

But it does mean the remaining work is now mostly:

- closeout judgment
- release/operator wording
- any tiny fix that future closeout packets prove necessary

not broad engineering uncertainty.

## What This Does Not Yet Claim

This round does **not** claim:

- `Milestone 2` has already been admitted
- helper tools have moved out of defer state
- SNC now supports first-class resume
- SNC now guarantees post-follow-up delivery callbacks

Those claims remain intentionally bounded.
