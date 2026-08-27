# Human-Agent Collaborative Software Engineering Platform

本地原生运行的 Human-Agent 协作工程平台。第一阶段不使用 Docker，也不拆微服务。

## 依赖

- Node.js 22 或更高版本
- pnpm 9（可用 `corepack enable` 启用）
- Git
- PostgreSQL 16（Homebrew 或同等本地安装，不要用 Docker）

## 干净环境启动

```bash
corepack enable
pnpm install
cp .env.example .env
pnpm check-env
pnpm db:init
pnpm dev
```

然后打开 http://127.0.0.1:5173 ，健康页面应分别显示 Server、Worker 和 PostgreSQL 的可用状态。

macOS 安装 PostgreSQL：

```bash
brew install postgresql@16
brew services start postgresql@16
echo 'export PATH="$(brew --prefix postgresql@16)/bin:$PATH"' >> ~/.zshrc
```

如果 `pnpm check-env` 失败，按它打印的下一条命令修复后再继续。`DATABASE_URL` 未设置时，复制 `.env.example` 为 `.env` 后运行 `pnpm db:init`。

## 质量检查

```bash
pnpm check
```

该命令依次运行严格类型检查、lint 和自动测试，需要本机 PostgreSQL 可用，且工作区有 `.env`（可从 `.env.example` 复制后执行 `pnpm db:init`）。也可以单独运行：

```bash
pnpm typecheck
pnpm lint
pnpm test
```
