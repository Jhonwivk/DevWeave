# 33: 只呈现待行动事项的 Inbox

**What to build:** 让 Human 在一个站内 Inbox 中看到真正需要处理的协作事项，并直接进入对应操作上下文。

**Blocked by:** 13: Capability Gap 与 System-Generated Agent qualification; 15: Agent 权限与临时 Permission Request; 21: 失败、超时与预算处理; 31: Contract 依赖与 stale 传播; 32: 分层 Timeline 与 Causality Graph

**Status:** ready-for-agent

- [ ] Inbox 聚合 Capability Gap、Permission Request、failure、budget、unknown 和 stale 等当前可行动事项。
- [ ] 每项通知展示原因、风险、关联 Project/Work Item/Execution 和允许的 Human 操作。
- [ ] 已处理、已失效或被 supersede 的事项自动离开待处理视图，但历史仍可追溯。
- [ ] 普通 Event、日志和页面访问不进入 Inbox，自动测试验证去重和状态同步。

