# CC-05 Governance / Settings / Policy

## Purpose

This packet isolates the Claude Code governance layer:

- settings source precedence
- remote-managed settings
- policy restrictions
- permission enforcement
- privacy and plugin-control gates

For SNC, this matters because later borrowing decisions will go wrong if we confuse runtime intelligence with governance enforcement.

## Main Entry Files

### Settings source and merge logic

- `data/external/claude-code-leeyeel-4b9d30f/src/utils/settings/constants.ts`
- `data/external/claude-code-leeyeel-4b9d30f/src/utils/settings/settings.ts`
- `data/external/claude-code-leeyeel-4b9d30f/src/utils/settings/types.ts`

### Remote governance services

- `data/external/claude-code-leeyeel-4b9d30f/src/services/remoteManagedSettings/index.ts`
- `data/external/claude-code-leeyeel-4b9d30f/src/services/remoteManagedSettings/securityCheck.tsx`
- `data/external/claude-code-leeyeel-4b9d30f/src/services/policyLimits/index.ts`
- `data/external/claude-code-leeyeel-4b9d30f/src/services/settingsSync/index.ts`

### Governance executors and guards

- `data/external/claude-code-leeyeel-4b9d30f/src/utils/permissions/permissions.ts`
- `data/external/claude-code-leeyeel-4b9d30f/src/utils/settings/pluginOnlyPolicy.ts`
- `data/external/claude-code-leeyeel-4b9d30f/src/utils/plugins/pluginPolicy.ts`
- `data/external/claude-code-leeyeel-4b9d30f/src/utils/privacyLevel.ts`
- `data/external/claude-code-leeyeel-4b9d30f/src/components/ManagedSettingsSecurityDialog/utils.ts`

### Product-shell governance wrappers

- `data/external/claude-code-leeyeel-4b9d30f/src/commands/privacy-settings/privacy-settings.tsx`
- `data/external/claude-code-leeyeel-4b9d30f/src/commands/permissions/permissions.tsx`

## Verified Read

### 1. Governance is a multi-plane system, not one settings file

The code current state splits governance across several distinct mechanisms:

- local settings merge and precedence
- remote-managed settings
- remote policy restrictions
- settings sync
- permission evaluation
- privacy/network suppression
- plugin/customization restrictions

So if the claim is read as a single settings subsystem, the code disagrees. Governance is distributed by design.

Primary evidence:

- `data/external/claude-code-leeyeel-4b9d30f/src/utils/settings/*`
- `data/external/claude-code-leeyeel-4b9d30f/src/services/remoteManagedSettings/*`
- `data/external/claude-code-leeyeel-4b9d30f/src/services/policyLimits/*`
- `data/external/claude-code-leeyeel-4b9d30f/src/services/settingsSync/*`
- `data/external/claude-code-leeyeel-4b9d30f/src/utils/permissions/*`

### 2. Settings sources have a normal merge chain plus a special policy path

`constants.ts` defines the setting sources:

- `userSettings`
- `projectSettings`
- `localSettings`
- `flagSettings`
- `policySettings`

`getEnabledSettingSources()` always includes `policySettings` and `flagSettings`.

But `settings.ts` gives `policySettings` special treatment: it is not a normal deep-merge peer. Instead, it uses "first source wins" precedence:

- remote managed settings
- MDM / HKLM / plist
- managed file settings
- HKCU

This is a crucial governance boundary, not ordinary configuration behavior.

Primary evidence:

- `data/external/claude-code-leeyeel-4b9d30f/src/utils/settings/constants.ts`
- `data/external/claude-code-leeyeel-4b9d30f/src/utils/settings/settings.ts`

### 3. Trust-sensitive controls intentionally exclude `projectSettings`

Several trust-sensitive helpers in `settings.ts` explicitly exclude `projectSettings`, with comments explaining the malicious-project risk:

- `hasSkipDangerousModePermissionPrompt()`
- `hasAutoModeOptIn()`
- `getUseAutoModeDuringPlan()`
- `getAutoModeConfig()`

This is a strong governance signal. CC is not just merging settings; it has trust-tier logic about which sources are allowed to influence dangerous behavior.

Primary evidence:

- `data/external/claude-code-leeyeel-4b9d30f/src/utils/settings/settings.ts`

### 4. Remote-managed settings are fail-open, polled, and security-checked

`remoteManagedSettings/index.ts` handles enterprise-style managed settings with these verified properties:

- eligibility checks
- retry and ETag/checksum caching
- background polling
- fail-open behavior on fetch failure
- security review before accepting dangerous changes
- `settingsChangeDetector.notifyChange('policySettings')` on updates

This is a policy ingestion plane, not just remote config sync.

Primary evidence:

- `data/external/claude-code-leeyeel-4b9d30f/src/services/remoteManagedSettings/index.ts`
- `data/external/claude-code-leeyeel-4b9d30f/src/services/remoteManagedSettings/securityCheck.tsx`

### 5. Dangerous managed settings cross an explicit approval gate

`securityCheck.tsx` does more than classify settings. It only triggers when dangerous settings are added or changed, shows a blocking `ManagedSettingsSecurityDialog`, and returns one of:

- `approved`
- `rejected`
- `no_check_needed`

That means remote policy can reach execution-relevant surfaces such as shell settings, env vars, and hooks, but CC still inserts an explicit local approval boundary when the risk class changes.

Primary evidence:

- `data/external/claude-code-leeyeel-4b9d30f/src/services/remoteManagedSettings/securityCheck.tsx`

### 6. Dangerous managed settings are explicitly classified

`ManagedSettingsSecurityDialog/utils.ts` extracts and compares dangerous settings such as:

- dangerous shell settings
- env vars not in `SAFE_ENV_VARS`
- hooks

Changes in these categories can trigger a managed-settings security dialog.

This is important because it shows CC treats some governance changes as execution-surface changes, not harmless preferences.

Primary evidence:

- `data/external/claude-code-leeyeel-4b9d30f/src/components/ManagedSettingsSecurityDialog/utils.ts`

### 7. Policy limits are a separate restriction channel from managed settings

`policyLimits/index.ts` is not the same thing as remote-managed settings. It is a separate service plane for org-level restrictions:

- fail-open by default
- checksum/ETag caching
- background polling
- `isPolicyAllowed(policy)` lookup

There is also a special case: in essential-traffic-only mode, policies in `ESSENTIAL_TRAFFIC_DENY_ON_MISS` fail closed, and the current code includes `allow_product_feedback` there.

This separation matters. Governance is not one remote settings blob.

Primary evidence:

- `data/external/claude-code-leeyeel-4b9d30f/src/services/policyLimits/index.ts`

### 8. Settings sync is a third remote plane, focused on user/project state

`settingsSync/index.ts` is not policy enforcement. It is a separate sync mechanism for user and project state, with different upload/download behavior:

- interactive CLI uploads local settings deltas
- CCR downloads remote settings before plugin installation
- synced artifacts include user settings, user memory, project local settings, and project local memory
- `markInternalWrite(...)` is used to avoid change-detector loops when applying remote data locally

This is governance-adjacent, but not the same as remote policy.

Primary evidence:

- `data/external/claude-code-leeyeel-4b9d30f/src/services/settingsSync/index.ts`

### 9. The permission engine is where governance becomes enforcement

`permissions.ts` extends governance into execution decisions. Verified mechanics include:

- rule sources include settings sources plus `cliArg`, `command`, and `session`
- safety checks are bypass-immune
- allow/ask/deny logic is layered before actual execution
- headless mode can use `runPermissionRequestHooksForHeadlessAgent(...)`
- auto-mode classifier behavior is a separate governance-driven branch, not just raw runtime logic

This is the key runtime-vs-governance bridge in the packet.

Primary evidence:

- `data/external/claude-code-leeyeel-4b9d30f/src/utils/permissions/permissions.ts`

### 10. Plugin and customization policy are explicit governance surfaces

`pluginOnlyPolicy.ts` shows that `strictPluginOnlyCustomization` can lock customization surfaces such as:

- `skills`
- `agents`
- `hooks`
- `mcp`

to admin-trusted sources only.

`pluginPolicy.ts` separately blocks plugins via managed `enabledPlugins[pluginId] === false`.

This means extension surfaces are under governance, not just file discovery.

Primary evidence:

- `data/external/claude-code-leeyeel-4b9d30f/src/utils/settings/pluginOnlyPolicy.ts`
- `data/external/claude-code-leeyeel-4b9d30f/src/utils/plugins/pluginPolicy.ts`

### 11. Privacy level is a governance control over network behavior

`privacyLevel.ts` defines:

- `default`
- `no-telemetry`
- `essential-traffic`

`essential-traffic` disables all nonessential network traffic.

This is not just analytics preference. It changes which remote governance and product calls are even allowed.

Primary evidence:

- `data/external/claude-code-leeyeel-4b9d30f/src/utils/privacyLevel.ts`

### 12. Some shell commands are just governance wrappers

The `privacy-settings` command is a product-shell wrapper around Grove/privacy APIs and a fallback web URL. The `permissions` command is a UI wrapper over the permission rule list.

So not every governance-looking feature is a governance mechanism. Some are shell exposure for deeper services or rule engines.

Primary evidence:

- `data/external/claude-code-leeyeel-4b9d30f/src/commands/privacy-settings/privacy-settings.tsx`
- `data/external/claude-code-leeyeel-4b9d30f/src/commands/permissions/permissions.tsx`

## Governance Map

### Settings merge plane

- local source precedence
- read/write separation between editable sources and read-only policy/flag sources

### Managed policy ingestion plane

- remote-managed settings
- security dialog for dangerous changes
- admin-source precedence

### Restriction plane

- policy limits via `isPolicyAllowed(...)`
- feature restriction without changing all settings content

### Sync plane

- user/project state sync
- memory and local settings replication

### Enforcement plane

- permission engine
- safety checks
- headless permission hooks
- auto-mode governance

### Privacy and extension-governance plane

- privacy level controls network reachability
- plugin blocking
- plugin-only customization restrictions

## Settings / Policy Boundary Map

### Settings

Usually means user or project configuration values and their merge behavior.

### Policy

Means admin-controlled or org-controlled constraints that:

- override lower-trust sources
- gate features
- restrict customization origins
- force approval/security review behavior

CC uses both, and it deliberately does not let ordinary project settings masquerade as trusted policy for dangerous decisions.

## Runtime-vs-Governance Separation

### Runtime

- query loop
- model/tool orchestration
- transcript handling

### Governance

- who may enable what
- which source is trusted
- whether a tool action needs approval
- whether nonessential traffic is allowed
- whether extensions may load from user/project origins

The permission engine is where governance constrains runtime behavior, but it is still a governance layer first.

## SNC Relevance

This packet is highly relevant to SNC because SNC is intended to be hot-pluggable rather than a hostile host takeover.

The big lessons are:

- host trust tiers matter
- dangerous behavior must not be project-authorable by default
- extension surfaces may need policy-aware gating
- remote settings, policy restrictions, and sync should stay conceptually separate

For SNC, that argues for an adapter layer that reads host governance state rather than replacing it.

## Modification Guidance

### Wrap

- read host policy and permission state through one SNC governance adapter
- make SNC features respect host privacy/network suppression before doing remote work
- gate SNC extension loading through host trust tiers where possible

### Extend

- add SNC-specific governance checks as optional overlays, not replacements for host precedence rules
- surface SNC approvals through existing permission or policy seams where available
- preserve the distinction between "policy arrived remotely" and "dangerous execution surface now needs local acceptance"

### Defer

- cloud settings sync parity
- product-shell privacy UI parity
- enterprise managed-settings UX unless SNC truly needs it

### Do-not-touch

- do not weaken the trusted-source exclusions that keep `projectSettings` out of dangerous permission and auto-mode controls
- do not collapse remote-managed settings, policy limits, and settings sync into one blob in SNC design
- do not bypass safety checks or plugin-only policy gates just to make SNC easier to wire up

## Still Unverified

- full schema breadth of every managed setting and policy restriction in production use
- exact interaction between SNC-style hooks and `strictPluginOnlyCustomization` under all feature-flag combinations
- how much governance behavior changes across desktop, CCR, and other non-interactive product modes
