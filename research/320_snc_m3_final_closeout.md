# SNC M3 Final Closeout

## Status

`Milestone 3` is now in a shippable closeout state.

Package line:

- `data/releases/snc/openclaw-snc-0.2.0.tgz`

Working branch:

- `codex/snc-m3-converge`

## What M3 Closed

Compared with the frozen `0.1.1` baseline, `M3` closes these major quality lines:

- evidence-first / explicit-read posture
- writing-output discipline against report-mode leakage
- long-horizon memory trust tightening
- durable-memory explainability
- multilingual entity stability and correction carry-forward
- conflict-aware durable-memory suppression
- prompt-budget / section-ordering hardening
- agent-family durable-memory isolation by default

## OpenClaw Usage Truth

The intended OpenClaw-side operator flow is now explicit in both README files:

1. install the package with `openclaw plugins install ...`
2. edit `~/.openclaw/openclaw.json`
3. set `plugins.slots.contextEngine = "snc"`
4. put SNC config under `plugins.entries.snc.config`
5. restart the OpenClaw gateway or app process

Recommended base profile:

- `stateDir`
- `specializationMode: "auto"`

Then add writing artifacts only if needed:

- `briefFile`
- `ledgerFile`
- `packetDir`
- optional hooks

## Validation

Canonical gate:

- `powershell -ExecutionPolicy Bypass -File scripts/validate_snc_milestone3.ps1`

Latest result:

- shaping focus: `79/79`
- continuity baseline: `35/35`
- dispatcher focused vitest: `95/95`
- workspace `tsc`: pass
- package rebuild: pass
- clean-host rehearsal: pass

## Practical Read

`M3` should now be treated as:

- a major SNC package line
- a stronger writing and evidence-grounding specialization than `0.1.1`
- a safer default for multi-agent environments because durable memory is no longer flat-shared by default

It is ready to be pushed as the current major SNC line.
