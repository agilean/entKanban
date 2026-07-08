import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { DiceRollLogEntry } from '@kanban-game/engine';
import type { GameSessionState } from '@kanban-game/engine';
import { optionalAuth, type AuthVariables } from './auth/middleware.js';
import { getConfig } from './config.js';
import type { ReplayDatabase } from './db.js';
import {
  diceRollCount,
  getReplay,
  insertDiceRollEntry,
  listDiceRolls,
  listSessions,
  upsertSession,
} from './db.js';
import { createAuthRoutes } from './routes/auth.js';
import { createLeaderboardRoutes, createResultRoutes } from './routes/leaderboard.js';
import { createLogRoutes } from './routes/logs.js';
import { createInvitationRoutes, createOrgRoutes } from './routes/orgs.js';
import { createPlaySessionRoutes } from './routes/playSessions.js';
import { createWasteRoutes } from './routes/waste.js';
import { createPersonalRoutes } from './routes/personal.js';
import { createLeanChallengeRoutes } from './routes/leanChallenge.js';
import { canUserWriteGameSession, updateParticipantProgress } from './playSessionDb.js';
import { mountWebStatic, resolveWebDistPath } from './static.js';

export function createApp(db: ReplayDatabase, options?: { serveWeb?: boolean }): Hono<{ Variables: AuthVariables }> {
  const app = new Hono<{ Variables: AuthVariables }>();
  const config = getConfig();

  app.use(
    '*',
    cors({
      origin: config.webOrigin,
      credentials: true,
    }),
  );

  app.use('*', optionalAuth);

  app.get('/api/health', (c) => {
    const authConfig = getConfig();
    return c.json({
      ok: true,
      diceRollCount: diceRollCount(db),
      auth: {
        feishuConfigured: Boolean(authConfig.feishuAppId && authConfig.feishuAppSecret),
        webOrigin: authConfig.webOrigin,
        feishuRedirectUri: authConfig.feishuRedirectUri,
        cookieSecure: authConfig.cookieSecure,
      },
    });
  });

  app.route('/api/logs', createLogRoutes());

  app.route('/api/auth', createAuthRoutes(db));
  app.route('/api/orgs', createOrgRoutes(db));
  app.route('/api/invitations', createInvitationRoutes(db));
  app.route('/api/results', createResultRoutes(db));
  app.route('/api/leaderboard', createLeaderboardRoutes(db));

  app.route('/api/play-sessions', createPlaySessionRoutes(db));
  app.route('/api/waste', createWasteRoutes(db));
  app.route('/api/personal', createPersonalRoutes(db));
  app.route('/api/lean-challenge', createLeanChallengeRoutes(db));
  app.route('/.netlify/functions', createLeanChallengeRoutes(db));

  app.get('/api/sessions', (c) => {
    const limit = Number(c.req.query('limit') ?? '50');
    return c.json({ sessions: listSessions(db, Number.isFinite(limit) ? limit : 50) });
  });

  app.get('/api/sessions/:id', (c) => {
    const replay = getReplay(db, c.req.param('id'));
    if (!replay) {
      return c.json({ error: 'Session not found' }, 404);
    }
    return c.json(replay);
  });

  app.put('/api/sessions/:id', async (c) => {
    const id = c.req.param('id');
    const userId = c.get('userId') as string | undefined;
    if (!canUserWriteGameSession(db, id, userId ?? null)) {
      return c.json({ error: 'Forbidden' }, 403);
    }
    const body = (await c.req.json()) as { session?: GameSessionState };
    if (!body.session?.board) {
      return c.json({ error: 'Invalid session payload' }, 400);
    }
    upsertSession(db, id, body.session);
    if (userId) {
      updateParticipantProgress(db, id, userId, {
        currentDay: body.session.currentDay,
        phase: body.session.phase,
      });
    }
    return c.json({ ok: true, sessionId: id });
  });

  app.get('/api/dice-rolls', (c) => {
    const sessionId = c.req.query('sessionId');
    if (!sessionId) {
      return c.json({ error: 'sessionId is required' }, 400);
    }
    return c.json({ entries: listDiceRolls(db, sessionId) });
  });

  app.post('/api/dice-rolls', async (c) => {
    const body = (await c.req.json()) as {
      sessionId?: string;
      entry?: DiceRollLogEntry;
    };
    if (!body.sessionId || !body.entry?.recordedAt) {
      return c.json({ error: 'sessionId and entry are required' }, 400);
    }
    const userId = c.get('userId') as string | undefined;
    if (!canUserWriteGameSession(db, body.sessionId, userId ?? null)) {
      return c.json({ error: 'Forbidden' }, 403);
    }
    const inserted = insertDiceRollEntry(db, body.sessionId, body.entry);
    return c.json({ ok: true, inserted });
  });

  app.get('/api/replay/:sessionId', (c) => {
    const replay = getReplay(db, c.req.param('sessionId'));
    if (!replay) {
      return c.json({ error: 'Replay not found' }, 404);
    }
    return c.json(replay);
  });

  if (options?.serveWeb) {
    const webDistPath = resolveWebDistPath();
    if (webDistPath) {
      mountWebStatic(app, webDistPath);
    }
  }

  return app;
}
