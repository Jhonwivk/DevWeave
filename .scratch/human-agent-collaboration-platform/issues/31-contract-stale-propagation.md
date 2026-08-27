# 31: Contract 依赖与 stale 传播

**What to build:** 让 Specification 或 Contract 版本变化主动定位受影响 Consumer，并要求其在继续工作前处理过期依据。

**Blocked by:** 09: 探索工作与 Specification 失效传播; 28: 发布与采用版本化 Artifact; 30: 构建权威 Context Package

**Status:** ready-for-agent

- [ ] 平台维护 Artifact/Contract producer、consumer、adopted version 与 Work Item 的依赖关系。
- [ ] published Contract 被 supersede 后，仍采用旧版本的 Work Item/Execution 被标记 stale 并收到原因。
- [ ] Human 可以选择暂停、Replan、采用新版本或重新验证，每种结果都更新 Context 版本并留下 Event。
- [ ] 自动测试覆盖 publish、adopt、supersede、依赖失效和多级 stale 传播。

