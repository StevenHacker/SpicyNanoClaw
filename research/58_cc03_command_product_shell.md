# CC-03 Command / Product Shell Atlas

## What This Subsystem Is

This packet isolates the Claude Code shell/product layer that sits around the
core query/runtime harness.

The code evidence shows a clear split:

- the core runtime lives in `query.ts`, tool execution, compaction, and related
  orchestration paths already covered by `CC-01` and `CC-02`
- the command/product shell lives in CLI fast paths, command registration,
  slash-command execution modes, settings/help panes, session/task/product UI,
  and output-style/config presentation

For SNC, this packet matters because Claude Code feels "finished" partly due to
its shell breadth, but that breadth is not the same thing as runtime donor
value.

## Main Entry Files

### Shell assembly and routing

- `data/external/claude-code-leeyeel-4b9d30f/src/entrypoints/cli.tsx`
- `data/external/claude-code-leeyeel-4b9d30f/src/main.tsx`
- `data/external/claude-code-leeyeel-4b9d30f/src/commands.ts`
- `data/external/claude-code-leeyeel-4b9d30f/src/types/command.ts`
- `data/external/claude-code-leeyeel-4b9d30f/src/hooks/useMergedCommands.ts`
- `data/external/claude-code-leeyeel-4b9d30f/src/screens/REPL.tsx`

### Representative shell command families

- `data/external/claude-code-leeyeel-4b9d30f/src/commands/config/config.tsx`
- `data/external/claude-code-leeyeel-4b9d30f/src/commands/help/help.tsx`
- `data/external/claude-code-leeyeel-4b9d30f/src/commands/status/status.tsx`
- `data/external/claude-code-leeyeel-4b9d30f/src/commands/theme/theme.tsx`
- `data/external/claude-code-leeyeel-4b9d30f/src/commands/tasks/tasks.tsx`
- `data/external/claude-code-leeyeel-4b9d30f/src/commands/session/session.tsx`
- `data/external/claude-code-leeyeel-4b9d30f/src/commands/plugin/plugin.tsx`
- `data/external/claude-code-leeyeel-4b9d30f/src/commands/mcp/mcp.tsx`
- `data/external/claude-code-leeyeel-4b9d30f/src/commands/review.ts`
- `data/external/claude-code-leeyeel-4b9d30f/src/commands/compact/compact.ts`
- `data/external/claude-code-leeyeel-4b9d30f/src/commands/output-style/output-style.tsx`
- `data/external/claude-code-leeyeel-4b9d30f/src/outputStyles/loadOutputStylesDir.ts`

## Verified Structure / Mechanisms

### 1. The product shell starts before the REPL

`src/entrypoints/cli.tsx` contains multiple fast paths that route into
product/service modes before the full interactive shell is loaded. Verified
examples include:

- `remote-control` / `remote` / `sync` / `bridge`
- `daemon`
- `ps` / `logs` / `attach` / `kill`
- `environment-runner`
- `self-hosted-runner`

This means part of Claude Code's "shell" is not slash commands at all; it is
top-level mode routing and product packaging around the runtime.

### 2. `commands.ts` is the command atlas and policy gate

`src/commands.ts` is the main registry and merge point for built-in commands.
The code evidence shows:

- a centralized command list with feature-gated imports
- lazy loading for especially heavy command families
- enable/availability checks rather than blind export
- remote-safe filtering via `REMOTE_SAFE_COMMANDS`,
  `isBridgeSafeCommand(...)`, and `filterCommandsForRemoteMode(...)`

This is shell policy and affordance management, not the turn execution harness.

### 3. Command execution is intentionally typed as shell behavior

`src/types/command.ts` defines three command execution modes:

- `type: 'prompt'`
- `type: 'local'`
- `type: 'local-jsx'`

That split is important because it shows Claude Code does not treat every slash
command as "just prompt text":

- `prompt` commands package or inject prompt blocks
- `local` commands run local side effects
- `local-jsx` commands mount local React UI flows

This is strong evidence that the command layer is a product shell abstraction.

### 4. Many command families are thin UI shells over larger product components

The representative command files show that many slash commands are mostly shell
mount points:

- `config/config.tsx` returns `<Settings defaultTab="Config" />`
- `help/help.tsx` returns `<HelpV2 ... />`
- `status/status.tsx` returns `<Settings defaultTab="Status" />`
- `theme/theme.tsx` returns `<ThemePicker ... />`
- `tasks/tasks.tsx` returns `<BackgroundTasksDialog />`
- `plugin/plugin.tsx` returns `<PluginSettings />`
- `session/session.tsx` returns a session-management pane with QR/remote info
- `mcp/mcp.tsx` renders MCP settings/reconnect/toggle UI

So a large part of the command tree is a discoverable operator shell for local
product UI, not core model/runtime logic.

### 5. The REPL merges only the final shell surface it needs

The current code shows two different merge stages:

- `src/commands.ts` assembles the main built-in command surface
- `src/hooks/useMergedCommands.ts` only merges the already-prepared command
  list with MCP commands at REPL time

This is a useful shell pattern: do most structural command assembly once, then
late-merge dynamic commands close to the UI.

### 6. Output style is now a config-backed shell capability, not a standalone domain

`src/commands/output-style/output-style.tsx` is explicitly deprecated and tells
the user to use `/config` or the settings file instead.

At the same time, `src/outputStyles/loadOutputStylesDir.ts` still loads markdown
styles from project and user `.claude/output-styles` directories. So the code
current state is:

- output-style customization still exists
- but it has been folded into the wider config/settings shell
- the donor value is the extension pattern, not the deprecated slash command

### 7. Boundary examples make the shell/runtime split visible

The codebase contains both shell-shaped and runtime-touching commands:

- `/review` in `src/commands/review.ts` is a prompt-packaging surface that
  shapes user workflow
- `/compact` in `src/commands/compact/compact.ts` directly touches compaction,
  microcompact, and session memory behavior

This is the practical boundary for SNC:

- shell-shaped commands are good extension donors
- commands that directly mutate runtime internals belong to runtime packets,
  not this one

## Command-Family Atlas

### Operator shell

- `help`
- `status`
- `theme`
- `clear`
- `copy`
- `vim`

These improve navigation and shell usability rather than agent reasoning.

### Configuration / governance shell

- `config`
- `permissions`
- `privacy-settings`
- `model`
- `memory`

These expose control, policy, and configuration surfaces around the runtime.

### Session / workflow shell

- `session`
- `resume`
- `tasks`
- `review`
- `plan`

These shape how work is entered, resumed, inspected, and packaged.

### Extension shell

- `plugin`
- `skills`
- `agents`
- `mcp`
- `hooks`
- `reload-plugins`

This family is the most directly relevant donor area for SNC because it shows
how shell capabilities can remain layered above the host runtime.

### Productization / support shell

- `remote-setup`
- `install-github-app`
- `install-slack-app`
- `feedback`
- `release-notes`

These improve product completeness but are weak donors for SNC core delivery.

## Runtime-Value vs Shell-Value Separation

### Runtime-value

Already belongs mainly in `CC-01` and `CC-02`:

- query loop behavior
- tool/result handling
- compaction and recovery
- message/state pressure management

### Shell-value

Belongs in this packet:

- command registration and discoverability
- operator UI panes and dialogs
- environment-aware command filtering
- command execution mode typing
- output-style/config presentation
- extension command surfacing

For SNC, the key risk is over-crediting shell breadth as if it were harness
quality.

## Shell Donor Note

The strongest donor patterns here are architectural, not command-parity goals:

- one command registry with explicit policy and availability checks
- clear execution modes for prompt, local side effect, and local UI
- late merge of dynamic commands close to the REPL shell
- environment-sensitive command filtering instead of forking the host runtime
- config-backed extension surfaces such as markdown-loaded output styles

The weakest donor targets are:

- product-specific onboarding flows
- broad command parity for its own sake
- deprecated shell surfaces kept only for compatibility

## SNC Relevance

This packet explains a large part of why Claude Code feels like a product
rather than only a runtime harness:

- many operator actions are first-class shell commands
- local panes make settings, plugin state, MCP state, and tasks inspectable
- mode-sensitive command filtering keeps one host usable across different
  environments

For SNC, the practical lesson is:

- keep SNC features hot-pluggable as shell modules, commands, hooks, or context
  helpers
- avoid taking host ownership just to gain shell breadth
- separate runtime-quality work from shell/product completeness work

## Modification Guidance

### Wrap

- add SNC operator capabilities as plugin or hook-provided commands
- keep shell policy above the runtime, especially for remote-safe or
  restricted-mode subsets
- use config-backed loading where possible instead of hardcoding every surface

### Extend

- add SNC-specific shell groups for context inspection, maintenance, and
  operator diagnostics
- use `prompt` commands for lightweight prompt shaping
- use `local` or `local-jsx` style shells for richer UI without rewriting the
  host runtime

### Defer

- parity with Claude Code's product-support command families
- account/onboarding flows
- cosmetic shell breadth that does not change SNC landing quality

### Do-Not-Touch

- do not pull this packet back into `query.ts` or other core runtime files
- do not treat deprecated `/output-style` as a strategic donor by itself
- do not make SNC core depend on a large built-in shell tree when pluggable
  registration can preserve host ownership boundaries

## Still-Unverified Questions

- which command families are model-invocable versus strictly user-invoked in
  every mode
- how much additional command availability is shaped by feature flags not
  covered in this pass
- whether some shell commands carry hidden service/account dependencies that
  further reduce donor value

