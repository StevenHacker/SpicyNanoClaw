# SNC Milestone 3 Program

## Purpose

This document defines what `Milestone 3` is for.

`Milestone 1` proved SNC could ship as a bounded OpenClaw plugin.
`Milestone 2` proved SNC could become a stronger specialization layer:

- general-assistant compatible
- bounded worker/controller aware
- durable-memory controlled
- clean-host deliverable
- externally validated with real gains over baseline

`Milestone 3` should not try to become a giant new architecture phase.
It should turn SNC from a strong bounded specialization into a more trustworthy and benchmarkable specialization product.

The right question for `Milestone 3` is no longer:

- can SNC land on host-safe seams

The right question is:

- can SNC become reliably better in the places that matter, while staying honest about where it is still not the best choice

## Current Entry State

At the start of `Milestone 3`:

- `Milestone 2` closeout gate is green
- the plugin package is real, installable, and validated through clean-host rehearsal
- `0.1.1` package validation is now archived as a stable external comparison anchor
- worker launch, follow-up, lifecycle bookkeeping, and bounded diagnostics are live
- durable-memory controls and diagnostics are live
- general-assistant compatibility guard is live
- bilingual meta classification and README/config drift patches have already landed in `0.1.1`

External validation now says three important things at once:

1. SNC has real gains:
   - longform continuity is materially stronger than baseline
   - assistant grounding is stronger than baseline overall
2. SNC is not universally better:
   - explicit-read / priority-list tasks can still favor baseline
3. SNC still has quality tails:
   - Chinese entity and surface stability are not fully solved
   - some operator understanding still depends on reading engineering artifacts rather than simple product-facing truth

That is a healthy entry state for `Milestone 3`.
The system is strong enough to optimize honestly now.

## Milestone 3 Intent

The intent is:

1. make SNC better at reading and evidence discipline, not just remembering and projecting continuity
2. make long-horizon memory stronger in both:
   - single-session continuity memory
   - cross-session agent-level durable memory
3. make multilingual continuity feel trustworthy instead of "mostly works"
4. make worker and memory behavior easier for operators to understand without spelunking raw state
5. turn external validation from a one-off success snapshot into a repeatable quality doctrine
6. collect stronger evidence for future specialization-kernel work without prematurely extracting shared code

## What `Milestone 3` Should Feel Like

If `Milestone 3` succeeds, the visible effect should be:

- in longform work:
  - fewer Chinese naming / surface drift cases
  - less meta/plan leakage
  - stronger continuity without fake confidence
- in assistant and development work:
  - better explicit reading of user-provided material
  - better priority-list fidelity
  - less over-attachment to continuity anchors when the task is clearly evidence-first
- in long-horizon memory behavior:
  - stronger retention of the right things
  - fewer weak or accidental carry-forwards
  - cleaner separation between current-session continuity and durable agent memory
- for operators:
  - clearer reasons for why worker lanes, memory projections, or replay holds appeared
  - fewer "it worked, but I cannot tell why" moments

## Core Development Tracks

### 1. Explicit-Read And Evidence-Grounding Lane

This should be the highest-value `Milestone 3` track.

`Milestone 2` proved SNC is stronger at continuity and zero-shot grounding.
The main exposed weakness is that SNC can still overvalue continuity framing when the user explicitly wants:

- reading
- extraction
- listing
- coverage of provided material
- evidence-first answers

Target outcome:

- SNC should detect and honor explicit read / inspect / list / compare requests more faithfully
- projected continuity state should help reading tasks, not compete with them
- assistant-mode gains should become less "good overall" and more "good on the hard boring tasks too"

This is the cleanest next improvement because it helps:

- everyday assistant work
- development and ops tasks
- future review/compliance style specialization experiments

### 2. Long-Horizon Memory Quality

This should be treated as a first-class `Milestone 3` track, not a side note under explainability.

Current memory is good enough to justify `Milestone 2`, but not good enough to be called "fully optimized" for your longer ambition.

What is already real:

- session-local continuity memory is strong enough to produce real longform and multi-turn gains
- cross-session durable memory exists and is usable
- hygiene, pruning, and bounded projection exist

What is still first-generation:

- durable harvest is still mostly driven by structured SNC artifacts rather than richer agent-memory judgments
- durable projection is still a conservative cue lane, not a stronger agent-memory contract
- current memory is plugin-local continuity memory first, not a mature agent-grade memory system
- session continuity can still over-anchor the wrong thing on explicit-read tasks

Target outcome:

- stronger single-session continuity memory without over-projecting stale or irrelevant anchors
- stronger cross-session durable memory that feels more like agent memory and less like a helpful continuity cache
- clearer separation between:
  - current-session working state
  - durable cross-session carry-forward
- memory quality gains that help both writing and non-writing assistant work

This should stay host-safe and plugin-first.
It should not turn into host memory-slot capture or a generic memory platform.

### 3. Multilingual Stability And Entity Integrity

`0.1.1` fixed the most obvious bilingual meta and docs drift.
That does not mean multilingual quality is done.

The next quality bar is:

- entity surface stability
- mixed Chinese/English naming stability
- reduced meta/plan bleed in multilingual assistant turns
- better continuity under real multilingual longform pressure

Target outcome:

- Chinese and mixed-language longform should stop feeling like the "best effort" lane
- multilingual assistant work should become a supported path, not an accidental bonus

This should stay quality-first, not turn into a giant internationalization program.

## Progress So Far

The first two bounded `Milestone 3` slices are now landed:

1. explicit-read / evidence-grounding posture
   - explicit read / inspect / list tasks now get an evidence-first posture
   - continuity and durable memory are demoted to secondary support in those turns

2. long-horizon memory quality v1
   - transient operational cues are now suppressed across durable-memory harvest, persist, and projection
   - mixed operational auto-compaction summaries no longer get promoted into cross-session durable memory
   - diagnostics now surface transient operational suppression explicitly

This means `Milestone 3` is no longer only a plan.
It already has two live quality tracks in code:

- evidence discipline
- memory trust discipline

The third bounded slice is now also landed:

3. durable-memory operator explainability v1
   - durable-memory diagnostics now show bounded "why now" reasons for projected cues
   - diagnostics also surface the strongest held-back cue when projection is limited or when no entry clears the current threshold
   - operator truth is now easier to read without pretending SNC exposes a full ranking trace

The fourth bounded slice is now also landed:

4. writing output discipline v1
   - direct prose-drafting turns now get a dedicated writing-output discipline section
   - direct drafting turns now demote assistant-plan state from primary prompt-facing active state
   - evidence-first wording now explicitly requires honest partial-coverage disclosure when not every requested item could be inspected

The fifth bounded slice is now also landed:

5. multilingual entity memory stability v1
   - session continuity dedupe keys now use Unicode normalization
   - durable-memory overlap is no longer ASCII-only and now supports Han-character bigram overlap
   - visible transcript surface stays readable while internal multilingual dedupe gets stronger

The sixth bounded slice is now also landed:

6. long-horizon memory conflict suppression v1
   - contradicted durable cues are now suppressed at projection time when fresher evidence explicitly corrects them
   - suppression is inspectable and distinct from below-threshold or held-back-by-limit cases
   - current evidence now wins more honestly without destructively deleting older memory

The seventh bounded slice is now also landed:

7. prompt-budget / section-ordering hardening v1
   - SNC sections now have explicit budget classes and shrink groups
   - packet-dir residue and diagnostics now shrink before higher-trust continuity sections
   - truthful budget notes can now surface when optional context is trimmed
   - UTF-8 truncation is now loop-safe under tight prompt budgets

The eighth bounded slice is now also landed:

8. posture and guardrail hardening v1
   - current-turn requests now outrank stale history for evidence and prose-mode detection
   - evidence-grounding turns no longer surface `latestAssistantPlan` as a top-level active-state field
   - durable-memory correction suppression now preserves guardrails that prohibit the rejected alias
   - reviewer-confirmed M3 tails now have direct regression coverage

The ninth bounded slice is now also landed:

9. evidence surface split v1
   - evidence-grounding turns now split prompt-facing support into `Current-task support` and `Historical continuity support`
   - current-task support is now the critical lane, while historical continuity becomes shrink-first under budget pressure
   - explicit-read turns now have a clearer structural distinction between current evidence support and older continuity residue

The tenth bounded slice is now also landed:

10. multilingual correction carry-forward v1
   - correction-supporting durable cues now get explicit ranking help instead of relying only on stale-form suppression
   - evidence-mode historical support now filters stale rejected aliases while preserving correction guardrails
   - secondary recent-message carry-forward now follows the same correction-aware filtering

The eleventh bounded slice is now also landed:

11. evidence truth and budget hardening v1
   - `Current-task support` now renders current-turn directive truth instead of merged historical directives
   - evidence historical support now prefers the newest retained continuity cues
   - historical continuity support stays shrink-first without being prematurely capped by diagnostics-group budget

The twelfth bounded slice is now also landed:

12. writing prompt-surface suppression v1
   - writing-draft prompt surfaces now suppress report-style assistant residue instead of carrying it into direct drafting turns
   - writing output discipline now explicitly forbids status-report / handoff / checklist language inside draft mode
   - evidence-first wording now explicitly calls out missing or inaccessible materials before partial-coverage fallback

`Milestone 3` now also has a canonical closeout gate and package line:

- `scripts/validate_snc_milestone3.ps1`
- `data/releases/snc/openclaw-snc-0.2.0.tgz`

That means `M3` is no longer only a source-line hardening track.
It now has a real candidate package and a repeatable admission gate.

### 4. Operator Explainability And Trust Surfaces

`Milestone 2` made worker and durable-memory behavior much more real.
`Milestone 3` should make that behavior easier to understand.

Target outcome:

- clear bounded explanations for:
  - why a durable-memory item projected or did not project
  - why a worker launch was held, replay-blocked, or marked ambiguous
  - why a worker follow-up is still waiting or considered stale
- better host-aligned validation / inspect / doctor guidance where current docs are still too engineering-heavy

This is not a dashboard milestone.
It is a trust and operability milestone.

### 5. Evaluation Doctrine And Regression Net

`Milestone 2` benefited from external validation more than from another blind feature push.
`Milestone 3` should turn that lesson into doctrine.

Target outcome:

- formal suites for:
  - explicit-read / priority-list tasks
  - bilingual/meta stability
  - entity consistency
  - mixed assistant/workflow tasks that are not writing-first
- clearer carry-forward of:
  - blind judging
  - pressure probes
  - effect probes
- milestone gates that measure the things that actually hurt product trust

This track is strategically important because future specialization work will need the same discipline.

### 6. Bounded Post-M2 Substrate Incubation

`Milestone 3` is not the moment to declare a specialization kernel.
It is, however, the right time to start incubating stronger evidence about which helpers are actually structural.

Target outcome:

- keep potential shared helpers small and local
- only incubate helpers that stay domain-neutral:
  - replay determinism
  - state hygiene
  - operator-truth helpers
  - bounded reduction/explainability helpers
- do not extract or brand them as shared substrate yet

This keeps the program aligned with the accepted extraction doctrine:

- prove second specialization pressure first
- extract later only if structural reuse is real

## Explicit Non-Goals

`Milestone 3` does not aim to:

- turn SNC into a generic memory platform
- turn SNC into a general orchestration platform
- promise exact worker resume or scheduler semantics that the host does not guarantee
- fork OpenClaw to make SNC-shaped behavior the new host default
- declare a shared specialization kernel before a second specialization proves the need
- mistake current plugin-local durable memory for a finished agent-memory architecture
- solve every multilingual quality issue in one milestone

## Recommended Module Order

The right order is:

1. explicit-read / evidence-grounding improvements
2. long-horizon memory quality
3. multilingual stability and entity integrity
4. operator explainability and trust surfaces
5. evaluation-suite expansion and milestone gating
6. only then any bounded substrate-incubation cleanup

This order is deliberate.
It biases toward user-visible quality first, architecture extraction last.

## Exit Bar For `Milestone 3`

`Milestone 3` should be considered closed when these are true:

1. SNC materially improves its explicit-read / evidence-first behavior without regressing longform continuity wins.
2. SNC materially improves both:
   - session-local continuity memory quality
   - cross-session durable agent-memory quality
   without drifting into a generic memory platform.
3. Chinese and mixed-language regression cases are reduced enough that multilingual quality is no longer a known tail risk for admission.
4. Worker and durable-memory behavior are explainable through bounded operator-facing truth, not mostly through engineering context.
5. The evaluation harness can repeatedly detect the kinds of regressions that matter now:
   - explicit-read misses
   - memory carry-forward misses
   - bilingual meta/entity drift
   - continuity regressions
   - pressure regressions
6. Any new reusable helpers remain clearly incubating and clearly non-kernel.

## Strategic Read

`Milestone 3` should be the milestone where SNC stops being judged mainly as:

- "the writing plugin that got surprisingly strong"

and starts being judged as:

- "the first specialization that is both strong and disciplined enough to teach the next one how to be built"
