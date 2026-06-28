import { Hono } from 'hono';
import { requireAuth, type AuthVariables } from '../auth/middleware.js';
import type { ReplayDatabase } from '../db.js';
import { getGlobalLeaderboard, getOrgLeaderboard, getUserWithOrg, insertGameResult } from '../socialDb.js';
import { completeParticipant, getPlaySessionById, getPlaySessionLeaderboard } from '../playSessionDb.js';

export function createResultRoutes(db: ReplayDatabase): Hono<{ Variables: AuthVariables }> {
  const routes = new Hono<{ Variables: AuthVariables }>();

  routes.post('/', requireAuth, async (c) => {
    const userId = c.get('userId');
    const body = (await c.req.json()) as {
      sessionId?: string;
      playSessionId?: string;
      score?: number;
      deployedCount?: number;
      snapshotCount?: number;
    };

    if (
      !body.sessionId ||
      typeof body.score !== 'number' ||
      typeof body.deployedCount !== 'number' ||
      typeof body.snapshotCount !== 'number'
    ) {
      return c.json({ error: 'sessionId, score, deployedCount and snapshotCount are required' }, 400);
    }

    try {
      const result = insertGameResult(db, {
        userId,
        sessionId: body.sessionId,
        score: body.score,
        deployedCount: body.deployedCount,
        snapshotCount: body.snapshotCount,
        playSessionId: body.playSessionId,
      });
      if (body.playSessionId) {
        completeParticipant(db, body.playSessionId, userId, {
          score: body.score,
          deployedCount: body.deployedCount,
          currentDay: 21,
        });
      }
      return c.json({ result }, 201);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to submit result';
      return c.json({ error: message }, 400);
    }
  });

  return routes;
}

export function createLeaderboardRoutes(db: ReplayDatabase): Hono<{ Variables: AuthVariables }> {
  const routes = new Hono<{ Variables: AuthVariables }>();

  routes.get('/global', (c) => {
    const limit = parsePagination(c.req.query('limit'), 50);
    const offset = parsePagination(c.req.query('offset'), 0);
    return c.json({ entries: getGlobalLeaderboard(db, limit, offset) });
  });

  routes.get('/org', requireAuth, (c) => {
    const userId = c.get('userId');
    const user = getUserWithOrg(db, userId);
    if (!user?.org) {
      return c.json({ error: 'User is not in an organization' }, 403);
    }
    const limit = parsePagination(c.req.query('limit'), 50);
    const offset = parsePagination(c.req.query('offset'), 0);
    return c.json({
      org: { id: user.org.id, name: user.org.name },
      entries: getOrgLeaderboard(db, user.org.id, limit, offset),
    });
  });

  routes.get('/session/:playSessionId', requireAuth, (c) => {
    const playSessionId = c.req.param('playSessionId')!;
    const playSession = getPlaySessionById(db, playSessionId);
    if (!playSession) {
      return c.json({ error: 'Play session not found' }, 404);
    }
    return c.json({
      playSession: { id: playSession.id, title: playSession.title },
      entries: getPlaySessionLeaderboard(db, playSessionId),
    });
  });

  return routes;
}

function parsePagination(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}
