import { Hono } from 'hono';
import { requireAuth, type AuthVariables } from '../auth/middleware.js';
import type { ReplayDatabase } from '../db.js';
import {
  acceptInvitation,
  getInvitationPreview,
  getUserWithOrg,
  listOrgMembers,
} from '../socialDb.js';
import { getDefaultOrganization } from '../singleOrg.js';

export function createOrgRoutes(db: ReplayDatabase): Hono<{ Variables: AuthVariables }> {
  const routes = new Hono<{ Variables: AuthVariables }>();

  routes.post('/', requireAuth, async (c) => {
    return c.json(
      { error: '本平台为内网单组织模式，登录后自动加入组织，无需手动创建' },
      403,
    );
  });

  routes.get('/me', requireAuth, (c) => {
    const userId = c.get('userId');
    const user = getUserWithOrg(db, userId);
    if (!user) {
      return c.json({ error: 'User not found' }, 404);
    }
    const org = user.org ?? getDefaultOrganization(db);
    if (!org) {
      return c.json({ org: null, members: [] });
    }
    return c.json({
      org,
      role: user.role,
      members: listOrgMembers(db, org.id).map((member) => ({
        id: member.id,
        name: member.name,
        avatarUrl: member.avatarUrl,
        role: member.role,
      })),
    });
  });

  routes.post('/:id/invitations', requireAuth, (c) => {
    return c.json({ error: '内网单组织模式，成员登录后自动加入，无需邀请链接' }, 403);
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
