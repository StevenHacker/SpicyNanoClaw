# Claim Board

## 读法

这不是原 dispatcher 的 claim 面板副本。
这是秘书视角的当前工作盘面，只保留你真正需要盯的状态。

## 已完成的研究主干

- `OC-01 ~ OC-15`：OpenClaw 运行时、插件宿主、session/channel/gateway、capability、config/security/ops、UI、memory、MCP/tool、runner timing、plugin SDK、worker invocation、plugin delivery、completion delivery、restart matrix 等主干包，已形成可引用文档。
- `CC-01 ~ CC-13`：Claude Code 的 orchestration、pressure/compaction、memory lifecycle、command shell、service layer、governance、secondary intelligence、subagent infra、delegation control 等 donor 包，已形成可引用文档。
- `Milestone 1`：SNC release candidate 已落地，包含真实 tarball、README、manifest、package 边界和 canonical gate。

## 已落地的工程包

- `SNC-M2-00`
  - `general-assistant compatibility guard`
  - 已落地
- `SNC-M2-01a`
  - `controller launch intent and projection`
  - 已落地
- `SNC-M2-01b`
  - `controller launch replay governance and event hygiene`
  - 已落地
- `SNC-M2-01c`
  - `worker launch result host wiring`
  - 已落地
- `SNC-M2-02a`
  - `worker diagnostics and state hygiene`
  - 已落地
- `SNC-M2-03a`
  - `clean-host delivery rehearsal`
  - 已落地
- `SNC-M2-04a`
  - `durable memory diagnostics and controls`
  - 已落地

## 当前优先队列

1. `SNC-M2-01` follow-up
   - 把 controller-issued helper launch lane 从“能跑”补到“稳定、可解释、可 follow-up 使用”
2. `SNC-M2-03`
   - delivery/docs/operator wording 后续打磨
3. `SNC-M2-04`
   - durable memory refinement-only 收尾
4. `SNC-M2-02` follow-up
   - 只在新证据说明当前诊断还不够时再补刀
5. `SNC-M2-05`
   - opt-in helper-tool pilot，优先级靠后

## 当前不该分心的方向

- 抢宿主 scheduler ownership
- 默认递归 swarm
- 过早扩大 MCP / control-plane 暴露面
- 把 helper tools 提前做成大而全产品面

## 结论

现在这套盘面已经不是“几个线程随手乱挖”。
它已经有明确主干、明确工程队列、明确 defer 区。
接下来拼的是落地质量，不是再发明新词。
