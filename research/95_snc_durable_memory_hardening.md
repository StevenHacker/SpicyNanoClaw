# SNC Durable Memory Hardening

## Purpose

This note records the first hardening pass after durable memory entered the live SNC continuity path.

The goal was not to broaden host ownership.
The goal was to make the existing plugin-local durable-memory path less noisy and more self-cleaning.

## What Changed

### 1. Duplicate latest-user-directive no longer creates a fake extra confirmation

Before this pass:

- `storyLedger.userDirectives`
- and `chapterState.latestUserDirective`

could both promote the same directive in the same turn and inflate confirmation count.

After this pass:

- `latestUserDirective` only acts as a fallback source when the same directive is not already present in the story-ledger directive set

Why:

- the old behavior made one turn look more confirmed than it really was
- this is a promotion-quality issue, not a missing-feature issue

### 2. Weak stale derived entries are now pruned during persistence

The durable store now drops entries that are both:

- weak single-signal entries
- and older than the bounded stale window

Current default read:

- stale-window pruning applies to weak `derived` entries with only one confirmation
- stronger or explicitly user-authored entries are preserved

Why:

- focus-derived one-off entries and similar weak artifacts should not accumulate forever
- this keeps the plugin-local durable store cleaner without turning it into a complex retention system

### 3. Stale entry files are now cleaned from disk

When persistence rewrites the bounded catalog, entry files no longer kept in the catalog are removed from:

- `stateDir/durable-memory/entries`

Why:

- catalog hygiene should be reflected on disk
- otherwise stale entry files silently accumulate even when the logical catalog is clean

## What Did Not Change

- no host memory-slot ownership
- no host memory-plugin edits
- no helper-tool exposure
- no MCP export
- no engine contract expansion

This remains a plugin-local hardening pass.

## Validation

The expected validation surface for this pass is:

- durable-memory unit tests
- engine/durable-memory integration tests
- workspace typecheck

## SNC Relevance

This pass improves the quality of the live durable-memory path without changing the architecture decision.

The durable-memory lane remains:

- plugin-owned
- bounded
- continuity-focused
- hot-pluggable

It is simply less likely to accumulate weak noise or overcount one-turn evidence now.
