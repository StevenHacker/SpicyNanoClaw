# SNC-15 Helper Tools Utility

## What This Utility Is

This packet adds a bounded, read-only helper-tool layer for SNC-owned artifacts and SNC session-state projections.

The key design choice is that the helper layer stays projection-only:

- it reads SNC-owned files and persisted session state
- it formats bounded projections for later tool use
- it does not register tools into the plugin entry
- it does not touch host tool policy or MCP exposure

The implementation lives in:

- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/src/helper-tools.ts`
- `data/working/openclaw-v2026.4.1-snc-v1/extensions/snc/src/helper-tools.test.ts`

## Builder Surfaces

The utility currently exposes three bounded helpers:

- `collectSncOwnedArtifactSources(...)`
- `buildSncArtifactTool(...)`
- `buildSncSessionStateTool(...)`

There is also a convenience wrapper:

- `buildSncHelperTools(...)`

That wrapper returns both tool descriptors together, which makes later registration or host wiring straightforward without forcing it now.

## Artifact Projection Lane

The artifact builder reads SNC-owned sources from:

- `briefFile`
- `ledgerFile`
- `packetFiles`
- `packetDir`

The output is intentionally small and stable:

- file order is preserved
- packet-directory files are sorted lexicographically
- empty or missing files are skipped
- the caller can narrow by query and cap the number of items returned

This keeps the helper useful for on-demand inspection while avoiding prompt bloat.

## Session-State Projection Lane

The session-state builder reads the persisted SNC session-state file for a given `sessionId` and optional `sessionKey`.

It returns a bounded projection that reuses the existing SNC session snapshot formatting:

- current focus
- latest directive
- latest assistant plan
- continuity notes
- recent messages, when requested

If the session state is missing, the tool returns a clean read-only miss instead of trying to create or repair anything.

## Usage Shape

The intended usage is:

1. build the tool descriptors from SNC-owned config/state inputs
2. register them later through the normal OpenClaw plugin path if and when the packet is promoted
3. keep the helpers as explicit read-only projections, not as a second policy layer

Example future shape:

```ts
const helperTools = buildSncHelperTools(config);
// register later, if accepted
```

## Safe Seams

- `Hot-pluggable seam`
  - read-only artifact projection
  - read-only session-state projection
  - bounded tool descriptors

- `Wrap preferred`
  - use these helpers for smaller on-demand reads instead of stuffing all SNC context into the prompt

- `Do-not-touch`
  - plugin-entry registration
  - host dangerous-tool policy
  - MCP export
  - any helper that mutates SNC-owned state

## SNC Relevance

This utility gives SNC a practical projection layer without expanding host ownership.

That matters because it lets SNC:

- keep prompt context smaller
- expose owned continuity state explicitly
- defer any broader tool-registration decision until the helper surface proves itself

## Modification Guidance

- `Hot-pluggable seam`
  - helper builders
  - bounded result formatting
  - session-state projection reuse

- `Wrap preferred`
  - future plugin-tool registration
  - future on-demand prompt references to SNC-owned artifacts

- `Defer`
  - MCP serving
  - helper-tool discovery automation
  - any cross-session durable-memory behavior

- `Do-not-touch`
  - host tool policy
  - gateway/tool security rules
  - plugin entry registration in this packet
