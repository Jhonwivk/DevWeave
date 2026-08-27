# 15: Agent 权限与临时 Permission Request

**What to build:** 让 Project Sponsor 审核 Agent Membership 的最小有效权限，并处理有范围和期限的临时 Permission Request，同时保留不可 override 的平台底线。

**Blocked by:** 10: Human Project Membership 与 Team View

**Status:** ready-for-agent

- [ ] 有效权限严格取 Agent 声明需求、Project Policy 上限和 Membership 批准权限的交集。
- [ ] Agent Actor 可以提交带动作、资源范围、理由和期限的 Permission Request，Human 可批准或拒绝。
- [ ] 临时权限到期后自动失效，使用和审批过程均成为 Traceable Operation。
- [ ] 宿主敏感路径、密钥保护、历史不可篡改和受保护分支规则不能通过普通 override 绕过。

