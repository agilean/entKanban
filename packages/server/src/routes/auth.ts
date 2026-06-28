import { Hono } from 'hono';
import { buildFeishuAuthUrl, exchangeCodeForUserProfile } from '../auth/feishu.js';
import { requireAuth, type AuthVariables } from '../auth/middleware.js';
import {
  buildClearCookieHeader,
  buildSetCookieHeader,
  signSession,
} from '../auth/session.js';
import { getConfig } from '../config.js';
import type { ReplayDatabase } from '../db.js';
import { acceptInvitation, getUserWithOrg, upsertUserByFeishu } from '../socialDb.js';

export function createAuthRoutes(db: ReplayDatabase): Hono<{ Variables: AuthVariables }> {
  const routes = new Hono<{ Variables: AuthVariables }>();
  const config = getConfig();

  routes.get('/feishu/login', (c) => {
    if (!config.feishuAppId || !config.feishuAppSecret) {
      return c.json({ error: 'Feishu OAuth is not configured' }, 503);
    }
    const state = c.req.query('state');
    return c.redirect(buildFeishuAuthUrl(state ?? undefined));
  });

  routes.get('/feishu/callback', async (c) => {
    const code = c.req.query('code');
    const state = c.req.query('state');
    if (!code) {
      return c.redirect(`${config.webOrigin}/?auth=failed`);
    }

    try {
      const profile = await exchangeCodeForUserProfile(code);
      const user = upsertUserByFeishu(db, profile);

      if (state?.startsWith('invite:')) {
        const token = state.slice('invite:'.length);
        try {
          acceptInvitation(db, token, user.id);
        } catch {
          // Invite acceptance failures are handled on the invite page.
        }
      }

      const sessionToken = await signSession(user.id);
      c.header('Set-Cookie', buildSetCookieHeader(sessionToken));
      const redirectPath = state?.startsWith('invite:') ? `/invite/${state.slice('invite:'.length)}` : '/';
      return c.redirect(`${config.webOrigin}${redirectPath}?auth=success`);
    } catch {
      return c.redirect(`${config.webOrigin}/?auth=failed`);
    }
  });

  routes.get('/me', requireAuth, (c) => {
    const userId = c.get('userId');
    const user = getUserWithOrg(db, userId);
    if (!user) {
      return c.json({ error: 'User not found' }, 404);
    }
    return c.json({
      user: {
        id: user.id,
        name: user.name,
        avatarUrl: user.avatarUrl,
        role: user.role,
        orgId: user.orgId,
      },
      org: user.org
        ? {
            id: user.org.id,
            name: user.org.name,
          }
        : null,
    });
  });

  routes.post('/logout', (c) => {
    c.header('Set-Cookie', buildClearCookieHeader());
    return c.json({ ok: true });
  });

  return routes;
}
