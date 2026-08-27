# 40: OAuth Agent 失败恢复场景

**What to build:** 在 OAuth 协作中主动制造 Agent failure，并由 Human 使用 Intervention、Checkpoint 或新 Execution 恢复到可验证结果。

**Blocked by:** 21: 失败、超时与预算处理; 27: 比较 Execution Branch 并选择候选; 39: 正常 OAuth 协作场景

**Status:** ready-for-agent

- [ ] 验收场景可确定性触发一个 Agent failure，并在 UI 显示事实、影响和可用恢复操作。
- [ ] Human 可以从最近 Checkpoint 创建 exact 或明确标注的 reconstructed branch，或启动新的 Execution。
- [ ] 恢复路径完成 Verification 和 merge，原失败 Execution 与未选择分支保持可回溯。
- [ ] 自动测试证明失败不会错误完成 Work Item、重复副作用或破坏共享分支。

