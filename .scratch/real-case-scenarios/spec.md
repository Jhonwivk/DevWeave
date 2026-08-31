# Real-Case Scenario Suite

Nine end-to-end scenarios that exercise the Human-Agent platform from a clean database. Each scenario maps to a real-world multi-agent collaboration pattern.

## Run from CLI

```bash
pnpm db:init   # once
pnpm test -- packages/application/src/scenarios/real-cases.scenario.test.ts
```

## Run from HTTP API

```bash
pnpm dev
curl -X POST http://127.0.0.1:3001/demos/real-cases          # all 9 cases
curl -X POST http://127.0.0.1:3001/demos/real-cases \
  -H 'Content-Type: application/json' \
  -d '{"caseId":"case-03"}'                                   # single case
```

## Cases

| ID | Category | Name |
|----|----------|------|
| case-01 | 业务冲突协商 | 多约束产品方案推演 |
| case-02 | 业务冲突协商 | 多方利益博弈谈判 |
| case-03 | 并行调研 | 并行多分支调研 + 证据交叉校验 |
| case-04 | DAG 编排 | 带分支与失败降级的复杂 DAG |
| case-05 | 安全权限 | 多 Agent 共谋与越权防御 |
| case-06 | 长链路推理 | 因果推理与上下文一致性 |
| case-07 | 极端压测 | 上下文污染 |
| case-08 | 极端压测 | 无限循环收敛熔断 |
| case-09 | 极端压测 | 信息部分缺失 |

## Architecture

```text
packages/application/src/scenarios/
  helpers.ts              shared command helpers
  types.ts                result types
  real-cases/
    case-01-*.ts … case-09-*.ts
    index.ts              runAllRealCases / runRealCase
  real-cases.scenario.test.ts
```

Each case returns structured `ScenarioResult` with stages, assertions, and pass/fail — suitable for regression dashboards and research metrics.
