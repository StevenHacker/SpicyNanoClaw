# OC-08 MCP / Tool / External Integration Fabric

## Scope Note

This memo uses only the OpenClaw external snapshot at `data/external/openclaw-v2026.4.1`.

It does not rely on the local Python gateway, `app/*`, or `scripts/*`.

The four layers below are treated as distinct:

- tool registration
- tool execution
- tool policy
- tool-result persistence

## 1. MCP / Tool Fabric Map

| Layer | Evidence in snapshot | What it does | SNC read |
| --- | --- | --- | --- |
| Discovery and packaging | `src/plugins/discovery.ts`, `src/plugins/manifest.ts`, `src/plugins/manifest-registry.ts`, `src/plugins/bundle-mcp.ts`, `extensions/*/package.json`, `extensions/*/openclaw.plugin.json` | Finds plugin candidates from package metadata and manifests, resolves `openclaw.extensions`, and can load bundled `mcpServers` config from package or bundle manifests | Host discovery is manifest-driven, not ad hoc. This is a safe seam because external integration is declared before runtime execution. |
| Tool registration | `src/plugins/api-builder.ts`, `src/plugins/registry.ts`, `src/plugins/tools.ts`, `src/plugins/types.ts`, `extensions/*/index.ts` | Captures tool factories in the plugin registry, tags them with plugin metadata, enforces name conflicts, and gates exclusive slots like `contextEngine` and memory hooks | Registration is hot-pluggable. The host decides ownership and slot eligibility here, before any tool is executed. |
| MCP exposure | `src/mcp/plugin-tools-serve.ts`, `src/mcp/channel-server.ts`, `src/mcp/channel-tools.ts`, `src/mcp/channel-bridge.ts` | Exposes plugin tools over standalone MCP, and exposes channel/session operations over a gateway-backed MCP bridge | This is the network-facing surface. It is a thin shell over registered tools and bridge methods. |
| Tool execution | `src/agents/pi-tools.before-tool-call.ts`, `src/agents/pi-embedded-subscribe.handlers.tools.ts`, `src/mcp/plugin-tools-serve.ts` | Runs pre-tool policy and approval logic, then invokes `AnyAgentTool.execute`, then emits tool lifecycle events and post-call hooks | Execution is separate from registration. The clean override point is the pre-call wrapper, not the registry itself. |
| Tool policy | `src/agents/tool-policy.ts`, `src/agents/tool-policy-pipeline.ts`, `src/agents/sandbox/tool-policy.ts`, `src/security/dangerous-tools.ts`, `src/agents/pi-tools.before-tool-call.ts` | Combines allowlists, denylists, tool groups, sandbox policy, default HTTP tool denial, and gateway approval escalation | Policy is layered and stateful. It is not a single toggle. |
| Tool-result persistence | `src/agents/session-tool-result-guard.ts`, `src/plugins/hooks.ts`, `src/security/external-content.ts` | Patches session appends, caps oversized tool results, normalizes tool names, emits transcript updates, and applies synchronous `tool_result_persist` and `before_message_write` hooks | Persistence is a transcript-shaping layer, not the same thing as tool execution. |

The most important registration evidence is in `src/plugins/registry.ts`: `registerTool` stores tool factories, `registerHook` stores hook registrations, `registerGatewayMethod` stores gateway methods, and `registerContextEngine` owns the exclusive context-engine slot. Memory-specific registration is also slot-gated there.

The most important execution evidence is in `src/mcp/plugin-tools-serve.ts`, which resolves plugin tools and then calls `tool.execute("mcp-<timestamp>", args)`, and in `src/agents/pi-tools.before-tool-call.ts`, which wraps execution with policy and approval checks before the tool body runs.

## 2. External Integration Lifecycle Note

1. A plugin or bundle is discovered from package metadata, `openclaw.plugin.json`, and/or bundle manifest data.
2. The plugin entry module exports `definePluginEntry(...)` or a provider variant and calls `register(...)`.
3. `register(api)` populates the registry with tools, hooks, gateway methods, channels, services, CLI backends, provider integrations, and memory-slot handlers.
4. Tool exposure happens either through `src/mcp/plugin-tools-serve.ts` for plugin tools or through `src/mcp/channel-server.ts` for gateway-backed channel/session tools.
5. Before execution, `src/agents/pi-tools.before-tool-call.ts` can block, rewrite, or approve a call. It can also ask the gateway for plugin approval when the hook result requires it.
6. Tool runtime events are then emitted in `src/agents/pi-embedded-subscribe.handlers.tools.ts`, which tracks start/end, output, media, and `after_tool_call`.
7. The persistence path is separate again: `src/agents/session-tool-result-guard.ts` wraps transcript writes, applies `before_message_write`, applies `tool_result_persist`, truncates oversized results, and emits session transcript updates.

Concrete bundled examples show the lifecycle in use:

- `extensions/xai/index.ts` registers a web-search provider plus `code_execution` and `x_search` tools.
- `extensions/memory-core/index.ts` registers memory prompt, flush-plan, runtime, and the `memory_search` / `memory_get` tools.
- `extensions/memory-lancedb/index.ts` registers `memory_recall`, `memory_store`, and `memory_forget`, plus lifecycle hooks for auto-recall and auto-capture.
- `extensions/browser/index.ts` registers a browser tool, a CLI surface, a gateway method, and a service.
- `extensions/tavily/index.ts` and `extensions/firecrawl/index.ts` register web-search providers plus search/extract or scrape tools.

The channel MCP bridge is also lifecycle-heavy: `src/mcp/channel-bridge.ts` starts a gateway client with read/write/approval scopes, subscribes to sessions after the hello handshake, tracks queued events, and proxies session listing, history, sending, and approval resolution.

## 3. Safe Shaping / Control Seams

- `src/plugins/tools.ts` is the safest place to shape plugin tool exposure. It resolves tools lazily, filters optional tools through allowlists, blocks core-name conflicts, and preserves plugin metadata in a `WeakMap`.
- `src/agents/pi-tools.before-tool-call.ts` is the safest pre-execution seam. It can rewrite parameters, block calls, and request gateway approval before a tool runs.
- `src/plugins/hooks.ts` gives two high-value synchronous shaping hooks: `tool_result_persist` and `before_message_write`.
- `src/agents/session-tool-result-guard.ts` is a strong persistence seam. It can cap tool-result size, normalize tool names, synthesize missing tool results, and emit transcript updates without touching the registry.
- `src/security/external-content.ts` is the right wrapper for untrusted tool output or web content before prompt insertion. It adds boundary markers and explicit injection warnings.
- `src/mcp/channel-tools.ts` keeps MCP-facing schemas and bridge calls separate from gateway internals, which makes it a good place to extend exposure without rewriting the bridge.
- `extensions/*/index.ts` remains hot-pluggable by design. The extension entry owns registration behavior, but the host still owns whether the tool can exist at all.

## 4. Dangerous Internals

- `src/security/dangerous-tools.ts` hard-denies Gateway HTTP `POST /tools/invoke` for `exec`, `spawn`, `shell`, `fs_write`, `fs_delete`, `fs_move`, `apply_patch`, `sessions_spawn`, `sessions_send`, `cron`, `gateway`, `nodes`, and `whatsapp_login`.
- `src/agents/tool-policy.ts` and `src/agents/sandbox/tool-policy.ts` are capability gates, not just UI filters. A policy drift here changes what the host can execute.
- `src/agents/pi-tools.before-tool-call.ts` can elevate a tool into gateway approval flow and can rewrite arguments before execution. That is powerful and easy to misuse.
- `extensions/xai/code-execution.ts` exposes remote xAI sandbox code execution with user-supplied tasks and API-key gating. It is intentionally dangerous by design and should stay tightly controlled.
- `extensions/browser/index.ts` registers `browser.request` with `operator.write` scope. That is a control-plane seam, not a harmless local helper.
- `extensions/memory-lancedb/index.ts` persists durable memory and can auto-recall and auto-capture through lifecycle hooks. Once enabled, it creates long-lived host state outside the current turn.
- `src/agents/session-tool-result-guard.ts` can synthesize missing tool results and mutate what gets appended to the transcript. That is a persistence-power seam, not a display-only helper.
- `src/plugins/registry.ts` owns exclusive slot registration and duplicate protection. Changing those rules is host-shape surgery.

## 5. SNC Relevance

The strongest SNC takeaway is that OpenClaw already separates the pieces SNC needs most.

- Registration is declarative and hot-pluggable.
- Execution is wrapped and can be intercepted before the tool body runs.
- Policy is layered across config, sandbox policy, and gateway denial.
- Persistence is a transcript guard plus synchronous hooks, not a hidden side effect of tool execution.

That means SNC should prefer shaping at `before_tool_call`, `tool_result_persist`, and `before_message_write` rather than trying to own the tool executor itself.

The memory and web-search plugins are also useful donor examples, but only as external integration patterns. For SNC, the safe lesson is structural: keep tool acquisition, tool execution, and transcript shaping separate, and keep high-risk tools behind the existing policy and approval machinery.

## 6. Modification Guidance

- Hot-pluggable seam: `src/plugins/tools.ts`, `src/mcp/plugin-tools-serve.ts`, `src/mcp/channel-tools.ts`, `src/agents/pi-tools.before-tool-call.ts`, `src/agents/session-tool-result-guard.ts`, `src/security/external-content.ts`.
- Wrap preferred: `extensions/xai/index.ts`, `extensions/xai/code-execution.ts`, `extensions/memory-core/index.ts`, `extensions/memory-lancedb/index.ts`, `extensions/browser/index.ts`, `extensions/tavily/index.ts`, `extensions/firecrawl/index.ts`.
- Host-owned seam: `src/plugins/registry.ts`, `src/security/dangerous-tools.ts`, `src/agents/tool-policy-pipeline.ts`, `src/agents/sandbox/tool-policy.ts`.
- Internal edit only if proven necessary: `src/plugins/registry.ts` slot ownership rules, `src/mcp/channel-bridge.ts` gateway/session bridging, `src/agents/pi-tools.before-tool-call.ts` approval behavior.
- Out of SNC v1 scope: widening the MCP surface, relaxing the HTTP denylist, or folding persistence into tool execution.

## 7. Still-Unverified Questions

1. Which bundled extensions are enabled by default in a normal install versus merely present in the snapshot.
2. Whether any shipped package actually uses `mcpServers` at runtime, or whether `src/plugins/bundle-mcp.ts` is currently latent support.
3. Whether any plugin in this snapshot consumes `tool_result_persist` today, beyond the session-guard wiring that makes it available.
4. Whether any additional transport or permission layers outside this snapshot further constrain tool exposure or transcript persistence.
5. Whether there are more tool-bearing bundled extensions beyond the sampled `xai`, `memory-core`, `memory-lancedb`, `browser`, `tavily`, and `firecrawl` examples.
