# kanban-game

getKanban 桌游的线上单人版：逐步操作、策略调整、多种分析视图。

## 技术栈

- **Monorepo**: pnpm workspace
- **Engine** (`packages/engine`): TypeScript + Vitest
- **Web** (`packages/web`): Vue 3 + Vite 8 + Pinia（后续 PR）

## 开发

```bash
pnpm install
pnpm test
pnpm build
pnpm dev
```

## 包结构

| 包 | 说明 |
|----|------|
| `@kanban-game/engine` | 游戏规则引擎（无 UI 依赖） |
| `@kanban-game/web` | Vue 前端应用 |

## 部署

构建产物位于 `packages/web/dist`，可部署到任意静态托管（Render Static Site、CNB Pages 等）。

后端 `packages/server` 需单独部署，并配置以下环境变量（见 `packages/server/.env.example`）：

- `FEISHU_APP_ID` / `FEISHU_APP_SECRET` — 飞书 OAuth 登录
- `FEISHU_REDIRECT_URI` — OAuth 回调地址
- `JWT_SECRET` — 会话签名密钥
- `WEB_ORIGIN` — 前端地址（CORS 与 OAuth 回跳）
- `COOKIE_SECURE` — 生产 HTTPS 下设为 `true`

生产环境建议 Web 与 API 同域（如 `/api` 反代），以便 HttpOnly Cookie 正常工作。
