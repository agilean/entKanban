import { randomUUID } from 'node:crypto';
import { GameSession, isValidGameType } from '@kanban-game/engine';
import { Hono } from 'hono';
import { getConfig } from '../config.js';
import { requireAuth, type AuthVariables } from '../auth/middleware.js';
import type { ReplayDatabase } from '../db.js';
import { upsertSession } from '../db.js';
import {
  acceptPlaySessionInvitation,
  bindParticipantGameSession,
  createPlaySession,
  createPlaySessionInvitation,
  getPlaySessionById,
  getPlaySessionInvitationPreview,
  getPlaySessionLeaderboard,
  getPlaySessionParticipants,
  joinPlaySession,
  listPlaySessionsForUser,
  startPlaySession,
} from '../playSessionDb.js';

export function createPlaySessionRoutes(db: ReplayDatabase): Hono<{ Variables: AuthVariables }> {
  const routes = new Hono<{ Variables: AuthVariables }>();
  const config = getConfig();

  routes.post('/', requireAuth, async (c) => {
    const userId = c.get('userId');
    const body = (await c.req.json()) as {
      gameType?: string;
      title?: string;
      orgId?: string | null;
    };
    if (!body.title?.trim()) {
      return c.json({ error: 'title is required' }, 400);
    }
    const gameType = body.gameType ?? 'kanban';
    if (!isValidGameType(gameType)) {
      return c.json({ error: 'Invalid game type' }, 400);
    }
    try {
      const session = createPlaySession(db, userId, {
        gameType,
        title: body.title,
        orgId: body.orgId,
      });
      const participants = getPlaySessionParticipants(db, session.id);
      return c.json({ playSession: session, participants }, 201);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create play session';
      return c.json({ error: message }, 400);
    }
  });

  routes.get('/', requireAuth, (c) => {
    const userId = c.get('userId');
    const sessions = listPlaySessionsForUser(db, userId);
    return c.json({ playSessions: sessions });
  });

  routes.get('/invitations/:token', (c) => {
    const preview = getPlaySessionInvitationPreview(db, c.req.param('token')!);
    if (!preview) {
      return c.json({ error: 'Invitation not found' }, 404);
    }
    return c.json({ invitation: preview });
  });

  routes.post('/invitations/:token/accept', requireAuth, (c) => {
    const userId = c.get('userId');
    const token = c.req.param('token')!;
    try {
      const playSession = acceptPlaySessionInvitation(db, token, userId);
      return c.json({ playSession });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to accept invitation';
      return c.json({ error: message }, 400);
    }
  });

  routes.get('/:id', requireAuth, (c) => {
    const playSession = getPlaySessionById(db, c.req.param('id')!);
    if (!playSession) {
      return c.json({ error: 'Play session not found' }, 404);
    }
    const participants = getPlaySessionParticipants(db, playSession.id);
    return c.json({ playSession, participants });
  });

  routes.post('/:id/join', requireAuth, (c) => {
    const userId = c.get('userId');
    const playSessionId = c.req.param('id')!;
    try {
      joinPlaySession(db, playSessionId, userId);
      return c.json({ ok: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to join';
      return c.json({ error: message }, 400);
    }
  });

  routes.post('/:id/start', requireAuth, (c) => {
    const userId = c.get('userId');
    const playSessionId = c.req.param('id')!;
    try {
      const playSession = startPlaySession(db, playSessionId, userId);
      return c.json({ playSession });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to start session';
      return c.json({ error: message }, 403);
    }
  });

  routes.post('/:id/invitations', requireAuth, (c) => {
    const userId = c.get('userId');
    const playSessionId = c.req.param('id')!;
    try {
      const invitation = createPlaySessionInvitation(db, playSessionId, userId);
      const inviteUrl = `${config.webOrigin}/sessions/invite/${invitation.token}`;
      return c.json({
        invitation: {
          token: invitation.token,
          expiresAt: invitation.expiresAt,
          inviteUrl,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create invitation';
      return c.json({ error: message }, 403);
    }
  });

  routes.get('/:id/leaderboard', requireAuth, (c) => {
    const playSession = getPlaySessionById(db, c.req.param('id')!);
    if (!playSession) {
      return c.json({ error: 'Play session not found' }, 404);
    }
    return c.json({
      playSession: { id: playSession.id, title: playSession.title },
      entries: getPlaySessionLeaderboard(db, playSession.id),
    });
  });

  routes.get('/:id/progress', requireAuth, (c) => {
    const playSession = getPlaySessionById(db, c.req.param('id')!);
    if (!playSession) {
      return c.json({ error: 'Play session not found' }, 404);
    }
    const participants = getPlaySessionParticipants(db, playSession.id);
    return c.json({
      playSession: { id: playSession.id, title: playSession.title, status: playSession.status },
      participants: participants.map((p) => ({
        userId: p.userId,
        userName: p.userName,
        avatarUrl: p.avatarUrl,
        status: p.status,
        currentDay: p.currentDay,
        phase: p.phase,
        score: p.score,
        deployedCount: p.deployedCount,
        completedAt: p.completedAt,
      })),
    });
  });

  routes.post('/:id/plays', requireAuth, (c) => {
    const userId = c.get('userId');
    const playSessionId = c.req.param('id')!;
    const playSession = getPlaySessionById(db, playSessionId);
    if (!playSession) {
      return c.json({ error: 'Play session not found' }, 404);
    }
    if (playSession.status === 'closed') {
      return c.json({ error: 'Play session is closed' }, 400);
    }
    if (playSession.status === 'lobby') {
      return c.json({ error: 'Play session has not started yet' }, 400);
    }

    try {
      joinPlaySession(db, playSessionId, userId);
      const gameSessionId = randomUUID();
      const sessionState = GameSession.createNew().toJSON();
      sessionState.gameType = 'kanban';
      upsertSession(db, gameSessionId, sessionState);
      bindParticipantGameSession(db, playSessionId, userId, gameSessionId);
      return c.json({ gameSessionId, playSessionId }, 201);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to start play';
      return c.json({ error: message }, 400);
    }
  });

  return routes;
}
