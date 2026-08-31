# 01: Assignment Policy 配置与版本化

**What to build:** 让 Project Owner 创建、更新和查看版本化的 Assignment Policy，声明 capability 匹配规则、风险阈值和 tie-break 偏好。

**Blocked by:** None (Phase 1 #14 resolved).

**Status:** ready-for-agent

- [ ] Project Owner 可通过 Command 创建 Assignment Policy，包含版本号、生效范围和规则列表。
- [ ] Policy 更新产生新版本而不是覆盖历史；旧版本可查询但不再用于新 suggestion。
- [ ] 未配置 Policy 时平台行为与 Phase 1 手动 assignment 完全一致。
- [ ] Policy 配置变更是 Traceable Operation，出现在 Timeline。
