import { Hono } from 'hono';
import { buildFeishuAuthUrl, exchangeCodeForUserProfile } from '../auth/feishu.js';
import { requireAuth, type AuthVariables } from '../auth/middleware.js';
import {
  buildClearCookieHeader,
  buildSetCookieHeader,
  signSession,
} from '../auth/session.js';
import { getConfig } from '../config.js';
import { logError, logInfo, logWarn } from '../logging.js';
import type { ReplayDatabase } from '../db.js';
import { acceptInvitation, getUserWithOrg, upsertUserByFeishu } from '../socialDb.js';
import { acceptPlaySessionInvitation } from '../playSessionDb.js';
import { autoJoinDefaultOrganization } from '../singleOrg.js';

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
    const oauthError = c.req.query('error');
    const oauthErrorDescription = c.req.query('error_description');

    if (oauthError) {
      logError('auth.callback', 'Feishu returned OAuth error', {
        error: oauthError,
        errorDescription: oauthErrorDescription,
        state,
      });
      return c.redirect(`${config.webOrigin}/?auth=failed&reason=feishu_error`);
    }

    if (!code) {
      logWarn('auth.callback', 'Missing authorization code in callback', { state });
      return c.redirect(`${config.webOrigin}/?auth=failed&reason=no_code`);
    }

    try {
      logInfo('auth.callback', 'Processing Feishu callback', {
        state,
        redirectUri: config.feishuRedirectUri,
      });
      const profile = await exchangeCodeForUserProfile(code);
      let user = upsertUserByFeishu(db, profile);

      if (state?.startsWith('invite:')) {
        const token = state.slice('invite:'.length);
        try {
          acceptInvitation(db, token, user.id);
        } catch (inviteError) {
          logWarn('auth.callback', 'Invite acceptance failed after login', {
            tokenPrefix: token.slice(0, 8),
            message: inviteError instanceof Error ? inviteError.message : 'unknown',
          });
        }
      }

      if (state?.startsWith('playsession:')) {
        const token = state.slice('playsession:'.length);
        try {
          acceptPlaySessionInvitation(db, token, user.id);
        } catch (inviteError) {
          logWarn('auth.callback', 'Play session invite failed after login', {
            tokenPrefix: token.slice(0, 8),
            message: inviteError instanceof Error ? inviteError.message : 'unknown',
          });
        }
      }

      autoJoinDefaultOrganization(db, user.id);
      user = getUserWithOrg(db, user.id)!;

      const sessionToken = await signSession(user.id);
      c.header('Set-Cookie', buildSetCookieHeader(sessionToken));
      logInfo('auth.callback', 'Login succeeded', { userId: user.id, name: user.name });
      let redirectPath = '/';
      if (state?.startsWith('invite:')) {
        redirectPath = `/invite/${state.slice('invite:'.length)}`;
      } else if (state?.startsWith('playsession:')) {
        redirectPath = `/sessions/invite/${state.slice('playsession:'.length)}`;
      } else if (state === 'waste') {
        redirectPath = '/waste';
      } else if (state === 'personal') {
        redirectPath = '/personal';
      }
      return c.redirect(`${config.webOrigin}${redirectPath}?auth=success`);
    } catch (error) {
      logError('auth.callback', 'Login failed during callback', {
        message: error instanceof Error ? error.message : 'unknown',
        state,
        redirectUri: config.feishuRedirectUri,
        webOrigin: config.webOrigin,
      });
      return c.redirect(`${config.webOrigin}/?auth=failed&reason=callback_error`);
    }
  });

  routes.get('/me', requireAuth, (c) => {
    const userId = c.get('userId');
    autoJoinDefaultOrganization(db, userId);
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
