# SNC Milestone 3 Release Candidate

## Purpose

This round closes `Milestone 3` into a real candidate package instead of leaving it as a source-line hardening track.

The goal was:

- finish the last prompt-truth fixes that still affected product feel
- move SNC onto an `M3` package line with a clearer version boundary
- add one canonical `Milestone 3` validation gate
- produce a real installable candidate artifact

## What Landed

Updated runtime files:

- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/src/task-posture.ts`
- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/src/session-state.ts`
- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/src/engine.ts`

Updated release-facing files:

- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/package.json`
- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/README.md`
- `README.md`
- `scripts/validate_snc_milestone3.ps1`

Produced artifact:

- `data/releases/snc/openclaw-snc-0.2.0.tgz`

## What Changed

### 1. Writing-draft prompt surfaces are stricter

`writing-prose` turns now suppress report-style assistant residue instead of surfacing it as prompt-facing support.

Concretely:

- report / handoff / checklist language is filtered out of prompt-facing recent assistant messages in writing-draft mode
- assistant cues that are pure process residue no longer survive as `secondaryAssistantCue`
- `Writing output discipline` now explicitly forbids status-report and handoff language inside the draft itself

This matters because the production writing arena exposed a real weakness:

- SNC freshness could still be polluted by report-mode residue

### 2. Evidence-first honesty is sharper

The evidence-first posture now says:

- if a required file, packet, or material is missing or unread, say that explicitly before partial fallback

This matters because `M3` is supposed to improve explicit-read honesty, not just continuity discipline.

### 3. Version truth is cleaner

The package line is now:

- `openclaw-snc@0.2.0`

The engine version is also aligned to:

- `0.2.0`

This corrects the older situation where package naming and milestone naming could drift.

### 4. `Milestone 3` now has one canonical gate

The new gate is:

- `scripts/validate_snc_milestone3.ps1`

It runs:

1. focused SNC validation
2. dispatcher validation plus workspace typecheck
3. package artifact build
4. clean-host install rehearsal

So `M3` can now be judged as a real release candidate instead of a vague source line.

## Validation

Canonical gate:

- `powershell -ExecutionPolicy Bypass -File scripts/validate_snc_milestone3.ps1`

Result:

- shaping focus: `76/76`
- continuity baseline: `33/33`
- dispatcher focused vitest: `90/90`
- workspace `tsc`: passed with `8 GB` heap
- package artifact rebuilt successfully
- clean-host rehearsal passed

Clean-host rehearsal verified:

- packaged install into a clean OpenClaw mirror
- recommended base config write
- config validation
- `plugins inspect`
- `plugins list`

## Practical Read

`Milestone 3` is now at a real candidate state:

- the core `M3` quality slices are live
- the package line is versioned separately from the frozen `0.1.1` baseline
- install docs and validation docs point at the new candidate line
- the candidate can be installed and validated through the normal host flow

## What This Does Not Yet Claim

This round does **not** claim:

- external production validation of the `0.2.0` package is already complete
- `Milestone 3` is admitted regardless of upcoming arena or package tests
- post-`M3` long-horizon memory expansion has already started

The correct status is:

- `Milestone 3` release candidate: landed
- external package validation: next step
