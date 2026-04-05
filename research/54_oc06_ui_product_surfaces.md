# OC-06 UI / Product Surfaces

## What This Problem / Subsystem Is

This packet covers the operator-facing shells that sit above OpenClaw's host runtime:

- the CLI entry shell
- guided onboarding / configuration flows
- the gateway-backed terminal UI
- shared terminal presentation helpers
- the interactive reply payload contract used by channels and setup flows

For SNC, this domain matters less as a continuity donor and more as a product-surface map.
It tells us which user-facing surfaces are host-critical, which are optional shells, and where SNC should later plug in product cues without taking ownership of the host product shell.

This packet does **not** reopen runtime-core behavior from `OC-01`, plugin host rules from `OC-02`, or gateway control-plane internals from `OC-03` / `OC-09`.

## Main Entry Files

- CLI bootstrap:
  - `data/external/openclaw-v2026.4.1/openclaw.mjs`
  - `data/external/openclaw-v2026.4.1/src/entry.ts`
  - `data/external/openclaw-v2026.4.1/src/cli/run-main.ts`
- CLI command shell:
  - `data/external/openclaw-v2026.4.1/src/cli/program/build-program.ts`
  - `data/external/openclaw-v2026.4.1/src/cli/program/command-registry.ts`
  - `data/external/openclaw-v2026.4.1/src/cli/program/register.subclis.ts`
  - `data/external/openclaw-v2026.4.1/src/cli/route.ts`
- Guided setup / onboarding:
  - `data/external/openclaw-v2026.4.1/src/cli/program/register.setup.ts`
  - `data/external/openclaw-v2026.4.1/src/cli/program/register.onboard.ts`
  - `data/external/openclaw-v2026.4.1/src/cli/program/register.configure.ts`
  - `data/external/openclaw-v2026.4.1/src/commands/onboard-interactive.ts`
  - `data/external/openclaw-v2026.4.1/src/wizard/setup.ts`
  - `data/external/openclaw-v2026.4.1/src/wizard/setup.finalize.ts`
  - `data/external/openclaw-v2026.4.1/src/wizard/session.ts`
- TUI shell:
  - `data/external/openclaw-v2026.4.1/src/cli/tui-cli.ts`
  - `data/external/openclaw-v2026.4.1/src/tui/tui.ts`
  - `data/external/openclaw-v2026.4.1/src/tui/gateway-chat.ts`
  - `data/external/openclaw-v2026.4.1/src/tui/tui-session-actions.ts`
- Terminal presentation substrate:
  - `data/external/openclaw-v2026.4.1/src/terminal/theme.ts`
  - `data/external/openclaw-v2026.4.1/src/terminal/links.ts`
  - `data/external/openclaw-v2026.4.1/src/terminal/stream-writer.ts`
- Interactive payload contract:
  - `data/external/openclaw-v2026.4.1/src/interactive/payload.ts`

## UI / Product Atlas

### 1. The canonical product shell is still CLI-first

`openclaw.mjs` loads `src/entry.ts`, which normalizes process startup and then dispatches into `src/cli/run-main.ts`.
`run-main.ts` builds the Commander program, applies route-first fast paths, and lazily registers both core commands and sub-CLIs.

This means OpenClaw's true product shell is still the CLI command surface, not the TUI and not the browser UI.

Primary evidence:

- `data/external/openclaw-v2026.4.1/openclaw.mjs`
- `data/external/openclaw-v2026.4.1/src/entry.ts`
- `data/external/openclaw-v2026.4.1/src/cli/run-main.ts`
- `data/external/openclaw-v2026.4.1/src/cli/program/build-program.ts`
- `data/external/openclaw-v2026.4.1/src/cli/program/command-registry.ts`
- `data/external/openclaw-v2026.4.1/src/cli/program/register.subclis.ts`

### 2. Core host UX is onboarding/configuration heavy, not just "run one command"

The core command registry puts `setup`, `onboard`, and `configure` in the primary command family.
Those commands are not tiny wrappers; they are the first-run and reconfiguration product path for workspace, gateway, skills, channels, and auth.

This makes guided setup part of host UX, not an optional add-on.

Primary evidence:

- `data/external/openclaw-v2026.4.1/src/cli/program/command-registry.ts`
- `data/external/openclaw-v2026.4.1/src/cli/program/register.setup.ts`
- `data/external/openclaw-v2026.4.1/src/cli/program/register.onboard.ts`
- `data/external/openclaw-v2026.4.1/src/cli/program/register.configure.ts`

### 3. The wizard subsystem is a reusable interaction engine, not only a local prompt loop

`src/wizard/setup.ts` owns the actual onboarding flow.
`src/wizard/session.ts` turns wizard steps into a sessionized prompt/answer protocol.
That same wizard engine is used locally through `commands/onboard-interactive.ts`, but the session abstraction also makes it usable through non-local shells later.

So `src/wizard` is better read as a reusable product interaction engine than as "just the clack setup script."

Primary evidence:

- `data/external/openclaw-v2026.4.1/src/commands/onboard-interactive.ts`
- `data/external/openclaw-v2026.4.1/src/wizard/setup.ts`
- `data/external/openclaw-v2026.4.1/src/wizard/session.ts`

### 4. The TUI is a gateway-backed operator shell, not a direct runtime owner

`src/cli/tui-cli.ts` only parses options and calls `runTui(...)`.
`src/tui/tui.ts` then connects through `GatewayChatClient`, and `src/tui/gateway-chat.ts` speaks in gateway methods like:

- `chat.send`
- `chat.abort`
- `chat.history`
- `sessions.list`
- `models.list`

This means the TUI is an operator shell on top of the gateway control plane.
It does not own turn execution directly.

Primary evidence:

- `data/external/openclaw-v2026.4.1/src/cli/tui-cli.ts`
- `data/external/openclaw-v2026.4.1/src/tui/tui.ts`
- `data/external/openclaw-v2026.4.1/src/tui/gateway-chat.ts`
- `data/external/openclaw-v2026.4.1/src/tui/tui-session-actions.ts`

### 5. Shared terminal code is presentation infrastructure, not a product shell

`src/terminal/*` provides styling, link rendering, health formatting, stream-safe writes, and terminal restoration helpers.
These files matter for operator ergonomics and safe CLI exit behavior, but they are not where product identity or SNC continuity should be anchored.

Primary evidence:

- `data/external/openclaw-v2026.4.1/src/terminal/theme.ts`
- `data/external/openclaw-v2026.4.1/src/terminal/links.ts`
- `data/external/openclaw-v2026.4.1/src/terminal/stream-writer.ts`

### 6. `interactive/payload.ts` is a channel-facing UI contract, not a full product shell

`src/interactive/payload.ts` defines button/select/text block normalization and reply-content presence checks.
It is a shared payload contract for channel / plugin-facing interactive replies.
That makes it useful as a compatibility seam, but not a standalone host product surface.

Primary evidence:

- `data/external/openclaw-v2026.4.1/src/interactive/payload.ts`
- `data/external/openclaw-v2026.4.1/src/plugin-sdk/interactive-runtime.ts`

## Verified Structure / Call Chains

### 1. CLI product shell chain

Verified chain:

`openclaw.mjs`
-> `src/entry.ts`
-> `src/cli/run-main.ts`
-> `buildProgram()`
-> `registerProgramCommands(...)`
-> core commands or sub-CLIs
-> conditional plugin CLI registration when builtin ownership does not apply

Important read:

- the wrapper handles basic bootstrap and root help/version fast paths
- `run-main.ts` enforces runtime checks and loads dotenv/path state before full parsing
- command registration is intentionally lazy to keep startup usable
- plugin CLI commands are loaded after builtin primary resolution, so extensions can add commands without taking over the host shell

### 2. Guided onboarding chain

Verified chain:

`setup` / `onboard` / `configure`
-> command registrars under `src/cli/program/*`
-> setup/onboard command helpers
-> `runSetupWizard(...)`
-> `setup.finalize.ts`
-> optional daemon install, health checks, dashboard open, optional `runTui(...)`

Important read:

- onboarding is not only config writing
- it also orchestrates gateway install, Control UI launch, TUI launch, skills, hooks, and channel setup

### 3. TUI operator-shell chain

Verified chain:

`openclaw tui`
-> `src/cli/tui-cli.ts`
-> `runTui(...)`
-> `GatewayChatClient.connect(...)`
-> gateway RPC methods

Important read:

- TUI state is synced from gateway session rows, not from local runner state
- agent/session/model selectors all read through gateway-facing lists and patches
- therefore TUI is a gateway client shell

### 4. Wizard interaction abstraction chain

Verified chain:

wizard runner
-> `WizardSessionPrompter`
-> step objects (`note`, `select`, `text`, `confirm`, etc.)
-> deferred answer resolution
-> session status transitions

Important read:

- wizard logic and wizard transport are already separated
- that separation is why onboarding can be surfaced through more than one shell

## Core Host UX vs Optional / Productization-Later UX

### Core host UX

- CLI bootstrap and command shell
- first-run setup / onboarding / configure flows
- terminal restoration / safe output behavior needed for reliable local operation

Why this is core:

- these surfaces are the normal path to get a valid config, a workspace, and a running gateway
- they are also the recovery path when the host is unhealthy

### Optional / productization-later UX

- TUI session shell
- browser-dashboard launch affordances from CLI
- docs / QR / completion / legacy alias polish
- richer interactive reply widgets beyond plain text

Why this is later:

- the host can still operate without them
- they improve operator comfort and product feel, but they do not define host runtime ownership

## Author-Workflow Relevance

The strongest author-workflow surfaces in this packet are:

- onboarding that gets workspace, gateway, skills, and channels into a valid state
- the TUI as a low-friction gateway-backed writing shell
- terminal formatting that makes health/status and guidance readable

But none of these change what the model fundamentally sees.
They mainly improve operator setup, inspection, and day-to-day interaction quality.

## SNC Relevance

This packet mostly tells SNC what **not** to over-own.

Current read:

- SNC v1 does not need to replace the CLI shell
- SNC v1 does not need to own the wizard framework
- SNC v1 does not need to fork the TUI
- SNC should treat CLI/TUI as integration surfaces, not as the home for continuity logic
- SNC later may want:
  - plugin-provided CLI commands
  - clearer SNC diagnostics in setup / doctor / dashboard / TUI
  - continuity-aware presentation in the TUI or dashboard

That makes this packet more about safe product integration than about a direct donor mechanism.

## Modification Guidance

- `Hot-pluggable seam`: add SNC operator commands through plugin CLI registration rather than editing core command registries. Evidence: `src/cli/run-main.ts` already resolves builtin ownership first and then imports `../plugins/cli.js` to register plugin CLI commands only when that ownership does not apply.
- `Hot-pluggable seam`: `src/interactive/payload.ts` is a reusable compatibility contract for richer reply surfaces.
- `Wrap preferred`: add SNC-specific setup guidance, diagnostics, or UX helpers around existing CLI/TUI flows rather than forking them.
- `Host-owned seam`: `src/entry.ts`, `src/cli/run-main.ts`, and the core command registries under `src/cli/program/*`.
- `Host-owned seam`: `src/wizard/setup.ts` and `src/wizard/session.ts` define host onboarding behavior and wizard transport semantics.
- `Internal edit only if proven necessary`: `src/tui/tui.ts` and `src/tui/gateway-chat.ts`; they are broad operator-shell code with gateway coupling and large blast radius.
- `Out of SNC v1 scope`: most of `src/terminal/*`, docs/QR/completion polish, and legacy alias command families.
- `Productization-later surface`: TUI polish, dashboard affordances, richer interactive reply widgets, and authoring-centric overlays.

## Still-Unverified Questions

- How much of future first-party product UX will live in the browser Control UI versus CLI/TUI shells is not answerable from this packet alone because the browser app itself is outside this scope.
- Whether any external plugins already contribute substantial first-class CLI/TUI product surfaces was not proven here; this packet only confirmed the host loading seams.
- The long-term canonical operator shell is still ambiguous at the product level: current code is CLI-first, but the onboarding finalizer clearly nudges users toward dashboard and TUI once the gateway is healthy.
