# 01: 原生运行健康路径

**What to build:** 让平台开发者在不使用 Docker 的本地环境中启动 Web、Server、Worker 和 PostgreSQL，并从一个可访问页面确认所有组件是否可用。

**Blocked by:** None (can start immediately).

**Status:** resolved

- [x] 按运行说明可在干净环境中完成依赖检查、数据库初始化并启动 Web、Server 和 Worker。
- [x] 健康页面能够分别显示 Server、Worker 和 PostgreSQL 的可用状态，依赖缺失时提供可操作的错误信息。
- [x] 严格类型检查、lint 和基础自动测试可通过统一命令运行并全部通过。

## Answer

本地原生骨架已落地：`pnpm check-env`、`pnpm db:init`、`pnpm dev` 可启动 Web / Server / Worker，健康页 `http://127.0.0.1:5173` 分别展示三分量状态。`pnpm check` 运行 typecheck、lint 和测试。
