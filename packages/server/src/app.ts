import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { DiceRollLogEntry } from '@kanban-game/engine';
import type { GameSessionState } from '@kanban-game/engine';
import type { ReplayDatabase } from './db.js';
import {
  diceRollCount,
  getReplay,
  insertDiceRollEntry,
  listDiceRolls,
  listSessions,
  upsertSession,
} from './db.js';

export function createApp(db: ReplayDatabase): Hono {
  const app = new Hono();

  app.use(
    '*',
    cors({
      origin: '*',
    }),
  );

  app.get('/api/health', (c) =>
    c.json({
      ok: true,
      diceRollCount: diceRollCount(db),
    }),
  );

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
    const body = (await c.req.json()) as { session?: GameSessionState };
    if (!body.session?.board) {
      return c.json({ error: 'Invalid session payload' }, 400);
    }
    upsertSession(db, id, body.session);
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

  return app;
}
