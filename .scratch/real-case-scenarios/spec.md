# Real-Case Project Suite (Pi Kernel)

九个**完整 Project** 的真实案例验收套件。每个案例从干净数据库创建独立 Project，使用 **Pi 真实 Kernel** 执行 Work Item，以 **Project 完成**（Work Item completed + Verification 通过 + Merge 进受保护分支）为验收标准。

## 前置条件

```bash
# 安装 Pi CLI（@earendil-works/pi-coding-agent）并配置 Provider API Key
npm install -g @earendil-works/pi-coding-agent
# 或项目本地：npm install --prefix .tools @earendil-works/pi-coding-agent

pi --version
export PI_BIN=pi   # 或指向本地 bin，如 .tools/node_modules/.bin/pi
pi auth check      # 确认 Provider 凭证可用
```

未安装 Pi 时，测试会自动 skip，API 调用会返回明确错误。

## 运行

```bash
pnpm db:init
pnpm test:real-cases
# 或
pnpm test -- packages/application/src/scenarios/real-cases.scenario.test.ts
```

```bash
pnpm dev
curl -X POST http://127.0.0.1:3001/demos/real-cases
curl -X POST http://127.0.0.1:3001/demos/real-cases -H 'Content-Type: application/json' -d '{"caseId":"case-01"}'
```

## Project 完成标准

每个案例的 Project 必须满足：

1. Effective Specification 已发布
2. Work Graph 与 Agent Membership 已就位
3. 所有 `requiredCompletedKeys` 对应的 Work Item 经 **Pi Kernel** 执行成功
4. Verification Profile 在 worktree 上通过
5. Merge Candidate 进入受保护 `main` 分支
6. 案例特有的平台断言（Decision、权限、stale_spec 等）通过

## 案例列表

| ID | 类别 | Project 交付物 |
|----|------|----------------|
| case-01 | 业务冲突协商 | `docs/compromise-plan.md` |
| case-02 | 业务冲突协商 | `docs/negotiation-bundle.md` |
| case-03 | 并行调研 | `research/branch-*.md` 合并后 + `docs/research-synthesis.md` |
| case-04 | DAG 编排 | `pipeline/*.txt` 全链路 |
| case-05 | 安全权限 | `docs/security-audit.md` |
| case-06 | 长链路推理 | `docs/causal-chain.md` |
| case-07 | 上下文污染 | `docs/context-v1.md` + stale 阻断 |
| case-08 | 无限循环熔断 | 探针取消 + `docs/circuit-breaker.md` |
| case-09 | 信息缺失 | System Agent 准入 + `docs/ml-evaluation.md` |

## 架构

```text
scenarios/
  pi-env.ts              Pi 可用性检测
  project-runner.ts      完整 Project 生命周期 + Pi 执行 + Merge
  project-types.ts
  projects/
    definitions.ts       9 个 Project 定义
    hooks.ts             案例特有平台步骤
  real-cases/
    case-runners.ts
    index.ts
```

Mock Kernel 仅用于 OAuth 演示与单元测试；**真实案例不接受 Mock 作为验收 Kernel**。
