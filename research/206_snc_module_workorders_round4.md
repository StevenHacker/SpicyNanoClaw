# SNC Module Workorders - Round 4

## Purpose

This file is the first module queue for `Milestone 3`.

`Milestone 2` is now a closeout-complete baseline.
So the next module queue should optimize for:

- real product quality
- assistant-mode honesty
- long-horizon memory quality
- multilingual trust
- operator explainability
- evaluation discipline

It should not reopen the whole architecture stack.

## Just Landed

### SNC-Milestone3-01a Explicit-Read And Evidence-Grounding V1

Outcome:

- SNC now detects a bounded evidence-grounding posture for explicit read / inspect / compare / list requests
- evidence-first turns now get a dedicated `Task posture` section and evidence-first system prompt intro
- session snapshot formatting now becomes more evidence-first for those turns
- durable-memory projection becomes more conservative on evidence-first turns

Why it matters:

- this directly targets the clearest remaining assistant-mode weakness exposed by external validation
- SNC now has a more honest way to let continuity step back when current materials should dominate

### SNC-Milestone3-02a Long-Horizon Memory Quality V1

Outcome:

- durable-memory promotion now suppresses transient operational cues across harvest, persist, and projection
- mixed operational auto-compaction summaries no longer get promoted into cross-session durable memory
- old transient operational entries are removed on the next durable-memory write instead of lingering indefinitely
- diagnostics now surface transient operational suppression explicitly

Why it matters:

- this is the first real `Milestone 3` step that improves cross-session memory trust instead of merely making memory larger
- SNC now separates current-task continuity from durable carry-forward more honestly

### SNC-Milestone3-04a Durable-Memory Operator Explainability V1

Outcome:

- durable-memory diagnostics now include bounded reasons for projected cues
- diagnostics now surface the strongest held-back cue when the projection limit suppresses it
- when no cue clears the current threshold, diagnostics now show the closest miss instead of only saying "nothing qualified"

Why it matters:

- this improves operator trust without turning SNC into a dashboard product
- it gives testing and future regression work a more falsifiable explanation surface

### SNC-Milestone3-01b Writing Output Discipline And Evidence-Honesty V1

Outcome:

- direct prose-drafting turns now get a dedicated `Writing output discipline` section
- direct drafting turns now shift the session snapshot into `Writing-draft mode`
- assistant-plan state is demoted to a secondary cue in direct drafting turns instead of remaining a primary prompt-facing field
- evidence-first wording now explicitly requires honest disclosure of uncovered requested items

Why it matters:

- this targets the multimodel retest signal that some models still leak process language or outline posture into story output
- it also tightens the explicit-read lane so SNC does not quietly imply full coverage when it only covered part of the requested material

### SNC-Milestone3-03a Multilingual Entity Memory Stability V1

Outcome:

- session-state continuity dedupe keys now use Unicode normalization
- durable-memory overlap now supports mixed-script / Han-character matching instead of staying ASCII-only
- transcript-shaping keeps visible multilingual surface text intact while internal dedupe gets stronger

Why it matters:

- this directly improves the part of SNC that decides whether multilingual continuity cues survive and project
- it is a bounded fix for mixed-script drift without building an identity platform

### SNC-Milestone3-02b Long-Horizon Memory Conflict Suppression V1

Outcome:

- current correction wording can now suppress contradicted durable cues at projection time
- suppressed cues remain inspectable and are no longer conflated with low-score misses
- durable-memory diagnostics now expose bounded conflict-suppression truth

Why it matters:

- this turns `current evidence wins` into real runtime behavior instead of only an architectural slogan
- it directly hardens multilingual name correction and other long-horizon memory conflict cases

## Module Order

### SNC-Milestone3-01 Explicit-Read And Evidence-Grounding Lane

Goal:

- make SNC better at explicit reading, extraction, listing, and material-priority tasks

Why now:

- current external validation shows this is the clearest real weakness left in assistant-mode work
- fixing this strengthens SNC outside writing, which is strategically more important than squeezing one more continuity trick out of the current lane

Likely scope:

- expand evidence-first detection beyond the initial narrow trigger set
- further reduce continuity-anchor overprojection when the task is explicitly read/compare/list/inspect
- improve response shaping for priority-list and evidence-coverage tasks
- add broader bounded tests for explicit-read and read-order fidelity

Do not broaden into:

- retrieval platform work
- giant document-analysis mode
- full second specialization

### SNC-Milestone3-02 Long-Horizon Memory Quality

Goal:

- strengthen both single-session continuity memory and cross-session durable agent memory

Why now:

- your long-term target is not just "better prompt continuity"
- current memory is already useful, but it is still clearly first-generation rather than finished
- this is the most important carry-forward system after explicit-read grounding

Likely scope:

- reduce stale or weak continuity anchors inside one long session
- improve durable-memory promotion quality
- improve durable-memory projection relevance for non-writing tasks too
- sharpen the boundary between current-session state and durable carry-forward
- add bounded tests for memory carry-forward quality and false-positive carry-forward

Do not broaden into:

- host memory-slot takeover
- remote/shared memory platform work
- giant memory management product surfaces

### SNC-Milestone3-03 Multilingual Stability And Entity Integrity

Goal:

- reduce Chinese and mixed-language quality tails

Why now:

- `0.1.1` fixed the obvious bilingual meta classification gap
- the remaining risk is now entity surface drift and subtler multilingual continuity noise

Likely scope:

- stronger multilingual meta/plan separation where needed
- mixed-script name/entity stabilization
- tests for Chinese entity consistency and multilingual assistant samples

Do not broaden into:

- broad localization work
- language-general NLP infrastructure

### SNC-Milestone3-04 Operator Explainability And Trust Surfaces

Goal:

- make worker and durable-memory behavior easier to understand from the product surface

Why now:

- `Milestone 2` made the runtime more capable
- `Milestone 3` should make it more legible

Likely scope:

- bounded reasons for durable-memory projection / non-projection
- clearer worker hold / ambiguous / stale explanations
- host-aligned guidance for inspect / validate / doctor flows
- small docs and diagnostics improvements where current wording is still engineering-heavy

Do not broaden into:

- dashboard/UI work
- host-core takeovers

### SNC-Milestone3-05 Evaluation Doctrine And Regression Net

Goal:

- make milestone quality measurable against the real failure modes now on the table

Why now:

- external validation is already proving more useful than more blind feature work
- future specialization work will need the same harness discipline

Likely scope:

- expand external suites for:
  - explicit-read
  - bilingual/meta
  - entity stability
  - mixed assistant/workflow tasks
- keep pressure and blind-judge lanes honest
- update milestone gates to reflect the new quality priorities

Do not broaden into:

- a benchmark vanity project
- huge infra churn inside the SNC repo

### SNC-Milestone3-06 Bounded Substrate Incubation

Goal:

- keep candidate shared helpers small, local, and evidence-driven

Why now:

- `Milestone 3` should prepare better future architecture decisions without pretending extraction is already justified

Likely scope:

- local helper cleanup only where it clearly supports:
  - replay determinism
  - explainability
  - state hygiene
- document which helpers still remain SNC-shaped

Do not broaden into:

- a branded specialization kernel
- extracting shared packages for aesthetics

## Practical Priority

If only the highest-value `Milestone 3` work lands, the best order is:

1. `SNC-Milestone3-03`
2. `SNC-Milestone3-01`
3. `SNC-Milestone3-02`
4. `SNC-Milestone3-04`
5. `SNC-Milestone3-05`

`SNC-Milestone3-06` should stay behind the quality tracks unless repeated implementation pressure proves it is necessary.

## Current Read After Recent Landed Slices

The currently landed `M3` slices are:

1. explicit-read / evidence-grounding posture
2. long-horizon memory quality
3. durable-memory operator explainability
4. writing output discipline and evidence honesty
5. multilingual entity memory stability
6. long-horizon memory conflict suppression
7. prompt-budget / section-ordering hardening
8. posture and guardrail hardening
9. evidence surface split
10. multilingual correction carry-forward
11. evidence truth and budget hardening
12. writing prompt-surface suppression

`M3` also now has:

- a canonical gate: `scripts/validate_snc_milestone3.ps1`
- a candidate package line: `data/releases/snc/openclaw-snc-0.2.0.tgz`

Given the current state, the next best work order is now closeout-oriented:

1. `SNC-Milestone3-Closeout`
   - validate the `0.2.0` candidate line against the expanded external suites
   - keep changes bounded to real regression fixes only
2. `SNC-Milestone3-04`
   - operator inspect truth and wording closeout if review or validation still exposes ambiguity
3. `SNC-Milestone3-05`
   - evaluation closeout and package/source comparison discipline
4. `Post-M3 Memory Track`
   - only after `M3` admission, continue long-horizon memory expansion on a new package line
