# OC-13 Plugin Delivery / Marketplace Rehearsal Packet

## Purpose

This packet clarifies how OpenClaw currently delivers, installs, updates, and uninstalls plugins, with a specific focus on what `SNC Milestone 2` can rely on for a clean-host delivery story.

The goal is not to restate the whole plugin subsystem. The goal is to separate:

- the user-facing install/update surfaces that a normal host user can actually invoke
- the internal package plumbing that implements those surfaces
- the delivery lanes that fit SNC's hot-pluggable product boundary
- the lanes that are useful for engineering or donor understanding but should not be treated as the default SNC distribution path

## Scope

Code evidence was taken from:

- `data/external/openclaw-v2026.4.1/src/cli/plugins-cli.ts`
- `data/external/openclaw-v2026.4.1/src/cli/plugins-install-command.ts`
- `data/external/openclaw-v2026.4.1/src/cli/plugins-update-command.ts`
- `data/external/openclaw-v2026.4.1/src/cli/plugin-install-plan.ts`
- `data/external/openclaw-v2026.4.1/src/plugins/install.ts`
- `data/external/openclaw-v2026.4.1/src/plugins/update.ts`
- `data/external/openclaw-v2026.4.1/src/plugins/uninstall.ts`
- `data/external/openclaw-v2026.4.1/src/plugins/marketplace.ts`
- `data/external/openclaw-v2026.4.1/src/plugins/installs.ts`
- `data/external/openclaw-v2026.4.1/src/plugins/discovery.ts`
- `data/external/openclaw-v2026.4.1/src/plugins/roots.ts`
- `data/external/openclaw-v2026.4.1/src/plugins/bundled-sources.ts`
- `data/external/openclaw-v2026.4.1/src/plugins/bundled-dir.ts`
- `research/84_snc_milestone1_release_envelope.md`

## Verified Structure / Lifecycle / Contract

### Main user-facing delivery surfaces

The real product-facing delivery shell is `openclaw plugins ...` in `src/cli/plugins-cli.ts`.

The relevant commands are:

- `openclaw plugins install <path-or-spec-or-plugin>`
- `openclaw plugins update [id]`
- `openclaw plugins uninstall <id>`
- `openclaw plugins marketplace list <source>`

That matters because `Milestone 2` clean-host delivery should be planned around these user-visible surfaces, not around internal helper functions.

### Delivery roots and where installs land

`src/plugins/roots.ts` and `src/plugins/install.ts` show a three-root model for discovery plus one canonical write target:

- `stock`: bundled plugins resolved from host/runtime build locations
- `global`: config-dir `extensions`
- `workspace`: `.openclaw/extensions` under a workspace
- extra `plugins.load.paths`: caller-provided additional load paths

The canonical install target for copied installs is the config-dir `extensions` directory, not the workspace root.

So OpenClaw's delivery model is not "drop a plugin into the repo checkout". The default install contract is "copy into the user's managed extensions area", with discovery also able to see workspace and linked-path sources.

### Install lane matrix

#### 1. Linked local path

When `openclaw plugins install <local-path> --link` is used:

- `plugins-install-command.ts` requires the target to exist locally
- it probes with `installPluginFromPath({ dryRun: true })`
- it adds the path into `config.plugins.load.paths`
- it persists an install record with:
  - `source: "path"`
  - `sourcePath = installPath = resolved local path`

This is the most engineering-friendly lane. It is excellent for local SNC development, but it is not the ordinary end-user delivery story.

#### 2. Local directory or archive copy-install

When `openclaw plugins install <local-path>` is used without `--link`:

- `installPluginFromPath(...)` performs the real install
- copied installs land in the managed `extensions` directory
- the recorded source becomes:
  - `path` for directory/file-style local installs
  - `archive` when `resolveArchiveKind(...)` detects an archive such as `.zip`, `.tgz`, `.tar.gz`, or `.tar`

This is the cleanest ordinary-host rehearsal lane for SNC if the release artifact is delivered as a local package or extracted plugin directory.

#### 3. Bare package / npm-spec install

If the input is not a local path and not explicitly marketplace/clawhub, `plugins-install-command.ts` eventually falls through to `installPluginFromNpmSpec(...)`.

Important details:

- `--pin` only applies to npm installs
- the persisted install record can be pinned to the resolved exact `name@version`
- package installs require `package.json` with non-empty `openclaw.extensions`
- install/update records preserve resolution fields like `resolvedName`, `resolvedVersion`, `resolvedSpec`, `integrity`, and `resolvedAt`

This is the most normal packaged distribution lane for a future SNC plugin release.

#### 4. Bundled-plugin interception

Before normal npm resolution, OpenClaw tries `resolveBundledInstallPlanBeforeNpm(...)`.

If a bundled plugin matches the raw spec:

- it does not fetch from npm
- it records the bundled plugin as a path-backed install
- it adds the bundled local path to `plugins.load.paths`

There is also a second bundled fallback path after npm failure via `resolveBundledInstallPlanForNpmFailure(...)`.

This means a user-visible install string is not equivalent to "always install from npm". Bundled plugin interception is a real host behavior.

#### 5. ClawHub install

If the spec parses as a ClawHub plugin spec, or if preferred ClawHub fallback decides to try first:

- OpenClaw calls `installPluginFromClawHub(...)`
- the persisted record is `source: "clawhub"`
- extra artifact metadata such as `clawhubUrl`, `clawhubPackage`, `clawhubFamily`, and `clawhubChannel` is recorded

This is a supported distribution lane, but it is product-channel-specific. SNC should not assume ClawHub is its default unless the release program intentionally chooses that channel.

#### 6. Marketplace install

If `--marketplace <source>` is used, or if `plugin@marketplaceName` resolves through known marketplaces:

- OpenClaw resolves marketplace metadata through `src/plugins/marketplace.ts`
- it finds the named marketplace entry
- it resolves the entry to a concrete install source
- it then reuses normal install flows underneath
- the persisted record is `source: "marketplace"`

Constraints verified in code:

- `--link` is not allowed with `--marketplace`
- `--pin` is not allowed with `--marketplace`
- known marketplace shortcuts are loaded from `~/.claude/plugins/known_marketplaces.json`
- local marketplaces may come from a local file/directory
- remote marketplace manifests are loaded by cloning git/GitHub sources
- remote marketplace manifests are validated more strictly than local ones
- remote marketplace plugin entries may not use arbitrary HTTP paths or absolute local paths

So the marketplace lane is a user-facing distribution surface, but it is still a dispatcher that ultimately resolves to path/archive install material.

### Marketplace ingestion and safety contract

`src/plugins/marketplace.ts` adds a real safety layer around remote delivery:

- marketplace downloads use streaming responses
- downloads are bounded by timeout
- downloads are bounded by `MAX_MARKETPLACE_ARCHIVE_BYTES = 256 * 1024 * 1024`
- filenames are sanitized before temp-file creation
- remote manifests are validated so plugin paths cannot escape the marketplace root

This is important for SNC because it shows that delivery safety is partly implemented at the marketplace ingest layer, not only inside the generic plugin installer.

### Install package constraints

`src/plugins/install.ts` shows the installer's hard package constraints:

- plugin ids are validated before use
- scoped ids are mapped to reserved hashed on-disk names
- package installs require `package.json` with `openclaw.extensions`
- archive extraction recognizes root markers including:
  - `package.json`
  - `openclaw.plugin.json`
  - `.codex-plugin/plugin.json`
  - `.claude-plugin/plugin.json`
  - `.cursor-plugin/plugin.json`

So the install contract is not "any JS project can be installed". OpenClaw expects an extension-aware package shape.

### Update contract

`src/cli/plugins-update-command.ts` and `src/plugins/update.ts` show a deliberately narrow update surface:

- update only works for tracked installs
- plugin sources eligible for update are:
  - `npm`
  - `marketplace`
  - `clawhub`
- `path` and `archive` installs are skipped
- npm updates include integrity drift handling and optional user confirmation
- if config changes, CLI tells the user to restart the gateway to load plugins and hooks

This means linked-path local rehearsal is good for development, but it is not a self-updating channel. If SNC wants ordinary update UX, it needs a tracked package distribution lane.

### Uninstall contract

`src/plugins/uninstall.ts` shows that uninstall is config-first and safety-aware:

- it removes plugin references from config entries
- it removes tracked install records
- it removes allowlist references
- it removes linked `load.paths` entries for `source === "path"`
- it resets the memory slot if this plugin owned it
- it removes owned channel config keys
- only then does it optionally delete installed files

Two important safety properties are explicit:

- linked path installs never delete the source directory
- recursive deletion does not blindly trust `installRecord.installPath`; it falls back to a safe default under the extensions dir when paths disagree

### Discovery and clean-host implications

`src/plugins/discovery.ts` shows that plugin discovery is not a blind scan:

- candidate sources are checked against their declared roots
- non-bundled plugins can be blocked for suspicious ownership
- world-writable paths are blocked
- path escape is blocked

This matters for clean-host rehearsal because SNC delivery has to work inside the host's managed discovery model, not by relying on an arbitrary checked-out workspace path.

## Key Findings

1. The real end-user delivery shell is `openclaw plugins install/update/uninstall/marketplace`, not the internal installer modules.
2. Linked local path install is a development lane, not the normal product lane. It records `source: "path"` and is skipped by update.
3. Ordinary copy-install lands in the managed config-dir `extensions` directory, which is the most realistic clean-host rehearsal path for SNC.
4. Marketplace is a product-facing source resolver, not a distinct runtime format. It resolves entries, enforces extra safety checks, and then feeds normal install flows.
5. Bare install specs can be intercepted by bundled plugin sources before npm, so install strings alone do not uniquely identify the artifact source.
6. Update UX is only real for tracked package-like lanes such as `npm`, `marketplace`, and `clawhub`.
7. Uninstall behavior is explicitly designed to avoid deleting linked source directories or trusting arbitrary stored paths.

## SNC relevance

For `Milestone 2`, this packet sharpens the delivery picture:

- `SNC-Milestone2-03 Clean-Host Delivery Rehearsal` should treat linked local install as a development convenience only
- the primary rehearsal lane should be a copied plugin directory or archive install into a clean host
- if SNC wants a real "install/update later" story, it needs a tracked distributable package lane rather than a repo-linked lane
- marketplace is potentially useful later for productization, but it is not required to prove the Milestone 2 product envelope

This also reinforces the earlier `Milestone 1` envelope result: the natural SNC artifact is still the plugin package itself, not the mixed engineering workspace.

## Modification guidance

### Wrap / extend

- Build SNC delivery rehearsals around `openclaw plugins install` using copied directory or archive artifacts.
- Treat `openclaw plugins update` eligibility as a design input for future SNC packaging.
- Reuse marketplace only if SNC later wants a curated source catalog or demo-friendly install surface.

### Defer

- Defer marketplace-first distribution as a requirement for Milestone 2.
- Defer ClawHub-specific publishing assumptions unless the release program explicitly chooses that channel.
- Defer any host-internal installer rewrites; the current task is to align SNC packaging with host delivery lanes, not to replace them.

### Avoid

- Do not anchor SNC's product story to `--link` installs.
- Do not assume bare install strings always resolve to npm artifacts because bundled interception is real.
- Do not treat internal installer modules as the user contract; the CLI shell is the contract users actually see.

## Clean-Host Rehearsal Guidance

For current SNC work, the most faithful rehearsal order is:

1. validate a clean host with no engineering workspace linkage
2. install SNC from a copied local plugin directory or release-shaped archive
3. verify discovery, load, and restart behavior through normal plugin CLI surfaces
4. keep linked-path install as a secondary developer convenience check only

If a later round wants update rehearsal, it should use a tracked distribution lane rather than a linked directory.

## Still-unverified questions

1. This packet did not verify whether the current SNC package is already fully release-ready for npm publication; it only mapped the host delivery lanes.
2. This packet did not test marketplace publication authoring flows, only marketplace consumption/list/install behavior from code.
3. The exact host UX around gateway restart and live plugin reload was read from code paths and CLI messages, not from a live end-to-end run in this round.
