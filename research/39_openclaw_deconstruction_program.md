# OpenClaw Deconstruction Program

## Purpose

Take OpenClaw apart until it is no longer a black box.

The target is not only code familiarity.
The target is:

- subsystem boundaries
- call chains
- modification seams
- dangerous internals
- safe wrap-vs-rewrite guidance

Each packet must end with explicit modification notes.

## Output Standard

Every OpenClaw packet must produce five things:

1. domain description
2. main entry files
3. verified call chain or structural map
4. safe modification notes
5. internal-change warning notes

That is what turns “repo reading” into “repo deconstruction.”

## Packet Set

### OC-01 Agent Runtime Core

Scope:

- `src/agents`
- `src/context-engine`
- `src/flows`
- `src/tasks`

Main questions:

- how turns actually execute
- what the model sees
- where compaction and maintenance enter
- what runtime order is stable

Must output:

- runtime spine map
- context assembly map
- compaction/maintenance map
- safe insertion seams
- unsafe ownership zones

Modification note target:

- what can be wrapped
- what can be slot-owned
- what should not be rewritten in v1

### OC-02 Plugin / Hook / Manifest Host

Scope:

- `src/plugins`
- `src/plugin-sdk`
- `src/hooks`
- `extensions/*`

Main questions:

- how plugins are discovered
- how slots are resolved
- how hooks are wired
- how bundled extensions shape host behavior

Must output:

- plugin lifecycle map
- slot ownership map
- hook timing map
- packaging constraints

Modification note target:

- where SNC should stay hot-pluggable
- which host layers must remain untouched
- what packaging rules govern deployment

### OC-03 Session / Channel / Gateway Fabric

Scope:

- `src/sessions`
- `src/channels`
- `src/chat`
- `src/routing`
- `src/gateway`

Main questions:

- how session identity flows
- how channels bind to sessions
- which gateway surfaces matter later

Must output:

- session identity map
- channel binding map
- gateway control surface note

Modification note target:

- what SNC can later integrate with
- what deployment surfaces are out of scope for v1

### OC-04 Capability Stack

Scope:

- media
- speech
- web
- image
- link/media understanding

Main questions:

- which capabilities are isolated
- which capabilities affect context or tool policy

Must output:

- capability atlas
- interaction relevance note
- later-SNC dependency note

Modification note target:

- what can be ignored for writing-first SNC
- what later needs compatibility checks

### OC-05 Config / Security / Ops

Scope:

- `src/config`
- `src/security`
- `src/infra`
- `src/logging`
- `src/bootstrap`
- `src/daemon`

Main questions:

- what host policy constrains plugins
- what runtime defaults matter
- what rollout or ops constraints affect SNC packaging

Must output:

- config boundary note
- security/policy constraint note
- operational risk note

Modification note target:

- what must be configured rather than coded
- what host policy SNC must respect

### OC-06 UI / Product Surfaces

Scope:

- `src/cli`
- `src/tui`
- `src/terminal`
- `src/interactive`
- `src/wizard`

Main questions:

- which user-facing surfaces are core
- which are optional for SNC productization later

Must output:

- UI/product atlas
- author-workflow relevance note

Modification note target:

- which surfaces matter later
- which surfaces should not distract v1

## Acceptance Standard Per Packet

No packet is complete unless it answers:

1. what this subsystem does
2. where it enters the runtime
3. how SNC can use or avoid it
4. whether it is:
   - wrap
   - extend
   - defer
   - do-not-touch

## Modification Guidance Vocabulary

To keep later deconstruction notes consistent, every packet should classify findings with these labels:

- `Hot-pluggable seam`
- `Host-owned seam`
- `Wrap preferred`
- `Internal edit only if proven necessary`
- `Out of SNC v1 scope`
- `Productization-later surface`

## Priority Order

Priority now:

1. `OC-01`
2. `OC-02`
3. `OC-05`
4. `OC-03`
5. `OC-04`
6. `OC-06`

Why:

- the first three most directly affect SNC architecture and safe modification boundaries

## Success Condition

OpenClaw is “fully deconstructed for SNC purposes” when:

- every major subsystem has a packet
- every packet has modification notes
- the host is readable as a set of changeable surfaces, not just a repo tree
