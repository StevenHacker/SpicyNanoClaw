# OC-04 Capability Stack

## Purpose

This packet deconstructs the OpenClaw capability stack beyond SNC core.

The main conclusion is straightforward:

- this is mostly a host-owned compatibility layer for multimodal and external-capability execution
- it is not a primary continuity/state mechanism

For SNC, the capability stack matters mainly as:

- a future compatibility boundary
- a possible donor for optional research workflows
- a set of host internals to avoid editing early

## Main Subsystem Split

### Raw media plumbing

Handles file reads, hosting, MIME detection, optimization, and local/network boundaries.

Representative files:

- `data/external/openclaw-v2026.4.1/src/media/web-media.ts`
- `data/external/openclaw-v2026.4.1/src/media/host.ts`
- `data/external/openclaw-v2026.4.1/src/media/server.ts`

### Shared capability-provider resolution

This is the common runtime/provider registration layer for several capability families.

Representative files:

- `data/external/openclaw-v2026.4.1/src/plugins/types.ts`
- `data/external/openclaw-v2026.4.1/src/plugins/capability-provider-runtime.ts`

### Provider-backed capability domains

- image generation
- media understanding
- speech / TTS
- web search

Representative files:

- `data/external/openclaw-v2026.4.1/src/image-generation/runtime.ts`
- `data/external/openclaw-v2026.4.1/src/media-understanding/runtime.ts`
- `data/external/openclaw-v2026.4.1/src/tts/runtime.ts`
- `data/external/openclaw-v2026.4.1/src/web-search/runtime.ts`

### Inbound preprocessing domains

Link understanding and media understanding both affect inbound message context before agent invocation.

Representative files:

- `data/external/openclaw-v2026.4.1/src/media-understanding/apply.ts`
- `data/external/openclaw-v2026.4.1/src/link-understanding/apply.ts`

### Bundled public facades

Bundled capability extensions expose stable runtime APIs instead of requiring direct source imports.

Representative files:

- `data/external/openclaw-v2026.4.1/extensions/image-generation-core/runtime-api.ts`
- `data/external/openclaw-v2026.4.1/extensions/media-understanding-core/runtime-api.ts`
- `data/external/openclaw-v2026.4.1/extensions/speech-core/runtime-api.ts`

## Verified Read

### 1. Capability domains are intended to extend through provider registration

Speech, media understanding, and image generation all resolve through the active runtime plugin registry first, then through config-aware compatibility loading.

That means host intent is:

- register providers
- do not hardcode capability behavior into the host

Primary evidence:

- `data/external/openclaw-v2026.4.1/src/plugins/capability-provider-runtime.ts`
- `data/external/openclaw-v2026.4.1/src/plugins/types.ts`

### 2. Web search is a meaningful asymmetry

Web search has its own provider resolution path and runtime execution layer.
It is cleaner to think of it as a host-owned external research capability rather than just another media provider.

This makes it more interesting for future SNC research workflows than image generation or TTS.

Primary evidence:

- `data/external/openclaw-v2026.4.1/src/web-search/runtime.ts`
- `data/external/openclaw-v2026.4.1/src/plugins/web-search-providers.runtime.ts`
- `data/external/openclaw-v2026.4.1/src/plugin-sdk/provider-web-search.ts`

### 3. Media understanding is an inbound rewrite path, not just offline analysis

`media-understanding/apply.ts` rewrites inbound context fields such as:

- `ctx.Body`
- `ctx.CommandBody`
- `ctx.RawBody`
- `ctx.Transcript`

and finalizes the inbound context before agent processing.

This is host message-shaping logic, not a continuity seam that SNC should take over.

Primary evidence:

- `data/external/openclaw-v2026.4.1/src/media-understanding/apply.ts`

### 4. Link understanding is similar but narrower

`link-understanding/apply.ts` appends link-analysis output into the inbound body and then forces the rewritten body into agent/command flow.

Again, this is a host preprocessing path.

Primary evidence:

- `data/external/openclaw-v2026.4.1/src/link-understanding/apply.ts`

### 5. Capability scope is already policy-controlled

Media-understanding scope is controlled by session key, channel, and chat type.
Link understanding reuses the same scope path.

This means future SNC compatibility work should consume existing host policy boundaries rather than invent its own multimodal scope policy.

Primary evidence:

- `data/external/openclaw-v2026.4.1/src/media-understanding/scope.ts`
- `data/external/openclaw-v2026.4.1/src/link-understanding/runner.ts`

### 6. Bundled capability cores are exposed through lazy public facades

OpenClaw deliberately exposes capability families through SDK/runtime-api facades instead of direct source imports.

That is the correct future boundary if SNC later needs to interoperate with these domains.

Primary evidence:

- `data/external/openclaw-v2026.4.1/src/plugin-sdk/media-understanding-runtime.ts`
- `data/external/openclaw-v2026.4.1/src/plugin-sdk/speech-runtime.ts`
- `data/external/openclaw-v2026.4.1/src/plugin-sdk/image-generation-runtime.ts`

### 7. Bundled providers are ordinary plugins

Example bundled providers such as Brave, Deepgram, and Fal register through the normal plugin API surface.

That reinforces the architectural read that SNC should stay pluggable and treat capability domains as plugin-extensible host territory.

Primary evidence:

- `data/external/openclaw-v2026.4.1/extensions/brave/index.ts`
- `data/external/openclaw-v2026.4.1/extensions/deepgram/index.ts`
- `data/external/openclaw-v2026.4.1/extensions/fal/index.ts`

## Safe SNC Modification Guidance

### Treat the capability stack as a compatibility surface

If SNC needs to interact with capability domains, consume public facades:

- `src/plugin-sdk/media-understanding-runtime.ts`
- `src/plugin-sdk/speech-runtime.ts`
- `src/plugin-sdk/image-generation-runtime.ts`
- `src/plugin-sdk/provider-web-search.ts`

Do not patch provider-loading internals first.

### Future research/web assistance should wrap, not alter, provider loading

If SNC later adds research-oriented writing assistance, place it around:

- `src/web-search/runtime.ts`

not inside provider registry internals.

### Future multimodal continuity should consume host outputs after preprocessing

If SNC later becomes multimodal, consume the already-produced media/link outputs after host apply-time rewriting.

Do not replace:

- `src/media-understanding/apply.ts`
- `src/link-understanding/apply.ts`

### Provider additions are safe when they remain normal plugins

If SNC ever needs capability additions, the safe shape is:

- normal plugin registration through `src/plugins/types.ts`

not direct host edits.

### Raw media access should remain host-governed

SNC may consume attachment results and processed outputs, but should not redefine:

- file-read policy
- local-root rules
- temporary hosting behavior
- network/media security boundaries

## Unsafe / Internal-Edit-Only Zones

### Security and boundary-heavy media internals

- `data/external/openclaw-v2026.4.1/src/media/web-media.ts`
- `data/external/openclaw-v2026.4.1/src/media/server.ts`
- `data/external/openclaw-v2026.4.1/src/media/host.ts`

### Capability loader internals

- `data/external/openclaw-v2026.4.1/src/plugins/capability-provider-runtime.ts`
- `data/external/openclaw-v2026.4.1/src/plugins/web-search-providers.runtime.ts`

### Host preprocessing / message-rewrite internals

- `data/external/openclaw-v2026.4.1/src/media-understanding/apply.ts`
- `data/external/openclaw-v2026.4.1/src/link-understanding/apply.ts`

### Provider execution internals

- `data/external/openclaw-v2026.4.1/src/media-understanding/runner.ts`
- `data/external/openclaw-v2026.4.1/src/media-understanding/provider-registry.ts`
- `data/external/openclaw-v2026.4.1/src/image-generation/provider-registry.ts`
- `data/external/openclaw-v2026.4.1/src/tts/provider-registry.ts`

### Bundled capability packages

- `data/external/openclaw-v2026.4.1/extensions/media-understanding-core/src/runtime.ts`
- `data/external/openclaw-v2026.4.1/extensions/image-generation-core/src/runtime.ts`
- `data/external/openclaw-v2026.4.1/extensions/speech-core/src/tts.ts`

## Per-Domain Classification

- `media` raw transport / hosting / fs policy: `compatibility-later`
- `media-understanding`: `compatibility-later`
- `speech` / `tts`: `compatibility-later`
- `image-generation`: `ignore now`
- `web-search`: `potential donor`
- `link-understanding`: `ignore now`
- bundled runtime facades: `compatibility-later`

## SNC Takeaway

The capability stack should not distract current SNC work.

The practical read is:

- preserve compatibility with it
- avoid editing it early
- revisit `web-search` first if SNC later grows research-oriented writing workflows
