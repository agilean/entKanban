import { Hono } from 'hono';
import { requireAuth, type AuthVariables } from '../auth/middleware.js';
import type { ReplayDatabase } from '../db.js';
import {
  addWasteComment,
  createWasteEntry,
  getWasteLeaderboard,
  joinWasteTeam,
  listWasteEntries,
  upvoteWasteEntry,
} from '../wasteDb.js';

export function createWasteRoutes(db: ReplayDatabase): Hono<{ Variables: AuthVariables }> {
  const routes = new Hono<{ Variables: AuthVariables }>();

  routes.get('/leaderboard', (c) => {
    const limit = Number(c.req.query('limit') ?? '50');
    const entries = getWasteLeaderboard(db, Number.isFinite(limit) ? limit : 50);
    return c.json({ entries });
  });

  routes.get('/entries', (c) => {
    const limit = Number(c.req.query('limit') ?? '20');
    const offset = Number(c.req.query('offset') ?? '0');
    const userId = c.get('userId') as string | undefined;
    const entries = listWasteEntries(db, {
      limit: Number.isFinite(limit) ? limit : 20,
      offset: Number.isFinite(offset) ? offset : 0,
      currentUserId: userId ?? null,
    });
    return c.json({ entries });
  });

  routes.post('/entries', async (c) => {
    const body = (await c.req.json()) as { nickname?: string; description?: string };
    if (!body.nickname?.trim()) {
      return c.json({ error: '请填写花名' }, 400);
    }
    if (!body.description?.trim()) {
      return c.json({ error: '请描述浪费现象' }, 400);
    }
    try {
      const entry = createWasteEntry(db, {
        nickname: body.nickname,
        description: body.description,
      });
      return c.json({ entry }, 201);
    } catch (error) {
      const message = error instanceof Error ? error.message : '提交失败';
      return c.json({ error: message }, 400);
    }
  });

  routes.post('/entries/:id/upvote', requireAuth, (c) => {
    const userId = c.get('userId');
    const wasteId = c.req.param('id') ?? '';
    try {
      const result = upvoteWasteEntry(db, userId, wasteId);
      return c.json(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : '顶失败';
      return c.json({ error: message }, 400);
    }
  });

  routes.post('/entries/:id/comments', requireAuth, async (c) => {
    const userId = c.get('userId');
    const wasteId = c.req.param('id') ?? '';
    const body = (await c.req.json()) as { content?: string };
    if (!body.content?.trim()) {
      return c.json({ error: '评论内容不能为空' }, 400);
    }
    try {
      const comment = addWasteComment(db, userId, wasteId, body.content);
      return c.json({ comment }, 201);
    } catch (error) {
      const message = error instanceof Error ? error.message : '评论失败';
      return c.json({ error: message }, 400);
    }
  });

  routes.post('/entries/:id/team', requireAuth, (c) => {
    const userId = c.get('userId');
    const wasteId = c.req.param('id') ?? '';
    try {
      const result = joinWasteTeam(db, userId, wasteId);
      return c.json(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : '加入战队失败';
      return c.json({ error: message }, 400);
    }
  });

  return routes;
}
