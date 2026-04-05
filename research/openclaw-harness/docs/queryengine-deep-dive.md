# QueryEngine Deep Dive

Last updated: 2026-04-01

## Scope

This round did not stop at `QueryEngine.ts`. The analysis intentionally traced the files that actually make the runtime work:

- `src/QueryEngine.ts`
- `src/query.ts`
- `src/utils/processUserInput/processUserInput.ts`
- `src/utils/sessionStorage.ts`
- `src/services/tools/toolOrchestration.ts`
- `src/services/tools/StreamingToolExecutor.ts`
- `src/utils/messages/systemInit.ts`
- `src/memdir/memdir.ts`
- `src/query/tokenBudget.ts`
- `src/services/compact/autoCompact.ts`
- `src/bridge/sessionRunner.ts`
- `src/utils/permissions/permissions.ts`
- `src/utils/plugins/loadPluginCommands.ts`
- `src/skills/loadSkillsDir.ts`

The goal of this document is not to restate source code. The goal is to extract design ideas that are genuinely useful for an `openclaw` enhancement plugin.

## High-Level Reading

The first important correction is this: `QueryEngine` is not "the loop". It is the runtime shell around the loop.

What the codebase actually does is more interesting:

1. `QueryEngine.ts` owns session-scoped state, dependency wiring, and public entrypoints.
2. `query.ts` owns the iterative turn loop and recovery logic.
3. Tool execution, permission decisions, compaction, persistence, memory, and bridge behavior all live in separate subsystems.
4. The runtime behaves more like a small operating system for an agent session than like a simple chat wrapper.

That separation matters. It keeps the top-level class powerful without letting it become the only place where behavior exists.

## Runtime Map

The runtime can be understood as seven cooperating layers:

1. Input normalization
   - `processUserInput.ts`
   - Slash commands, bridge-safe commands, pasted content, attachments, image handling, and prompt hooks are all resolved before the model turn starts.

2. Session shell
   - `QueryEngine.ts`
   - Holds mutable messages, total usage, discovered skills, loaded nested memories, denial tracking, and abort plumbing.

3. Turn loop
   - `query.ts`
   - Runs the model loop, decides whether to continue, compact, stop, retry, or execute tools.

4. Tool runtime
   - `toolOrchestration.ts`
   - `StreamingToolExecutor.ts`
   - Handles concurrency-safe batching, in-flight progress, interrupt semantics, sibling cancellation, and ordered result emission.

5. Persistence and explicit memory
   - `sessionStorage.ts`
   - `memdir.ts`
   - Persists transcripts and subagent runs, plus a file-based long-term memory layer.

6. Protocol and bridge
   - `systemInit.ts`
   - `bridge/sessionRunner.ts`
   - Makes runtime metadata visible to SDK or bridge consumers and runs bridge sessions as child processes.

7. Guardrails and adaptive control
   - `permissions.ts`
   - `tokenBudget.ts`
   - `autoCompact.ts`
   - Adds policy, budget-awareness, failure cutoffs, and context management.

This layered split is one of the strongest design choices in the codebase.

## Valuable Designs

### 1. QueryEngine as a stateful runtime shell

`QueryEngine.ts` is valuable precisely because it is not pretending to be thin.

Interesting details:

- It accepts a large and honest config surface: tools, commands, MCP clients, agents, permissions, prompts, model policy, abort control, replay behavior, app state access, and more.
- It maintains runtime memory that is not part of the raw transcript:
  - `mutableMessages`
  - `permissionDenials`
  - `totalUsage`
  - `readFileState`
  - `discoveredSkillNames`
  - `loadedNestedMemoryPaths`

Why this is valuable:

- Real agent sessions always accumulate state that is not just "messages".
- By making that state explicit, the runtime becomes debuggable and extensible.

What `openclaw` should borrow:

- A session runtime object that owns mutable turn state and delegates behavior outward.
- Not a giant monolith, but also not a fake stateless wrapper.

Suggested placement:

- Core runtime capability, not a plugin.

### 2. The real loop lives in `query.ts`, not in the facade

This is easy to miss and worth copying conceptually.

The code does not force every behavior through one giant class method. Instead:

- `QueryEngine.submitMessage()` prepares the environment.
- `query.ts` runs the iteration logic.
- Stop hooks, compact logic, budget checks, attachments, tool execution, and transition decisions are handled in a dedicated loop module.

Why it matters:

- The iteration loop is where most harness complexity lives.
- Pulling it into its own module makes it testable and easier to reason about than if it were buried inside UI or session glue.

What `openclaw` should borrow:

- Introduce a dedicated turn-loop module, separate from gateway transport and CLI wrapper code.

Suggested placement:

- Core runtime capability.

### 3. Input is treated as a pipeline, not a string

`processUserInput.ts` is one of the more underrated files.

It shows that "user input" is actually a preprocessing pipeline:

- Slash command parsing
- Bridge-safe command exceptions
- Pasted content expansion
- Image validation and resize
- Attachment creation
- Prompt submit hooks
- Meta/system-generated prompts
- Optional continuation blocking

Why this is more important than it looks:

- Many agent systems degrade because they treat everything as prompt text and push complexity downstream into the model.
- This repo instead resolves operational structure before inference.

What `openclaw` should borrow:

- A pre-model input pipeline with stages and typed outputs.
- Commands, OCR attachments, and system-generated tasks should enter through the same normalization path.

Suggested placement:

- Core runtime capability with pluggable stages.

### 4. Tool concurrency is capability-aware, not globally parallel

`toolOrchestration.ts` and `StreamingToolExecutor.ts` contain one of the best low-level ideas in the repo:

- Tools declare whether a specific invocation is concurrency-safe.
- Consecutive safe tool calls are batched.
- Unsafe operations serialize.
- Results are still emitted in a controlled order.

This is much better than the two common bad options:

- Everything serial
- Everything parallel

Why it is clever:

- "Parallelism" is decided per invocation, not just per tool type.
- The runtime remains conservative when parsing or safety checks fail.
- Context modifiers from concurrent runs are queued and then applied in a deterministic order.

Why it is easy to underestimate:

- It looks like a detail of tool execution.
- In practice, it is a major determinant of latency, correctness, and user trust.

What `openclaw` should borrow:

- Tool metadata should include concurrency semantics.
- Read-only retrieval, grep, fetch, OCR parse, and similar tools can often run together.
- Stateful mutations should remain serialized unless explicitly proven safe.

Suggested placement:

- Core runtime capability.

### 5. Streaming tool execution models interruption as a first-class concern

`StreamingToolExecutor.ts` is not just a queue. It is a session-control mechanism.

Important behaviors:

- Tracks tool status as `queued`, `executing`, `completed`, `yielded`.
- Supports synthetic error messages for:
  - sibling tool failure
  - user interruption
  - streaming fallback discard
- Uses a child abort controller so one Bash-like failure can cancel siblings without killing the whole parent turn.
- Distinguishes `cancel` vs `block` interrupt behavior.

Why this matters:

- In real use, users interrupt runs constantly.
- Partial tool batches fail in mixed ways.
- Without explicit interruption semantics, the runtime becomes nondeterministic and hard to trust.

What `openclaw` should borrow:

- Separate "abort this tool group" from "abort the whole turn".
- Teach tools to declare interrupt behavior.
- Emit synthetic, user-readable terminal states instead of silently dropping work.

Suggested placement:

- Core runtime capability.

### 6. Session persistence is file-based, engineered, and surprisingly strong

`sessionStorage.ts` is much more sophisticated than a casual "write transcript to JSONL" utility.

Interesting details:

- Transcript pathing depends on project/session context, not just a global session id.
- Progress messages are excluded from the transcript chain because they are UI noise, not semantic history.
- There are separate subagent transcript paths.
- Large transcript reads and tombstone rewrites are guarded by size thresholds.
- The chain of persisted messages is treated as a correctness problem, not just a logging problem.

Why this is valuable:

- File-based persistence is often dismissed as primitive.
- Here it is used as a durable, inspectable, debuggable runtime ledger.

This is especially relevant for `openclaw` because:

- It aligns with low-maintenance local-first architecture.
- It avoids introducing database complexity just to preserve session fidelity.

What `openclaw` should borrow:

- JSONL session ledger with strict notions of what is and is not part of semantic history.
- Separate transcript branches for subagents or background workers.
- Guardrails for giant transcripts before memory or rewrite operations.

Suggested placement:

- Core runtime capability.

### 7. `system/init` is an explicit protocol, not hidden runtime knowledge

`systemInit.ts` is one of the clearest examples of good harness design.

At session start, it emits a structured init payload containing:

- cwd
- session id
- tools
- MCP servers
- model
- permission mode
- slash commands
- skills
- plugins
- output style
- fast mode state

Why this is powerful:

- Remote clients do not need to infer runtime capabilities.
- Bridge consumers can render UI and enforce affordances from explicit metadata.
- The runtime surface becomes inspectable.

Why it is relevant to `openclaw`:

- You already have `openclaw-gateway`.
- A gateway-friendly enhancement plugin should expose a similar initialization contract.

What `openclaw` should borrow:

- A runtime init event or schema that advertises capabilities, policies, and dynamic extensions.

Suggested placement:

- Core runtime/gateway contract.

### 8. `memdir` is a practical form of explicit long-term memory

`memdir.ts` is one of the most interesting files in the repo because it chooses a very maintainable memory model:

- `MEMORY.md` as a compact index
- separate topic files as the actual memory records
- line and byte caps for index loading
- "do not duplicate memory" guidance
- instructions for what belongs in memory and what does not
- ensured directories so the model does not waste turns checking whether they exist

Why this is clever:

- It creates persistent memory without requiring a background service.
- It keeps memory inspectable by humans.
- It distinguishes stable memory from current-task state.

Why it fits `openclaw`:

- It complements vector memory rather than replacing it.
- It is ideal for explicit operator preferences, collaboration norms, recurring project facts, and reusable procedures.

What `openclaw` should borrow:

- A file-based explicit memory layer alongside embeddings.
- Use vector retrieval for fuzzy recall and `MEMORY.md` style files for canonical durable facts.

Suggested placement:

- Could start as a plugin, but may become a first-class runtime subsystem.

### 9. Token budget is used as a control loop, not only as a limit

`tokenBudget.ts` is tiny but conceptually strong.

It does not just ask "did we exceed budget?"
It asks:

- Have we made enough progress to justify another continuation?
- Are we hitting diminishing returns?
- Should we nudge the system to continue once more or stop now?

Why this is important:

- Agent loops often die from either premature stopping or endless continuation.
- A diminishing-returns detector is a lightweight but useful middle layer.

What `openclaw` should borrow:

- Budget policy should look at delta value across iterations, not just absolute spend.
- This is especially relevant if `openclaw` later supports long-running repair or coding loops.

Suggested placement:

- Core runtime capability.

### 10. Auto-compaction is guarded by thresholds, exclusions, and a circuit breaker

`autoCompact.ts` is valuable not because compaction exists, but because it is distrustful of compaction.

It includes:

- effective context window calculation
- warning, error, autocompact, and blocking thresholds
- environment overrides
- interaction rules with reactive compact, session memory, and context collapse
- a hard cap on consecutive failures

Why this matters:

- Compaction features often become self-inflicted denial-of-service loops.
- This code explicitly avoids racing with other context strategies and avoids retrying forever.

What `openclaw` should borrow:

- If you add summarization or compaction, treat it as a fallible subsystem.
- Include failure counters and mode exclusions from day one.

Suggested placement:

- Core runtime capability, but only after a simpler session loop exists.

### 11. Bridge sessions are spawned as managed child runs, not magical remote state

`bridge/sessionRunner.ts` reveals another strong design choice:

- Each bridge session is a spawned child run.
- It keeps activity summaries.
- It forwards permission requests upward.
- It captures transcript data and completion state.

Why this is a good fit for harness-style systems:

- It turns a remote or detached session into something operationally concrete.
- Parent and child roles are clearer.
- Session activity can be surfaced without replaying the full transcript.

What `openclaw` should borrow:

- A bridge worker should look like a managed child runtime with explicit lifecycle, not like a black-box socket tunnel.

Suggested placement:

- Gateway/runtime capability.

### 12. Skills and plugin commands are loaded as content, not compiled features

`loadPluginCommands.ts` and `loadSkillsDir.ts` show a consistent philosophy:

- Commands and skills live in markdown plus frontmatter.
- Namespacing is path-derived.
- Hooks, models, tools, effort levels, visibility, and execution hints can all come from metadata.
- Skill directories collapse to a single `SKILL.md`, which is a nice way to keep structured content together.

Why this is interesting:

- The extension surface is content-driven rather than code-only.
- That lowers the cost of shipping new behavior.

What `openclaw` should borrow:

- The enhancement plugin should probably support declarative skill packs and prompt-time capabilities.
- Not every extension should require a binary or code deployment.

Suggested placement:

- Plugin capability.

## Underrated Design Patterns

These are the pieces that feel especially worth carrying forward:

1. Separate semantic transcript from UI progress
   - This is a surprisingly deep idea. It keeps history usable and avoids transcript corruption.

2. Ensure writable directories before the model tries to use them
   - A small operational trick that saves tokens and reduces pointless filesystem probing.

3. Represent runtime capabilities explicitly in protocol events
   - Better than forcing clients to infer what tools and policies exist.

4. Let tool invocations influence concurrency dynamically
   - Better than a global "parallel on/off" switch.

5. Treat interruption as a design dimension, not an error case
   - This is the difference between a toy harness and a real one.

## What Looks Claude-Specific

Some parts are clearly shaped by Anthropic or Claude Code product constraints and should not be copied directly:

1. Anthropic-specific API surface
   - Betas, SDK message shapes, thinking block rules, prompt cache handling, and Claude API error recovery.

2. Feature-flag density
   - Many branches exist because the product supports many staged internal experiments.
   - `openclaw` should stay much leaner at first.

3. Deep coupling to Claude-specific permission and classifier workflows
   - The permission stack is conceptually valuable, but the exact classifier and policy flow is likely too product-specific.

4. Full command and UI surface
   - The command layer is rich, but reproducing all of it would dilute focus.

5. Context-collapse and reactive-compact coexistence logic
   - The underlying lesson is useful.
   - The exact feature interaction graph is likely overkill for the first `openclaw` plugin.

## What To Build First For Openclaw

If the goal is "our own openclaw enhancement plugin inspired by Claude Code harness ideas", the best first slice is:

1. Session runtime shell
   - A clear runtime object that owns session state and delegates to subsystems.

2. Input pipeline
   - Normalize commands, OCR attachments, and system prompts before model invocation.

3. Tool execution runtime
   - Add concurrency-safe batching, progress, and interruption semantics.

4. Explicit runtime init contract
   - Let `openclaw-gateway` surface tools, policies, extensions, and model state.

5. File-based session ledger
   - JSONL transcripts and subagent/session branches before introducing more infrastructure.

6. Explicit memory layer
   - `MEMORY.md` style durable operator memory, complementary to vector search.

## Things To Delay

These should stay in the research bucket until the core is stable:

1. Full compaction stack
2. Rich classifier-driven permission automation
3. Complete bridge parity
4. The full command ecology
5. Multi-agent swarm behaviors

## Open Questions

These questions now matter more than "what does QueryEngine do?":

1. Where should `openclaw` draw the boundary between gateway protocol and session runtime?
2. Which parts of the current `openclaw` service already overlap with the file-based session ledger idea?
3. Should explicit `memdir` memory live inside the enhancement plugin, or should it become a native `openclaw` subsystem?
4. How much of the permission model should remain simple and operator-driven before adding automation?

## Next Reading Pass

The next deep dives should focus on:

1. `bridge/bridgeMain.ts`
2. `utils/permissions/permissions.ts`
3. `services/api/claude.ts`
4. Any `openclaw` runtime files we can access once server auth is restored
