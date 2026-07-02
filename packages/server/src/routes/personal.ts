import { Hono } from 'hono';
import { requireAuth, type AuthVariables } from '../auth/middleware.js';
import type { ReplayDatabase } from '../db.js';
import {
  getPersonalLeaderboard,
  getUserPointsSummary,
} from '../personalPointsDb.js';

export function createPersonalRoutes(db: ReplayDatabase): Hono<{ Variables: AuthVariables }> {
  const routes = new Hono<{ Variables: AuthVariables }>();

  routes.get('/leaderboard', (c) => {
    const limit = Number(c.req.query('limit') ?? '50');
    const entries = getPersonalLeaderboard(db, Number.isFinite(limit) ? limit : 50);
    return c.json({ entries });
  });

  routes.get('/me', requireAuth, (c) => {
    const userId = c.get('userId');
    const summary = getUserPointsSummary(db, userId);
    if (!summary) {
      return c.json({ error: 'User not found' }, 404);
    }
    return c.json({ summary });
  });

  return routes;
}
