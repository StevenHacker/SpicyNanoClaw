# Feature Map

## SNC 当前已经真的有的能力

### 1. 连续性核心

- brief / ledger / packet 注入
- per-session state 持久化
- `specializationMode: auto / general / writing`
- 普通助手模式与写作模式的边界保护

### 2. Durable Memory

- 插件自有 durable memory 存储
- bounded harvest / projection
- pruning / hygiene hardening
- 不接管宿主 memory slot

### 3. Transcript / Hook Hygiene

- bounded transcript shaping
- tool-result replacement preview
- hook 目标已明确：
  - `before_message_write`
  - `tool_result_persist`
  - `session_end`
  - `subagent_spawned`
  - `subagent_ended`

### 4. Worker Lane

- worker policy utility
- worker execution adapter scaffold
- worker runtime fold-back
- worker lifecycle bookkeeping
- controller launch intent derivation
- replay governance / event hygiene
- real `sessions_spawn` result fold-back
- `Worker launch lane` projection
- `Worker diagnostics` projection
- bounded worker-state hygiene

### 5. 交付面

- `openclaw-snc-0.1.0.tgz` release-candidate 包
- canonical milestone validation script
- release-facing README
- clean-host delivery rehearsal gate

## 当前是“活的一刀”，但还没封口的能力

### Worker Controller Launch

已经有：

- 明确 helper cue 才派生 launch intent
- queued launch expectation 持久化
- later-turn launch guidance

还欠：

- follow-up / reply visibility polish
- ambiguous recovery wording
- final operator envelope wording

### Durable Memory Explainability

已经有：

- bounded continuity gain
- hygiene hardening
- config controls
- diagnostics visibility

还欠：

- 继续小步 refinement
- 真遇到 operator failure mode 再扩，不提前虚胖

## 明确 defer 的东西

- 宿主 memory-slot takeover
- 通用 worker scheduler
- 默认递归 swarm
- 大而全的 public helper surface
- 把 SNC 做成 broad MCP/control-plane 产品
- 大规模改写 OpenClaw internals

## 一句话判断

SNC 现在已经不是概念插件了。
它已经有 continuity、memory、worker、packaging 四条真骨架，只是 worker lane 和 clean-host 交付还没彻底收口。
