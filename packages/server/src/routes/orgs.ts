import { Hono } from 'hono';
import { requireAuth, type AuthVariables } from '../auth/middleware.js';
import { getConfig } from '../config.js';
import type { ReplayDatabase } from '../db.js';
import {
  acceptInvitation,
  createInvitation,
  createOrganization,
  getInvitationPreview,
  getUserWithOrg,
  listOrgMembers,
} from '../socialDb.js';

export function createOrgRoutes(db: ReplayDatabase): Hono<{ Variables: AuthVariables }> {
  const routes = new Hono<{ Variables: AuthVariables }>();
  const config = getConfig();

  routes.post('/', requireAuth, async (c) => {
    const userId = c.get('userId');
    const body = (await c.req.json()) as { name?: string };
    if (!body.name?.trim()) {
      return c.json({ error: 'Organization name is required' }, 400);
    }
    try {
      const org = createOrganization(db, userId, body.name);
      return c.json({ org }, 201);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create organization';
      return c.json({ error: message }, 409);
    }
  });

  routes.get('/me', requireAuth, (c) => {
    const userId = c.get('userId');
    const user = getUserWithOrg(db, userId);
    if (!user) {
      return c.json({ error: 'User not found' }, 404);
    }
    if (!user.org) {
      return c.json({ org: null, members: [] });
    }
    return c.json({
      org: user.org,
      role: user.role,
      members: listOrgMembers(db, user.org.id).map((member) => ({
        id: member.id,
        name: member.name,
        avatarUrl: member.avatarUrl,
        role: member.role,
      })),
    });
  });

  routes.post('/:id/invitations', requireAuth, (c) => {
    const userId = c.get('userId');
    const orgId = c.req.param('id');
    if (!orgId) {
      return c.json({ error: 'Organization id is required' }, 400);
    }
    try {
      const invitation = createInvitation(db, orgId, userId);
      const inviteUrl = `${config.webOrigin}/invite/${invitation.token}`;
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

  return routes;
}

export function createInvitationRoutes(db: ReplayDatabase): Hono<{ Variables: AuthVariables }> {
  const routes = new Hono<{ Variables: AuthVariables }>();

  routes.get('/:token', (c) => {
    const preview = getInvitationPreview(db, c.req.param('token'));
    if (!preview) {
      return c.json({ error: 'Invitation not found' }, 404);
    }
    return c.json({ invitation: preview });
  });

  routes.post('/:token/accept', requireAuth, (c) => {
    const userId = c.get('userId');
    const token = c.req.param('token');
    if (!token) {
      return c.json({ error: 'Invitation token is required' }, 400);
    }
    try {
      const org = acceptInvitation(db, token, userId);
      return c.json({ org });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to accept invitation';
      const status = message.includes('already belongs') ? 409 : 400;
      return c.json({ error: message }, status);
    }
  });

  return routes;
}
