import { Hono } from 'hono';
import { getConfig } from '../config.js';
import { clearLogs, listLogs, type LogLevel } from '../logging.js';

function isAuthorized(c: { req: { header: (name: string) => string | undefined; query: (name: string) => string | undefined } }): boolean {
  const config = getConfig();
  if (!config.logAccessToken) {
    return false;
  }
  const headerToken = c.req.header('Authorization')?.replace(/^Bearer\s+/i, '');
  const queryToken = c.req.query('token');
  return headerToken === config.logAccessToken || queryToken === config.logAccessToken;
}

export function createLogRoutes(): Hono {
  const routes = new Hono();

  routes.get('/', (c) => {
    if (!isAuthorized(c)) {
      return c.json({ error: 'Invalid or missing log access token' }, 401);
    }

    const limit = Number(c.req.query('limit') ?? '100');
    const level = c.req.query('level') as LogLevel | undefined;
    const safeLimit = Number.isFinite(limit) && limit > 0 ? Math.min(limit, 300) : 100;
    const validLevel = level === 'info' || level === 'warn' || level === 'error' ? level : undefined;

    return c.json({
      entries: listLogs(safeLimit, validLevel),
      count: listLogs(safeLimit, validLevel).length,
    });
  });

  routes.delete('/', (c) => {
    if (!isAuthorized(c)) {
      return c.json({ error: 'Invalid or missing log access token' }, 401);
    }
    clearLogs();
    return c.json({ ok: true });
  });

  routes.get('/status', (c) => {
    if (!isAuthorized(c)) {
      return c.json({ error: 'Invalid or missing log access token' }, 401);
    }

    const config = getConfig();
    return c.json({
      runtime: {
        nodeVersion: process.version,
        renderExternalUrl: process.env.RENDER_EXTERNAL_URL ?? null,
        port: process.env.PORT ?? '3910',
      },
      auth: {
        feishuConfigured: Boolean(config.feishuAppId && config.feishuAppSecret),
        feishuAppIdPrefix: config.feishuAppId ? `${config.feishuAppId.slice(0, 6)}…` : null,
        webOrigin: config.webOrigin,
        feishuRedirectUri: config.feishuRedirectUri,
        cookieSecure: config.cookieSecure,
        jwtSecretConfigured: Boolean(config.jwtSecret && config.jwtSecret !== 'dev-secret-change-me'),
      },
      logging: {
        maxEntries: 300,
        tokenConfigured: Boolean(config.logAccessToken),
      },
    });
  });

  return routes;
}
