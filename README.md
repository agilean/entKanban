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

### Render（推荐：单服务同域）

仓库已包含 [`render.yaml`](render.yaml)。在 Render Dashboard：

1. **New → Blueprint** → 连接 `adwu73/entKanban` → **Deploy Blueprint**
2. 部署完成后记下服务 URL，例如 `https://entkanban.onrender.com`
3. 在 Render 服务 **Environment** 中填写 `FEISHU_APP_ID`、`FEISHU_APP_SECRET`
4. 在飞书开放平台 **重定向 URL** 添加：`https://<你的域名>/api/auth/feishu/callback`

单服务同时提供 Vue 前端与 `/api` 后端；`RENDER_EXTERNAL_URL` 会自动用于 OAuth 回调（无需手动填 `WEB_ORIGIN`）。

> SQLite 在 Render 免费实例上为 ephemeral，重新部署后数据会丢失。

### 其他托管

前端构建产物：`packages/web/dist`。若前后端分离部署，需配置 `VITE_API_BASE` 指向 API，并单独部署 `packages/server`。

环境变量见 `packages/server/.env.example`。
