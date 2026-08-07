import { Hono } from 'hono';
import { requireAuth, type AuthVariables } from '../auth/middleware.js';
import type { ReplayDatabase } from '../db.js';
import {
  getLeanChallengeLeaderboard,
  getLeanChallengePersonalBest,
  insertLeanChallengeScore,
  listLeanChallengeScoresAdmin,
} from '../leanChallengeDb.js';

type ScoreSubmitBody = {
  stage?: string;
  stageName?: string;
  completedAt?: string;
  durationSeconds?: number | string;
};

const PUBLIC_LEADERBOARD_LIMIT = 10;

export function createLeanChallengeRoutes(db: ReplayDatabase): Hono<{ Variables: AuthVariables }> {
  const routes = new Hono<{ Variables: AuthVariables }>();

  routes.post('/score-submit', requireAuth, async (c) => {
    const userId = c.get('userId');
    const body = (await c.req.json()) as ScoreSubmitBody;

    if (
      body.completedAt === undefined ||
      body.completedAt === '' ||
      body.durationSeconds === undefined ||
      body.durationSeconds === ''
    ) {
      return c.json({ error: 'completedAt and durationSeconds are required' }, 400);
    }

    const durationSeconds = Number(body.durationSeconds);
    if (!Number.isFinite(durationSeconds) || durationSeconds < 0) {
      return c.json({ error: 'durationSeconds must be a non-negative number' }, 400);
    }

    try {
      const previousPersonalBest = getLeanChallengePersonalBest(db, userId);
      const result = insertLeanChallengeScore(db, {
        userId,
        durationSeconds,
        completedAt: String(body.completedAt),
        stage: body.stage,
        stageName: body.stageName,
      });
      const personalBestDurationSeconds = getLeanChallengePersonalBest(db, userId);
      return c.json(
        {
          ok: true,
          result,
          isPersonalBest:
            previousPersonalBest === null || durationSeconds < previousPersonalBest,
          personalBestDurationSeconds,
        },
        201,
      );
    } catch {
      return c.json({ error: 'Submit failed' }, 500);
    }
  });

  routes.get('/leaderboard', (c) => {
    const requestedLimit = parsePagination(
      c.req.query('limit'),
      PUBLIC_LEADERBOARD_LIMIT,
    );
    const limit = Math.min(requestedLimit, PUBLIC_LEADERBOARD_LIMIT);
    const offset = parsePagination(c.req.query('offset'), 0);
    c.header('Cache-Control', 'no-store, no-cache, must-revalidate');
    c.header('Pragma', 'no-cache');
    return c.json({ entries: getLeanChallengeLeaderboard(db, limit, offset) });
  });

  routes.get('/score-list', (c) => {
    const rows = listLeanChallengeScoresAdmin(db);
    return c.json(
      rows.map((row) => ({
        id: row.id,
        userId: row.userId,
        userName: row.userName,
        stage: row.stage,
        stageName: row.stageName,
        durationSeconds: row.durationSeconds,
        completedAt: row.completedAt,
        createdAt: row.createdAt,
      })),
    );
  });

  return routes;
}

function parsePagination(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}
