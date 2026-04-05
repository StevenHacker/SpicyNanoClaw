# OpenClaw Modification Atlas

This document turns the accepted OpenClaw deconstruction packets into a modification playbook for SNC and later specialized Claw variants.

Evidence base:

- accepted packets `OC-01`, `OC-02`, `OC-03`, `OC-04`, `OC-05`, `OC-07`, `OC-08`, `OC-09`
- direct source anchors in the frozen snapshot under `data/external/openclaw-v2026.4.1`

The central doctrine stays the same across all subsystems:

- prefer hot-pluggable seams first
- prefer host consumption over host replacement
- only edit host internals when a missing seam or host defect is proven by code and packet evidence

## 1. Subsystem map

| Subsystem | What it owns | Main evidence anchors | Default modification read |
| --- | --- | --- | --- |
| Runtime core | turn execution order, model-visible context, compaction, maintenance, retry/recovery | `src/agents/pi-embedded-runner/run.ts`, `src/agents/pi-embedded-runner/run/attempt.ts`, `src/agents/pi-embedded-runner/run/attempt.context-engine-helpers.ts`, `src/agents/pi-embedded-runner/compact.ts` | Host kernel. Wrap through the `context-engine` slot before touching runner internals. |
| Plugin / hook / slot host | plugin discovery, manifest loading, slot ownership, hook registration, tool registration | `src/plugins/discovery.ts`, `src/plugins/loader.ts`, `src/plugins/registry.ts`, `src/plugins/api-builder.ts`, `src/plugins/hooks.ts` | Main extension shell. Use it heavily, but do not rewrite loader or registry rules casually. |
| Session / channel / gateway identity | canonical session identity, thread binding, conversation binding, route policy | `src/routing/resolve-route.ts`, `src/routing/session-key.ts`, `src/sessions/session-key-utils.ts`, `src/channels/conversation-binding-context.ts`, `src/channels/thread-bindings-policy.ts` | Host-owned identity layer. Consume host outputs; do not invent a parallel session model. |
| Memory / recall substrate | memory prompt section, memory tools, backend selection, sync/freshness, durable writeback | `src/plugins/memory-state.ts`, `src/plugins/memory-runtime.ts`, `extensions/memory-core/index.ts`, `extensions/memory-core/src/memory/search-manager.ts`, `extensions/memory-core/src/memory/manager.ts` | Pluggable stack with strong host APIs. Extend presentation and sidecars before fighting indexer internals. |
| MCP / tool integration fabric | tool registration, pre-call shaping, policy, MCP exposure, transcript persistence | `src/plugins/tools.ts`, `src/agents/pi-tools.before-tool-call.ts`, `src/agents/session-tool-result-guard.ts`, `src/security/dangerous-tools.ts`, `src/mcp/plugin-tools-serve.ts` | Strong wrap surface. Shape tools at registration, pre-call, and persistence layers instead of owning execution core. |
| Capability stack | media, link/media understanding, image generation, speech, web search provider loading | `src/plugins/capability-provider-runtime.ts`, `src/media-understanding/apply.ts`, `src/link-understanding/apply.ts`, `src/web-search/runtime.ts` | Mostly compatibility territory. Keep it stable; revisit `web-search` first if a future variant needs research workflows. |
| Config / security / ops | config loading, validation, plugin enablement, policy, env hardening | `src/config/io.ts`, `src/config/validation.ts`, `src/config/types.plugins.ts`, `src/infra/host-env-security.ts`, `src/security/dangerous-config-flags.ts` | Use config and policy surfaces, not bypasses. Host safety rules are real boundaries. |
| Gateway / daemon / packaging | bind/auth exposure, HTTP and WS control plane, service wrappers, deployment env | `src/gateway/server-runtime-state.ts`, `src/gateway/server-http.ts`, `src/gateway/net.ts`, `src/daemon/service.ts`, `src/daemon/service-env.ts` | Productization and deployment shell. Wrap launch and env behavior before editing gateway core. |

Working architecture read:

- OpenClaw is a host platform, not just a runner.
- The real specialization kernel is `context-engine + hooks + plugin package + plugin-local sidecars`.
- Most future custom Claws should keep that kernel thin and let host identity, policy, packaging, and capability infrastructure remain host-owned.

## 2. Safe seams to wrap/extend

### Runtime and prompt shaping

- `src/plugins/api-builder.ts` and `src/plugins/registry.ts` expose `registerContextEngine(...)` as the formal runtime seam.
- `src/agents/pi-embedded-runner/run/attempt.context-engine-helpers.ts` shows the active engine participates in bootstrap, `assemble(...)`, and `afterTurn(...)`.
- `src/agents/pi-embedded-runner/context-engine-maintenance.ts` injects `rewriteTranscriptEntries(...)` into `maintain(...)`, which is the safe transcript-rewrite contract.

Recommended use:

- own the `context-engine` slot for specialization logic
- use `assemble()` for model-visible state projection
- use `afterTurn()` and `maintain()` for sidecar persistence and bounded transcript hygiene
- leave `ownsCompaction` false until there is a proven need to own post-compaction obligations

### Plugin hooks

- `src/plugins/hooks.ts` provides high-value modifying hooks: `before_tool_call`, `tool_result_persist`, and `before_message_write`.
- The same file keeps `tool_result_persist` and `before_message_write` synchronous, which makes them suitable for deterministic shaping on the persistence hot path.

Recommended use:

- use hooks for bounded shaping around existing host flow
- keep hook logic cheap and deterministic
- prefer hook-side sidecars over runner edits when the goal is persistence, redaction, preview shaping, or metadata capture

### Session and channel alignment

- `src/channels/conversation-binding-context.ts` is the safest identity-alignment seam for provider-aware conversation and thread behavior.
- `src/channels/registry.ts` is the correct source for normalized channel identity.
- `src/gateway/session-utils.ts` and `src/gateway/server-chat.ts` are suitable wrap points for continuity diagnostics and operator tooling.

Recommended use:

- partition variant state by host-resolved `sessionKey` and `mainSessionKey`
- consume normalized channel identity instead of custom string rules
- put observability around gateway/session surfaces, not into route core

### Memory extension

- `src/plugins/api-builder.ts` exposes `registerMemoryPromptSection`, `registerMemoryFlushPlan`, `registerMemoryRuntime`, and memory embedding registration as optional seams.
- `extensions/memory-core/index.ts` and `extensions/memory-lancedb/index.ts` prove memory can be delivered as ordinary plugins.

Recommended use:

- extend prompt-visible memory guidance at the plugin layer
- add durable-memory sidecars before taking memory-slot ownership
- reuse tool-mediated recall and targeted reindex flows instead of replacing the builtin memory stack first

### Tool shaping and external content

- `src/plugins/tools.ts` is the safe tool exposure seam.
- `src/agents/pi-tools.before-tool-call.ts` is the safe pre-execution shaping seam.
- `src/agents/session-tool-result-guard.ts` plus `src/plugins/hooks.ts` is the safe persistence-shaping seam.
- `src/security/external-content.ts` is the safe wrapper for untrusted tool or web output before prompt insertion.

Recommended use:

- keep registration, execution, policy, and persistence as separate concerns
- build read-only helper tools as normal plugin tools when needed
- shape large or synthetic tool output at persistence time, not by editing the executor

### Config and packaging surfaces

- `src/config/types.plugins.ts` and `src/config/validation.ts` already support plugin entry config and slot selection.
- `src/config/types.gateway.ts`, `src/gateway/net.ts`, and `src/daemon/service-env.ts` provide the safe knobs for bind mode, auth posture, and service environment.

Recommended use:

- ship defaults through plugin config schema and slot config
- productize through env, bind, and service-wrapper settings before changing gateway or daemon core

## 3. High-risk host-owned internals

| Area | High-risk files | Why they are host-owned |
| --- | --- | --- |
| Embedded runner kernel | `src/agents/pi-embedded-runner/run.ts`, `src/agents/pi-embedded-runner/run/attempt.ts`, `src/agents/pi-embedded-runner/compact.ts` | They own retry loops, prompt layering order, compaction recovery, and turn mutation order. |
| Plugin loader and slot core | `src/plugins/loader.ts`, `src/plugins/discovery.ts`, `src/plugins/registry.ts`, `src/plugins/slots.ts` | They define discovery precedence, slot exclusivity, duplicate protection, and registry normalization for the whole host. |
| Route and session identity grammar | `src/routing/resolve-route.ts`, `src/routing/session-key.ts`, `src/sessions/session-key-utils.ts`, `src/sessions/session-id-resolution.ts` | They define canonical identity and ambiguity policy across channels and stores. |
| Builtin memory managers | `extensions/memory-core/src/memory/search-manager.ts`, `extensions/memory-core/src/memory/manager.ts`, `extensions/memory-core/src/memory/qmd-manager.ts` | They own backend choice, sync, cache, readonly recovery, and durable store behavior. |
| Tool policy and deny rules | `src/agents/tool-policy.ts`, `src/agents/tool-policy-pipeline.ts`, `src/agents/sandbox/tool-policy.ts`, `src/security/dangerous-tools.ts` | They decide what the host can execute and what the gateway will refuse. |
| Gateway bridge and control plane core | `src/mcp/channel-bridge.ts`, `src/gateway/server-runtime-state.ts`, `src/gateway/server-http.ts`, `src/gateway/server/http-listen.ts` | They own remote exposure, auth boundaries, transport multiplexing, and bind behavior. |
| Service manager implementations | `src/daemon/service.ts`, `src/daemon/launchd.ts`, `src/daemon/systemd.ts`, `src/daemon/schtasks.ts` | They are platform-specific operational infrastructure, not specialization logic. |
| Capability preprocessing internals | `src/media-understanding/apply.ts`, `src/link-understanding/apply.ts`, provider registries under `src/media-understanding`, `src/image-generation`, `src/tts` | They rewrite inbound context and manage multimodal providers under host policy. |
| Config and env security core | `src/config/io.ts`, `src/config/validation.ts`, `src/infra/host-env-security.ts` | They enforce include bounds, schema safety, workspace/path rules, and environment hardening. |

Do not edit these first just because they are central.
Edit them only when a packet-backed missing seam or real host defect is established.

## 4. When to prefer plugin/context-engine/hooks over internal edits

Use this decision rule set:

| Goal | First choice | Why | Internal edit threshold |
| --- | --- | --- | --- |
| Change what the model sees each turn | `context-engine assemble()` | It is the formal model-visible projection seam. | Only edit runner prompt order if the context-engine contract cannot express the needed projection. |
| Persist or clean session-local specialization state | `afterTurn()` or `maintain()` | These are lifecycle seams already wired into runtime flow. | Only edit runner finalization order if maintenance timing is provably wrong and unfixable by hooks. |
| Rewrite assistant planning chatter or tool-result previews | `before_message_write` and `tool_result_persist` | Persistence shaping is already separated from execution. | Only edit session append internals if the hook contract cannot preserve needed metadata. |
| Shape tool calls or add read-only helper tools | `before_tool_call` plus normal plugin tool registration | Registration and pre-call shaping are explicit host seams. | Only edit executor or policy core if the current hook/policy surfaces cannot represent the needed allow/deny or rewrite logic. |
| Align continuity with provider conversation/thread behavior | `conversation-binding-context.ts` and channel registry consumption | Host already resolves binding and normalized channel identity. | Only edit routing/session grammar if host identity is wrong, not merely inconvenient. |
| Add durable memory behavior | plugin-local sidecars plus memory prompt/tool seams | Host already separates presentation, recall, sync, and writeback. | Only edit builtin managers if a required storage or indexing behavior cannot be implemented as a plugin or adapter. |
| Ship a specialized variant | plugin package, plugin config, gateway/service wrappers | This preserves host upgradeability and deployment reuse. | Only edit gateway or daemon core if the product requires a new control-plane behavior that wrappers cannot deliver. |

Practical test:

- If the feature can stay optional, selectable by slot/config, or plugin-scoped, it should almost certainly remain outside host internals.
- If the feature needs host-wide semantic change across all agents, channels, or transport surfaces, that is the point where host edits may become legitimate.

## 5. Productization-later surfaces

These surfaces matter for future specialized Claw products, but they should not drive SNC v1 internals:

- gateway bind/auth posture in `src/config/types.gateway.ts` and `src/gateway/net.ts`
- service environment and install wrappers in `src/daemon/service-env.ts` and `src/daemon/service.ts`
- deployment manifests such as `Dockerfile`, `docker-compose.yml`, `fly.toml`, and `render.yaml`
- gateway/session observability and operator tooling surfaces in `src/gateway/session-utils.ts` and `src/gateway/server-chat.ts`
- MCP exposure and channel bridge layers in `src/mcp/plugin-tools-serve.ts`, `src/mcp/channel-server.ts`, and `src/mcp/channel-tools.ts`
- capability-provider families, especially `web-search`, if a later variant becomes research-first rather than writing-first

Productization doctrine:

- specialize the runtime first
- stabilize hook and sidecar behavior second
- package and expose the variant third

That ordering preserves host upgradeability and avoids turning deployment needs into premature kernel rewrites.

## 6. SNC relevance

SNC remains well aligned with the host if it stays inside this shape:

- one native plugin package
- owns the `context-engine` slot
- uses `assemble()`, `afterTurn()`, and `maintain()` as its main runtime seams
- uses hooks for bounded tool/transcript shaping
- consumes host-resolved session identity after routing and binding
- keeps `ownsCompaction` false while compaction remains host-delegated
- treats durable memory as a plugin-side projection and sidecar problem before any host memory takeover

Why this matters:

- it keeps SNC hot-pluggable
- it preserves OpenClaw as the host platform
- it keeps future specialized Claw variants on the same architectural playbook instead of forking the runner early

## 7. Modification guidance by subsystem

### Runtime core

- Default move: own the `context-engine` slot and keep variant logic in `assemble()`, `afterTurn()`, `maintain()`, and delegated `compact()`.
- Wrap preferred: `src/context-engine/*`, `src/agents/pi-embedded-runner/run/attempt.context-engine-helpers.ts`, `src/agents/pi-embedded-runner/context-engine-maintenance.ts`.
- Do not touch first: `src/agents/pi-embedded-runner/run.ts`, `src/agents/pi-embedded-runner/run/attempt.ts`, `src/agents/pi-embedded-runner/compact.ts`.
- Rule: only take compaction ownership after proving the host compaction contract blocks the variant.

### Plugin / hook / manifest host

- Default move: ship a normal plugin package with `openclaw.plugin.json`, `definePluginEntry(...)`, and API registration.
- Wrap preferred: `registerContextEngine`, `registerHook`, `registerTool`, memory registration APIs, plugin config schema.
- Do not touch first: loader, discovery, slot exclusivity, and registry duplicate/conflict rules.
- Rule: if a capability can be expressed as plugin registration, it does not justify host manifest or loader surgery.

### Session / channel / gateway identity

- Default move: trust host `sessionKey`, `mainSessionKey`, `conversationId`, and `parentConversationId`.
- Wrap preferred: `src/channels/conversation-binding-context.ts`, `src/channels/registry.ts`, `src/gateway/session-utils.ts`, `src/gateway/server-chat.ts`.
- Do not touch first: `src/routing/resolve-route.ts`, `src/routing/session-key.ts`, `src/sessions/session-id-resolution.ts`.
- Rule: never create a second continuity identity model unless host identity is demonstrably wrong.

### Memory / recall substrate

- Default move: project only the memory cues the variant needs, and keep harvest/store/recall as plugin-local or plugin-registered behavior.
- Wrap preferred: memory prompt section registration, memory runtime registration, append-only flush planning, post-compaction targeted sync.
- Do not touch first: builtin/QMD manager internals, cache semantics, readonly recovery, backend routing.
- Rule: extend memory as layered presentation plus sidecars before rewriting indexers.

### MCP / tool / external integration fabric

- Default move: shape at registration, `before_tool_call`, `tool_result_persist`, and `before_message_write`.
- Wrap preferred: `src/plugins/tools.ts`, `src/agents/pi-tools.before-tool-call.ts`, `src/agents/session-tool-result-guard.ts`, `src/security/external-content.ts`.
- Do not touch first: dangerous-tool denylist, tool-policy pipeline, gateway approval core, channel bridge transport internals.
- Rule: do not widen MCP or HTTP tool exposure just to support SNC helper behavior.

### Capability stack

- Default move: treat it as compatibility-later and consume public runtime facades if needed.
- Wrap preferred: provider registration and runtime facade usage, especially around `web-search`.
- Do not touch first: media/link apply-time rewriting, provider registries, raw media hosting/boundary code.
- Rule: writing-first variants should ignore most of this stack until a concrete capability requirement appears.

### Config / security / ops

- Default move: expose variant behavior through plugin config schema, slot config, allowlists, and documented env.
- Wrap preferred: `plugins.entries.*.config`, `plugins.slots.*`, plugin auto-enable where appropriate, service-env wrappers.
- Do not touch first: config I/O, validation, host env hardening, dangerous-flag policy, DM/group policy.
- Rule: if a change requires bypassing validation or security guards, the design is probably wrong.

### Gateway / daemon / packaging

- Default move: reuse the host gateway and service wrappers, then specialize bind, auth, env, and deployment manifests.
- Wrap preferred: `openclaw.mjs`, `scripts/run-node.mjs`, `src/gateway/boot.ts`, `src/daemon/service-env.ts`, packaging manifests.
- Do not touch first: `src/gateway/server-runtime-state.ts`, `src/gateway/server-http.ts`, `src/daemon/service.ts`, platform-specific service managers.
- Rule: broaden network exposure only as an explicit productization step paired with auth and bind-policy review.

## Bottom line

OpenClaw is modifiable, but its safest pattern is not "rewrite the host."
Its safest pattern is:

- consume host identity
- own specialization through plugin slots and hooks
- keep state and shaping sidecars plugin-local
- defer host-internal edits until a real missing seam is proven

That is the right doctrine for SNC now and for future specialized Claw variants later.
