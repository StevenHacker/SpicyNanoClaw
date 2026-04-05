# OPS-05 SNC Milestone 1 Release Envelope

## Problem / Subsystem

This packet defines the release boundary for `SNC Milestone 1` against the current mixed engineering workspace.

The verified repo state is still layered:

- repo root is a Python project named `codex-localstack`
- `research/` is the OpenClaw / CC / SNC deconstruction and program corpus
- `data/external/` holds frozen upstream snapshots
- `data/incoming/` holds transfer artifacts
- `data/working/openclaw-v2026.4.1-snc-v1/` is the active OpenClaw host workspace
- the actual SNC code that looks release-shaped lives under `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/`

So the release problem is not "how to publish this repo root". The release problem is:

1. identify the real SNC artifact
2. separate durable internal assets from publishable plugin content
3. define the minimum validation gate for milestone 1
4. keep the hot-pluggable delivery boundary intact

## Main Entry Files

### Root identity and mixed-workspace boundary

- `README.md`
- `pyproject.toml`
- `.gitignore`

### Current SNC plugin surface

- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/package.json`
- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/openclaw.plugin.json`
- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/index.ts`
- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/README.md`
- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/src/*`

### Validation and acceptance state

- `scripts/validate_snc_dispatcher.ps1`
- `scripts/validate_snc_focus_v2.ps1`
- `research/68_snc_acceptance_matrix.md`
- `research/53_external_thread_claims.md`

### Accepted milestone-supporting assets already present in the repo

- `research/78_openclaw_modification_atlas.md`
- `research/79_cc_harness_design_codex.md`
- `research/80_custom_claw_architecture_program.md`
- `research/81_snc_durable_memory_core_utility.md`
- `research/82_snc_helper_tools_utility.md`
- `research/83_snc_multiworker_policy_utility.md`

## Verified Structure / Mechanisms

### 1. Repo root is not the SNC release unit

The root `README.md` and `pyproject.toml` describe `codex-localstack`, not an SNC-first product surface.

That means the repo root currently owns:

- local gateway code under `app/`
- Python packaging and runtime setup
- local OCR / memory / daily-report infrastructure

Those are real project assets, but they are not the clean SNC milestone artifact.

### 2. The natural SNC release unit is the plugin package inside the working host copy

The strongest verified release-shaped unit in the workspace is:

- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc`

Release-facing metadata already exists there:

- `openclaw.plugin.json` declares plugin identity `snc`, kind `context-engine`, and config schema
- `package.json` declares `openclaw-snc`, `openclaw >=2026.4.1`, and `openclaw.release.publishToNpm: true`
- `README.md` already documents install paths for local OpenClaw usage

That is a real plugin boundary, and it matches the default SNC principle of staying hot-pluggable.

### 3. Milestone-supporting assets now exist as accepted internal outputs, but the release gate is still fragmented

`research/53_external_thread_claims.md` now marks `18-23` as `done`, and the corresponding accepted docs and utility files are present on disk.

That changes the program state in an important way:

- milestone-supporting architecture/design assets now exist as accepted internal assets
- milestone-supporting utility tests also exist in the SNC plugin tree

But the release gate is still not unified:

- `validate_snc_dispatcher.ps1` focuses on `session-state`, `engine`, and full typecheck
- `validate_snc_focus_v2.ps1` focuses on shaping / continuity tests
- the newer utility suites such as `durable-memory`, `helper-tools`, and `worker-policy` are not yet rolled into one milestone gate script

So acceptance is no longer the blocker. Release-envelope hygiene is now the blocker.

### 4. The working host copy is a development environment, not a publishable repo surface

`data/working/openclaw-v2026.4.1-snc-v1/` contains a full OpenClaw workspace, including:

- upstream host source
- packaging and docs for the host
- test infrastructure
- `node_modules`
- the SNC plugin package inside that host

That makes it the correct development and validation environment, but not the thing that should be published as "SNC Milestone 1".

## Milestone-1 Release Boundary

### Release-worthy surface now

The current milestone-1 release-worthy surface is the SNC plugin package only:

- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/index.ts`
- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/openclaw.plugin.json`
- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/package.json`
- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/README.md`
- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/src/*.ts`
- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/src/*.test.ts`

### Durable internal program assets

These are canonical internal assets, but not plugin-package contents:

- accepted research and synthesis docs in `research/`
- validation scripts at repo root
- acceptance notes and packet records
- upstream analysis outputs and architecture planning docs

### Explicitly non-release working/reference content

These should remain outside the milestone package boundary:

- `data/external/*`
- `data/incoming/*`
- the rest of `data/working/openclaw-v2026.4.1-snc-v1/*` outside `extensions/snc`
- root or working-copy `node_modules`

### Root repo content that should not be conflated with SNC

- `app/*`
- `config/*`
- Python packaging at repo root
- localstack-specific runtime/tooling files

## Canonical Repo-Content Proposal

### Canonical release artifact

For milestone 1, the cleanest publishable artifact should be one of:

1. an extracted plugin package from `extensions/snc`
2. a dedicated SNC repo or subtree derived from that plugin package
3. a package release published from the plugin directory once the release gate is explicit

The most code-faithful read today is that `1` or `2` should happen before any public milestone push, because the repo root is still intentionally not SNC-shaped.

### Canonical internal workspace content

Keep this repo as the internal SNC engineering workspace for:

- accepted research
- validation scripts
- working-host development copy
- frozen upstream references
- acceptance and dispatch records

### Canonical ignored or generated content

Keep non-canonical and non-release:

- `.venv/`
- Python cache files
- root and working-copy `node_modules`
- `data/cache/**`
- `data/logs/**`
- `data/lancedb/**`
- generated daily outputs
- transfer zips and similar bundles

## Validation Gate Checklist

### Required before milestone-1 push

1. The SNC plugin test surface passes for the current accepted package contents:
   - `config`
   - `session-state`
   - `engine`
   - `transcript-shaping`
   - `replacement-ledger`
   - `hook-scaffold`
   - `durable-memory`
   - `helper-tools`
   - `worker-policy`
2. Workspace typecheck passes in the canonical OpenClaw host workspace with `NODE_OPTIONS=--max-old-space-size=8192`.
3. A clean-host install is validated against `OpenClaw >= 2026.4.1` using:
   - local plugin install from the plugin directory
   - the intended release-shaped package form, if different from local install
4. The publish surface excludes:
   - repo-root localstack content
   - upstream frozen snapshots
   - transfer artifacts
   - development-only `node_modules`
5. Deferred surfaces remain deferred unless separately accepted for release:
   - plugin-entry helper-tool registration
   - host memory-slot ownership
   - MCP export
   - host runtime rewrites outside accepted bounded packets

### Strongly recommended before push

1. Add one milestone-focused validation script or checklist that explicitly covers the accepted utility suites, instead of relying on split scripts.
2. Update the plugin README from future-tense milestone language to current accepted milestone contents.
3. State the supported host baseline consistently as `OpenClaw >= 2026.4.1` in plugin-facing packaging and docs.

## Push / README / Release Hygiene Recommendations

### Push boundary

- do not push the mixed repo root as if it were the SNC product
- push either the SNC plugin package or a dedicated SNC release repo/subtree

### README hygiene

- keep the root `README.md` about `codex-localstack`
- keep SNC install and capability docs at the plugin-package surface
- document accepted milestone-1 behavior only, not program backlog or future architecture ambitions

### Package hygiene

- decide whether `openclaw-snc` stays the public package name or becomes a scoped package
- ensure the release package excludes local development dependencies and host workspace clutter
- keep peer dependency and minimum host version explicit

### Release-note hygiene

- describe milestone 1 as a bounded, hot-pluggable context-engine plugin release
- explicitly list deferred areas:
  - host memory-slot ownership
  - MCP export
  - broader custom-Claw productization
  - deep host-runtime rewrites outside accepted bounded seams

### Repo hygiene

- preserve this repo as the internal workspace unless a dedicated SNC release repo is intentionally created
- do not merge research corpus, upstream snapshots, and plugin artifact into one user-facing release surface

## SNC Relevance

This packet matters because SNC's milestone-1 value depends on a clean delivery contract:

- hot-pluggable installation
- bounded host ownership
- reversible adoption inside OpenClaw

If the release boundary stays at the plugin package, SNC remains aligned with the architecture already accepted.
If the release boundary expands to the mixed workspace, SNC becomes harder to explain, validate, and evolve.

## Modification Guidance

### Wrap

- wrap milestone release around the plugin package boundary
- wrap validation around the actual accepted plugin surface rather than the mixed repo root

### Extend

- extend release automation only after the milestone gate explicitly covers the accepted utility suites
- extend plugin-surface README and packaging metadata, not the root repo identity

### Defer

- public release of the broader engineering workspace
- any packaging plan that assumes post-milestone custom-Claw work is already productized

### Do-not-touch

- do not repurpose the root `codex-localstack` repo identity into the SNC release identity
- do not publish `data/external/*` or `data/incoming/*` as product content
- do not publish the full working host copy as if it were the SNC package

## Still-Unverified Questions

- whether milestone 1 should ship as an extracted plugin package or a dedicated SNC repo/subtree
- whether `openclaw-snc` is the final public package name
- whether a release-shaped package install has been validated on a clean host with no workspace shortcuts
- whether milestone 1 should get a dedicated single gate script or remain checklist-driven
