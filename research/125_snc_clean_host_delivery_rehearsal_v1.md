# SNC Clean-Host Delivery Rehearsal V1

## Purpose

Land the first real `Milestone 2` clean-host delivery rehearsal.

This packet is not about changing SNC runtime behavior.
It is about proving that an ordinary OpenClaw operator can:

1. start from a clean host snapshot,
2. install the packaged SNC release,
3. apply the recommended base config,
4. verify enablement and slot activation,
5. and leave with an ordinary restart-based operator story.

## Scope

- repo paths:
  - `scripts/validate_snc_clean_host_rehearsal.ps1`
  - `README.md`
  - `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/README.md`
- runtime lane:
  - packaged install from `data/releases/snc/openclaw-snc-0.1.0.tgz`
  - refreshed release tarball rebuilt from the current SNC plugin source before rehearsal
  - clean host mirror sourced from `data/external/openclaw-v2026.4.1`
  - shared dependency reuse through the existing working host `node_modules`
- out of scope:
  - registry publishing
  - marketplace distribution
  - host hot-reload

## Verified Delivery Lane

The landed rehearsal script now does this:

1. stages a clean OpenClaw mirror from the external `v2026.4.1` snapshot
2. reuses the already-installed dependency tree through a `node_modules` junction
3. sets isolated `OPENCLAW_STATE_DIR` and `OPENCLAW_CONFIG_PATH`
4. installs the packaged SNC archive through the normal plugin CLI
5. writes the recommended SNC base config:
   - `plugins.slots.contextEngine = "snc"`
   - `plugins.entries.snc.enabled = true`
   - `plugins.entries.snc.config.stateDir = <isolated rehearsal dir>`
   - `plugins.entries.snc.config.specializationMode = "auto"`
6. validates config schema through `openclaw config validate --json`
7. verifies plugin status through:
   - `openclaw config file`
   - `openclaw plugins inspect snc --json`
   - `openclaw plugins list --json`

The rehearsal intentionally keeps the operator contract restart-based.
It verifies install, config, and discovery state without pretending the running gateway hot-adopts the plugin.

## Key Findings

1. A true clean-host rehearsal must not run inside the SNC development host copy because that host already carries local SNC paths and can produce duplicate-plugin-id noise.
2. The original OpenClaw snapshot plus shared dependencies is enough to rehearse a real packaged install without reinstalling the whole toolchain.
3. The best operator-facing base profile is still small:
   - packaged install
   - context-engine slot set to `snc`
   - `stateDir`
   - `specializationMode: "auto"`
4. Hooks remain useful but should stay clearly opt-in in docs and delivery guidance.

## README Changes

The user-facing install language was tightened in two places:

- root `README.md`
- plugin `extensions/snc/README.md`

Main changes:

- keep `stateDir` as the recommended base profile
- keep hooks in a separate explicit opt-in section
- add the new clean-host rehearsal script as a first-class validation path
- reinforce that SNC can stay neutral for ordinary assistant/development work

## Validation

The new delivery rehearsal gate is:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/validate_snc_clean_host_rehearsal.ps1
```

What it proves:

- packaged archive install succeeds in a clean host mirror
- SNC becomes the configured `contextEngine`
- recommended base config can be written and validated
- `plugins inspect` and `plugins list` both show SNC as a loaded global plugin
- operator reminder remains restart-based

## SNC Relevance

This closes a real `Milestone 2` gap.

Before this slice, SNC had a release candidate but the install/update story still leaned on engineering-context knowledge.
After this slice, there is now a repeatable clean-host rehearsal that matches the actual OpenClaw operator lane.

That makes SNC feel more like an ordinary productized plugin and less like a repo-only engineering experiment.

## Modification Guidance

Keep:

- packaged install as the default delivery story
- restart-oriented operator guidance
- `stateDir` as the first recommended SNC config knob

Do not broaden:

- do not make hooks sound mandatory
- do not claim hot-reload
- do not collapse clean-host delivery into developer `--link` guidance

## Next Step

With clean-host delivery now rehearsed, the next strongest `Milestone 2` engineering lane is:

- `SNC-Milestone2-04 Durable Memory Diagnostics And Controls`

Controller-launch follow-up can remain bounded and evidence-led, but delivery hardening no longer blocks forward motion.
