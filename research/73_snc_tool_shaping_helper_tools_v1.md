# SNC-13 Tool Shaping / Helper Tools V1 Design Packet

## What This Problem / Subsystem Is

This packet defines how far SNC should go on tool shaping and helper-tool design in v1 without drifting into host-runtime ownership.

The important structural read is that OpenClaw does **not** have one generic "tool layer."
It has separate seams for:

- pre-execution tool gating and parameter rewrite
- tool-result persistence shaping
- external-content trust wrapping
- tool registration and MCP exposure
- dangerous-tool policy

That separation matters because SNC already has landed hook shaping in the persistence lane.
The next decision is not "should SNC do more tool work?"
The next decision is which of those lanes SNC may safely own, which it should only wrap, and which must remain host-owned.

This packet is design-grade because accepted host and donor evidence now exists:

- OpenClaw tool/MCP fabric deconstruction in `research/56_oc08_mcp_tool_integration_fabric.md`
- CC tool exposure and deterministic tool-result donor patterns in `research/51_cc02_harness_pressure_tool_exposure.md`
- landed SNC hook shaping in `research/66_snc_hook_shaping_integration.md`
- accepted SNC utility layer in `research/64_snc_transcript_shaping_utility.md`

## Main Entry Files

### OpenClaw host evidence

- `data/external/openclaw-v2026.4.1/src/agents/pi-tools.before-tool-call.ts`
- `data/external/openclaw-v2026.4.1/src/agents/session-tool-result-guard.ts`
- `data/external/openclaw-v2026.4.1/src/plugins/types.ts`
- `data/external/openclaw-v2026.4.1/src/plugins/registry.ts`
- `data/external/openclaw-v2026.4.1/src/plugins/tools.ts`
- `data/external/openclaw-v2026.4.1/src/mcp/plugin-tools-serve.ts`
- `data/external/openclaw-v2026.4.1/src/mcp/channel-tools.ts`
- `data/external/openclaw-v2026.4.1/src/security/external-content.ts`
- `data/external/openclaw-v2026.4.1/src/security/dangerous-tools.ts`
- `data/external/openclaw-v2026.4.1/src/agents/tools/web-fetch.ts`
- `data/external/openclaw-v2026.4.1/extensions/browser/src/browser-tool.actions.ts`

### CC donor evidence

- `data/external/claude-code-leeyeel-4b9d30f/src/tools/ToolSearchTool/ToolSearchTool.ts`
- `data/external/claude-code-leeyeel-4b9d30f/src/tools/ToolSearchTool/prompt.ts`
- `data/external/claude-code-leeyeel-4b9d30f/src/utils/toolResultStorage.ts`
- `data/external/claude-code-leeyeel-4b9d30f/src/services/api/claude.ts`

### Current SNC host-fit evidence

- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/src/hook-scaffold.ts`
- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/src/transcript-shaping.ts`
- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/src/replacement-ledger.ts`
- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/src/engine.ts`
- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/src/config.ts`

## Verified Structure / Mechanism

## 1. Host lane map

| Lane | Verified host evidence | What the lane actually owns | SNC v1 read |
| --- | --- | --- | --- |
| `before_tool_call` | `src/plugins/types.ts`, `src/agents/pi-tools.before-tool-call.ts` | Per-call param rewrite, block, or approval request before `tool.execute(...)` runs; loop detection also lives here | This is the correct pre-execution seam. SNC may use it for narrow helper-tool guardrails, but should not treat it as a license to rewrite host policy or own the executor. |
| `tool_result_persist` | `src/plugins/types.ts`, `src/agents/session-tool-result-guard.ts` | Synchronous shaping of tool-result messages before transcript persistence, after normalization and hard size cap | This is the primary SNC tool-output shaping seam. It is transcript hygiene, not capability control and not durable memory. |
| `before_message_write` | `src/plugins/types.ts`, `src/agents/session-tool-result-guard.ts` | Last synchronous message mutation/block point before JSONL persistence | This remains the broader message-shaping seam. It should complement tool-result shaping rather than absorb raw tool-policy concerns. |
| External-content wrapping | `src/security/external-content.ts`, `src/agents/tools/web-fetch.ts`, `extensions/browser/src/browser-tool.actions.ts` | Marks untrusted browser/web/channel payloads with provenance, warning text, and spoof-resistant boundaries before the model sees them | This is a trust boundary, not a style layer. SNC must preserve it when shaping tool results. |
| Tool registration / exposure | `src/plugins/registry.ts`, `src/plugins/tools.ts`, `src/mcp/plugin-tools-serve.ts`, `src/mcp/channel-tools.ts` | Plugin tool registration, name conflict gating, optional-tool filtering, MCP serving, gateway/channel MCP bridge | SNC helper tools should live here as ordinary plugin tools first. MCP is a second exposure layer, not the first design move. |
| Dangerous-tool policy | `src/security/dangerous-tools.ts`, plus the policy/pipeline read summarized in `research/56_oc08_mcp_tool_integration_fabric.md` | Hard-deny of high-risk tools on gateway HTTP, plus layered policy/approval ownership | This lane is host-owned. SNC may narrow or add caution, but must not relax it in v1. |

## 2. `before_tool_call` is a pre-execution control seam, not a persistence seam

`src/plugins/types.ts` proves the contract shape:

- `params?: Record<string, unknown>`
- `block?: boolean`
- `blockReason?: string`
- `requireApproval?: { ... }`

`src/agents/pi-tools.before-tool-call.ts` then proves the runtime order:

1. normalize tool name and params
2. run loop detection
3. call the hook runner
4. optionally block
5. optionally request gateway approval
6. optionally merge adjusted params
7. only then execute `tool.execute(...)`

This means SNC should read `before_tool_call` as:

- good for narrow canonicalization or refusal
- good for SNC-owned helper-tool approval tightening
- not the place to mutate transcript payloads
- not the place to bypass dangerous-tool policy

## 3. `tool_result_persist` is a transcript seam after execution, not a trust seam

`src/agents/session-tool-result-guard.ts` shows the persistence order for tool results:

1. normalize tool name
2. hard-cap tool result size through `truncateToolResultMessage(...)`
3. apply the optional tool-result transformer
4. run `before_message_write`
5. append to the session transcript

It also proves the host may synthesize missing tool results for strict providers before persistence.

That makes the design boundary explicit:

- `tool_result_persist` is where SNC can make tool results smaller and more stable
- the host already performs a hard safety cap before SNC sees the persisted payload
- synthetic tool results are part of the host contract and should be handled explicitly
- this seam is about long-lived transcript shape, not about deciding whether a tool was safe to call

This matches the already-landed SNC hook layer:

- `extensions/snc/src/hook-scaffold.ts` uses `tool_result_persist` for bounded previews
- `extensions/snc/src/replacement-ledger.ts` freezes replacement fate per session

## 4. External-content wrapping is a separate security layer that already exists in the host

`src/security/external-content.ts` proves OpenClaw already wraps untrusted content with:

- explicit security warnings
- unique spoof-resistant boundary markers
- source metadata
- marker sanitization

`src/agents/tools/web-fetch.ts` and `extensions/browser/src/browser-tool.actions.ts` prove this is not theoretical:

- web fetch wraps extracted text before returning it
- browser tools wrap JSON/text payloads before returning them

That means SNC does **not** need a new prompt-injection wrapper architecture for helper tools.
The host already has the correct primitive.

The design implication is strict:

- any SNC helper that returns external text should reuse host wrapping
- `tool_result_persist` may shorten wrapped payloads, but should not strip the provenance model out of them
- assistant/message shaping should treat these wrappers as trust markers, not as cosmetic noise

## 5. Tool registration and MCP exposure are already decoupled

`src/plugins/registry.ts` and `src/plugins/tools.ts` prove that OpenClaw already supports:

- plugin-owned tool registration
- duplicate/name conflict protection
- optional-tool filtering
- plugin metadata retention

`src/mcp/plugin-tools-serve.ts` then proves registered plugin tools can be served as a standalone MCP tool server.
`src/mcp/channel-tools.ts` proves there is also a separate MCP bridge for gateway/channel/session operations.

This is the main host-safe helper-tool design lesson:

- helper tools do not require gateway-method ownership
- helper tools can remain ordinary plugin tools
- MCP exposure is a second-order distribution choice over already-registered tools

The host shape therefore supports this safe sequence:

1. ordinary SNC plugin tool
2. optional MCP serving of that same tool if later needed
3. gateway methods only if a real control-plane need appears

## 6. CC donor value is principle-level, not protocol-level

`src/utils/toolResultStorage.ts` proves CC persists large tool results to file and freezes their later representation.
`src/tools/ToolSearchTool/*` plus `src/services/api/claude.ts` prove CC defers many tool schemas behind ToolSearch and only expands them after discovery.

What is donor-worthy:

- deterministic replacement decisions across turns
- deferring tool-surface noise when the tool pool becomes large

What is not donor-worthy as-is:

- the exact `tool_reference` transport model
- provider-specific beta-header machinery
- Anthropic-specific tool-search protocol expectations

This matches the current migration read in `research/51_cc02_harness_pressure_tool_exposure.md`:

- deterministic tool-result shaping is worth carrying now
- ToolSearch-style deferred schema exposure is a later policy option, not a v1 requirement

## V1 Design

## 1. Tool-shaping policy map

| Lane | SNC should do in v1 | SNC should not do in v1 |
| --- | --- | --- |
| `before_tool_call` | Normalize parameters for SNC-owned helper tools, reject malformed helper-tool calls, and optionally request stricter approval for SNC-owned risky helper variants | Rewrite host core-tool semantics, bypass host deny/approval policy, or build a second tool-policy system |
| `tool_result_persist` | Keep using deterministic bounded previews for noisy or synthetic tool results, with frozen per-session replacement fate | Turn transcript shaping into durable storage, strip security provenance, or reclassify tool safety after the fact |
| `before_message_write` | Keep assistant/meta transcript shaping here, and reserve it for message-level hygiene | Use it as a substitute for raw external-content wrapping or helper-tool discovery |
| External-content wrapping | Reuse host wrappers for any helper returning untrusted external text | Invent a parallel SNC wrapper format or remove host markers during persistence shaping |
| Tool registration / helper tools | Register small SNC-owned helper tools as ordinary plugin tools, preferably read-only and artifact-projection-oriented | Start with gateway methods, cross-session orchestration tools, or helper tools that duplicate host dangerous capabilities |
| MCP exposure | Treat MCP as an optional second exposure layer for SNC-owned helper tools | Make MCP exposure the default requirement for SNC helper tools before the helper-tool surface is even stable |
| Dangerous-tool policy | Respect host denylist and approval pipeline; only narrow further if SNC needs to be more conservative | Relax `DEFAULT_GATEWAY_HTTP_TOOL_DENY`, weaken approval, or make SNC helper tools a bypass around core host restrictions |

## 2. Recommended helper-tool lane for SNC v1

The strongest host-fit read is that SNC helper tools, if added, should be **read-only projection tools over SNC-owned artifacts**, not new capability tools.

Why this is evidence-backed:

- current SNC already owns `briefFile`, `ledgerFile`, `packetFiles`, `packetDir`, and `stateDir` in `extensions/snc/src/config.ts`
- current SNC already projects those artifacts and a `Session snapshot` into prompt assembly in `extensions/snc/src/engine.ts`
- OpenClaw already has broad host capability tools, plus a dangerous-tool policy layer, so SNC does not need to create a parallel generic capability stack

That leads to a bounded helper-tool family:

### Helper-tool class A: SNC artifact lookup

Good fit:

- return bounded excerpts from SNC-owned brief / ledger / packet files
- support explicit on-demand retrieval instead of always stuffing every artifact into the prompt

Why it helps SNC:

- reduces prompt bloat
- stays within SNC-owned data
- aligns with CC's donor principle of deferred capability/context exposure without copying ToolSearch literally

### Helper-tool class B: SNC session-state projection

Good fit:

- return bounded projections of persisted SNC session-state / continuity anchors
- expose the same owned state that SNC already uses to guide compaction and continuity

Why it helps SNC:

- gives the model an explicit read path for SNC-owned local truth
- keeps session continuity inside SNC rather than turning host memory into a prerequisite

### Helper-tool classes to defer

- durable-memory recall helpers
- cross-session orchestration helpers
- helper tools that mutate external systems
- general shell/fs/network helpers under SNC branding

Those either belong to the host capability stack, to the future durable-memory packet, or to a later orchestration packet.

## 3. Recommended MCP lane for SNC v1

SNC should treat MCP as an **optional distribution surface** for its helper tools, not as the primary design center.

Recommended order:

1. keep helper tools as ordinary plugin tools
2. validate their utility inside the host runtime first
3. only then consider MCP exposure through existing plugin-tool MCP surfaces

Best current MCP read:

- if SNC needs external-agent access later, prefer exposure through `src/mcp/plugin-tools-serve.ts` or the ACPx plugin-tools bridge path already present in the repo
- do **not** start by adding new channel/gateway methods for SNC helper behavior

Reason:

- plugin tool serving is already a host-supported packaging lane
- gateway methods are control-plane power seams and should stay rare
- this keeps SNC helper tools hot-pluggable and reversible

## 4. Relationship to hook shaping

Current SNC hook shaping already owns:

- assistant/meta transcript shaping
- bounded tool-result preview shaping
- session-local replacement fate

The next tool-shaping design should therefore **complement** that landed slice rather than replace it.

Practical rule:

- `before_tool_call` decides whether/how an SNC helper tool is invoked
- `tool_result_persist` decides how noisy tool output is represented long-term
- helper tools should be small enough that they reduce pressure on hook shaping rather than create a larger cleanup problem

In other words:

- hooks stay the transcript hygiene seam
- helper tools stay the explicit capability seam
- MCP stays an optional export seam

## 5. Relationship to durable memory

Tool shaping and durable memory should remain separate layers.

Evidence base:

- `research/55_oc07_memory_recall_substrate.md` shows OpenClaw already separates prompt-visible presentation, tool-mediated recall, freshness, and durable writeback
- `research/61_cc06_memory_mode_feature_matrix.md` shows CC also separates baseline memory presentation, runtime recall attachments, and background extraction

So SNC should keep this boundary:

- tool shaping controls what becomes transcript-visible noise
- durable memory later decides what should become long-lived recall material

Design implication:

- do not use `tool_result_persist` as the durable-memory ingest path
- do not assume a shaped preview is the only durable representation worth keeping
- if durable memory later wants tool output, it should ingest from explicit SNC-owned artifacts or selected raw/normalized outputs, not from the already-collapsed transcript preview alone

That keeps tool shaping reversible and keeps durable-memory design open.

## Safe Seams

- `Hot-pluggable seam`
  - `src/agents/pi-tools.before-tool-call.ts`
  - `src/agents/session-tool-result-guard.ts`
  - `src/security/external-content.ts`
  - `src/plugins/tools.ts`
  - `src/mcp/plugin-tools-serve.ts`
  - SNC-owned plugin tools over SNC-owned artifacts

- `Wrap preferred`
  - reuse host external-content wrappers for untrusted helper-tool output
  - reuse landed SNC hook shaping for transcript reduction
  - add helper tools as plugin tools rather than gateway methods

- `Host-owned seam`
  - `src/security/dangerous-tools.ts`
  - host tool-policy pipeline summarized in `research/56_oc08_mcp_tool_integration_fabric.md`
  - `src/plugins/registry.ts` duplicate/slot rules
  - channel/gateway MCP control-plane methods

- `Internal edit only if proven necessary`
  - tool-registration conflict rules in `src/plugins/registry.ts`
  - MCP transport surfaces beyond ordinary plugin tool serving
  - core policy/approval flow in `src/agents/pi-tools.before-tool-call.ts`

- `Out of SNC v1 scope`
  - relaxing the gateway HTTP denylist
  - importing CC's exact ToolSearch protocol
  - using helper tools to duplicate dangerous host capabilities
  - coupling durable memory to transcript preview shaping
  - host-runtime executor rewrites

## No-Go Internals

These should be treated as explicit no-go zones for SNC v1:

- editing `DEFAULT_GATEWAY_HTTP_TOOL_DENY` to make SNC helper tools more powerful over HTTP
- using `before_tool_call` to bypass or silently weaken approval
- treating `tool_result_persist` as a durable-memory sidecar
- removing or flattening `wrapExternalContent(...)` boundaries for readability
- adding gateway methods when ordinary plugin tools would suffice
- copying CC's exact deferred-tool transport or provider headers

## SNC Relevance

This packet matters because SNC is now past the point where "just shape the transcript" is enough.
Hook shaping is landed.
The next risk is accidental overreach:

- too much tool shaping in the wrong lane
- helper tools that secretly become a second host capability stack
- MCP exposure before the helper-tool surface is even stable

The strongest SNC-safe v1 read is:

1. keep transcript shaping in the landed hook layer
2. use `before_tool_call` only for narrow helper-tool guardrails
3. add helper tools only when they project SNC-owned artifacts or session-state
4. reuse host external-content wrapping for untrusted payloads
5. keep dangerous-tool policy entirely host-owned
6. treat MCP as an optional export path, not as the design center

That gives SNC a practical next-step tool strategy without turning SNC into a host fork or a second policy engine.

## Modification Guidance

- `Hot-pluggable seam`
  - SNC-owned helper tools as plugin tools
  - `before_tool_call`
  - `tool_result_persist`
  - `before_message_write`
  - external-content wrapping reuse

- `Wrap preferred`
  - helper tools over SNC-owned artifacts
  - read-only session-state projection
  - later MCP exposure through existing plugin-tool serving

- `Defer`
  - any ToolSearch-like deferred exposure plane
  - durable-memory helper tools until `research/67_snc_durable_memory_v1_design.md`
  - orchestration helpers until `research/72_snc_multiworker_v1_design.md`

- `Do-not-touch`
  - dangerous-tool denylist
  - core tool-policy ownership
  - host executor internals
  - gateway control-plane methods unless a later packet proves the need

## Still-Unverified Questions

1. Whether SNC will end up needing enough helper tools to justify a deferred-exposure layer rather than plain plugin-tool registration.
2. Whether plugin-tools MCP serving or ACPx plugin-tools bridging is the better first export lane for SNC helper tools in real deployments.
3. Whether future durable-memory design will want raw tool artifacts, normalized wrapped content, or selected excerpts as the canonical ingest source.
4. Whether any current OpenClaw plugin uses `before_tool_call` in a way that would constrain SNC helper-tool approval patterns more tightly than this packet assumes.
5. Whether later SNC hook/utility convergence will change the ideal split between helper-tool projection and prompt projection.
