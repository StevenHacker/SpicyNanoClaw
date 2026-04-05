# Evidence Matrix

| 结论 | 证据来源 | 级别 |
| --- | --- | --- |
| `Milestone 1` 已形成真实 release candidate，而不是只停在设计层。 | `research/101_snc_milestone1_release_candidate.md`；`data/releases/snc/openclaw-snc-0.1.0.tgz`；`scripts/validate_snc_milestone1.ps1` | Confirmed |
| SNC 已经是 bounded plugin，而不是宿主侵入式改造。 | `research/00_overview.md`；`research/102_snc_milestone2_program.md`；`extensions/snc/README.md` | Confirmed |
| 当前主 doctrine 仍然是“优先热插拔，只在宿主真挡路时才改宿主”。 | `research/00_overview.md`；`research/102_snc_milestone2_program.md` | Confirmed |
| Worker lane 已经从纯基础设施跨进产品可见阶段。 | `research/117_snc_controller_launch_path_v1.md`；`research/118_snc_worker_diagnostics_state_hygiene_v1.md`；`extensions/snc/src/engine.ts` | Confirmed |
| SNC 已具备 bounded durable memory，不依赖接管宿主 memory slot。 | `research/20_evidence_matrix.md`；`research/102_snc_milestone2_program.md`；`extensions/snc/src/durable-memory.ts` | Confirmed |
| `Milestone 2` 当前最高优先级不是再辩架构，而是把 launch lane、delivery rehearsal、memory diagnostics 收口。 | `research/102_snc_milestone2_program.md`；`research/103_snc_module_workorders_round3.md` | Confirmed |
| clean-host delivery 已有真实 rehearsal，而不是停留在 README 想象。 | `research/125_snc_clean_host_delivery_rehearsal_v1.md`；`scripts/validate_snc_clean_host_rehearsal.ps1` | Confirmed |
| durable memory 已具备 bounded operator controls 与 diagnostics，可解释性明显提升。 | `research/132_snc_durable_memory_diagnostics_controls_v1.md`；`extensions/snc/src/durable-memory.ts`；`extensions/snc/src/engine.ts` | Confirmed |
| worker lane 已进入 real host-result fold-back 阶段，不再只是 projected guidance。 | `research/139_snc_controller_launch_replay_governance_v1.md`；`research/146_snc_worker_launch_result_host_wiring_v1.md`；`extensions/snc/src/hook-scaffold.ts`；`extensions/snc/src/worker-execution.ts` | Confirmed |
| OpenClaw 和 Claude Code 两侧的主干拆解已经足够支撑下一阶段实现，不再是盲飞。 | `research/53_external_thread_claims.md`；`research/20_evidence_matrix.md`；`research/40_parallel_execution_board.md` | Confirmed |
| 目前并不存在“应该立刻做成通用 scheduler / swarm 平台”的证据，贸然扩张大概率是自找麻烦。 | `research/102_snc_milestone2_program.md`；`research/103_snc_module_workorders_round3.md` | High confidence |
| 现在最该被秘书线程持续维护的，不是新的大而全理论，而是 claim、feature、change、evidence 这几本硬账。 | 当前多线程文档现状；`research/53_external_thread_claims.md`；`research/40_parallel_execution_board.md` | High confidence |
