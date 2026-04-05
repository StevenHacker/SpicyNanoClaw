# Codex Dispatcher Model

## Short Answer

Yes.

This can be implemented with the current Codex thread/subagent mechanism.

But the correct mental model is not:

- several threads magically sharing one brain

It is:

- one dispatcher thread
- many bounded worker threads
- externalized state
- strict write ownership
- dispatcher-side acceptance and integration

That model is workable.

## What The Dispatcher Owns

This main thread should own:

1. goal setting
2. task decomposition
3. subagent dispatch
4. progress tracking
5. acceptance review
6. git integration
7. research-to-implementation continuity

The dispatcher should not offload final architecture judgment.

## What Workers Own

Workers should own only bounded packets:

- one read packet
- or one implementation packet
- with a clearly declared write set
- and a concrete acceptance target

Examples:

- "map OpenClaw session/gateway fabric"
- "harden SNC hook integration in these two files"
- "extract refactor notes for this OpenClaw subsystem"

Workers should not own:

- repo-wide planning
- final prioritization
- merge policy
- final acceptance

## Why This Can Work

Because Codex subagents are already good at:

1. sidecar reading
2. narrow implementation slices
3. producing file-scoped results
4. returning bounded summaries for dispatcher review

And this project already has the right external memory shape:

- `research/`
- versioned working notes
- evidence matrix
- roadmap
- workstreams

That means we do not need shared live context.
We need shared written state.

## Hard Constraints

This model has real limits.

### 1. No Shared Live Mind

Workers do not maintain one shared internal memory.

Implication:

- every important decision must be externalized into docs
- task packets must include local context and acceptance rules

### 2. Write Collisions Are The Main Failure Mode

If multiple workers touch the same files casually, quality drops fast.

Implication:

- every implementation task needs a declared write scope
- overlapping write scopes should stay with the dispatcher unless deliberately serialized

### 3. Dispatcher Must Stay Active

This is not a self-running background swarm.

Implication:

- the dispatcher must keep the board current
- workers should be opened for concrete packets and closed after return

### 4. Git Hygiene Matters

Parallel work collapses if the repo does not have a clear source-of-truth structure.

Implication:

- dispatcher owns branch policy
- dispatcher owns staging/commit/push policy
- workers do not make repo-wide git decisions

## Required Operating Rules

### Rule 1. Every Task Must Declare Its Type

Only three task types are allowed:

- `research`
- `implementation`
- `acceptance`

### Rule 2. Every Task Must Declare A Write Scope

Possible write scopes:

- `read-only`
- `single-file`
- `small-set`
- `dispatcher-only`

### Rule 3. Every Task Must End With Acceptance Conditions

Examples:

- required files updated
- required tests green
- required document section added
- no host-internal edits outside scope

### Rule 4. Dispatcher Is The Only Final Arbiter

Only the dispatcher can mark:

- accepted
- deferred
- superseded
- ready to commit

## Repo Operating Shape

To support multi-thread execution cleanly, the repo should be treated as three logical layers:

### 1. Dispatcher Layer

Purpose:

- goals
- board
- roadmap
- evidence
- acceptance notes

Primary location:

- `research/`

### 2. Working Code Layer

Purpose:

- SNC implementation
- tests
- integration slices

Current active location:

- `data/working/openclaw-v2026.4.1-snc-v1/`

### 3. Reference Layer

Purpose:

- frozen donor repos
- incoming artifacts
- evidence snapshots

Primary locations:

- `data/external/`
- `data/incoming/`

## Git Model

Dispatcher-managed git should use this policy:

1. one active dispatcher branch for the current coordination phase
2. one accepted implementation slice per commit layer
3. no mixed commit containing:
   - planner docs
   - unrelated research
   - multiple overlapping code slices

Recommended commit grouping:

- coordination/docs
- OpenClaw deconstruction outputs
- SNC implementation slices
- acceptance/verification updates

## Work Packet Template

Each worker packet should define:

1. objective
2. task type
3. write scope
4. owned files
5. forbidden files
6. evidence or code targets
7. acceptance checks
8. expected output format

## Acceptance Flow

Every returned packet should pass through:

1. dispatcher review
2. local verification
3. doc update
4. board update
5. only then git integration

## Practical Conclusion

This is feasible now.

The right implementation is:

- dispatcher-led orchestration
- worker-side bounded execution
- doc-first state sharing
- file-scope ownership
- dispatcher-side verification and repo control

So the answer is yes, with one important clarification:

we are building a disciplined multi-thread operating model, not a free-form multi-agent swarm.
