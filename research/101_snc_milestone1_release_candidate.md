# SNC Milestone 1 Release Candidate

## Purpose

This round closes `SNC-M2-01` as a real release-candidate pass instead of only a design packet.

The goal was:

- make the Milestone 1 package boundary explicit
- align plugin metadata with the current landed feature surface
- add one canonical milestone gate
- produce a real installable plugin artifact

## What Landed

Updated release-facing files:

- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/openclaw.plugin.json`
- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/package.json`
- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/.npmignore`
- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/README.md`
- `scripts/validate_snc_milestone1.ps1`

Produced artifact:

- `data/releases/snc/openclaw-snc-0.1.0.tgz`

## What Changed

### 1. manifest / schema now matches the current plugin surface

The plugin manifest now reflects the actual hook-target surface:

- `before_message_write`
- `tool_result_persist`
- `session_end`
- `subagent_spawned`
- `subagent_ended`

It also exposes the bounded numeric hook controls already implemented in code:

- `maxRewritesPerSession`
- `maxReplacementBytes`
- `maxToolResultBytes`

Before this round, the manifest lagged behind the real SNC runtime.

### 2. plugin README is now release-facing instead of future-tense

The README now documents:

- the real Milestone 1 scope
- supported host baseline
- install path
- enable/config example
- explicit deferred areas
- the milestone validation gate

This matters because earlier README text still described a more incomplete phase.

### 3. package boundary is now explicitly cleaner

The SNC plugin package now excludes test files from the published tarball through package ignore rules.

This keeps the milestone artifact aligned with the release-envelope doctrine:

- publish the plugin package
- do not publish the mixed workspace

### 4. the program now has one milestone gate

`scripts/validate_snc_milestone1.ps1` is now the canonical Milestone 1 validation script.

It checks:

- the full SNC plugin test surface
- package dry-run
- OpenClaw workspace typecheck

This closes one of the main release-envelope gaps identified earlier.

### 5. a real package artifact now exists

The first bounded SNC release artifact was produced:

- `openclaw-snc-0.1.0.tgz`

Artifact facts:

- package size: about `38.7 kB`
- unpacked size: about `189.5 kB`
- file count: `15`
- SHA-256:
  - `B6B926FD5D0C07FE31A2011D2767EF76EA010D33A8AAAC2E2DEDF2954A0CE010`

## Validation

Canonical milestone gate:

- `powershell -ExecutionPolicy Bypass -File scripts/validate_snc_milestone1.ps1`

Result:

- Milestone 1 Vitest: `59/59`
- package dry-run: passed
- workspace typecheck: passed with `8 GB` heap

Additional artifact check:

- `npm pack --pack-destination ...`
- produced `data/releases/snc/openclaw-snc-0.1.0.tgz`

## Practical Read

This is enough to say:

- SNC Milestone 1 now has a real release candidate
- the candidate is a bounded OpenClaw plugin package
- the candidate has one canonical validation gate
- the candidate has a real tarball artifact, not only a working tree

## What Is Still Not Claimed

This round does not claim:

- public npm publication already happened
- clean-host install from the tarball has been revalidated in a totally separate fresh host copy
- helper tools are public runtime surface
- general worker orchestration is complete

So the right status is:

- Milestone 1 release candidate: landed
- public push/publish: still a separate step
