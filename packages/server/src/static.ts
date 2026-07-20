import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { serveStatic } from '@hono/node-server/serve-static';
import type { Hono } from 'hono';

export function resolveWebDistPath(): string | null {
  const candidates = [
    process.env.WEB_DIST_PATH,
    resolve(process.cwd(), 'packages/web/dist'),
    resolve(process.cwd(), '../web/dist'),
  ].filter((path): path is string => Boolean(path));

  for (const path of candidates) {
    if (existsSync(resolve(path, 'index.html'))) {
      return path;
    }
  }
  return null;
}

export function mountWebStatic(app: Hono<any>, webDistPath: string): void {
  const leanChallengeIndex = serveStatic({
    root: webDistPath,
    rewriteRequestPath: () => '/lean-challenge/index.html',
  });

  app.get('/assets/*', serveStatic({ root: webDistPath }));
  app.get('/lean-challenge', leanChallengeIndex);
  app.get('/lean-challenge/', leanChallengeIndex);
  app.get('/lean-challenge/*', serveStatic({ root: webDistPath }));
  app.get('/', (c) => c.redirect('/lean-challenge/index.html'));
  app.get('/game', (c) => c.redirect('/lean-challenge/index.html'));
  app.get('/game/', (c) => c.redirect('/lean-challenge/index.html'));
  app.get('*', serveStatic({
    root: webDistPath,
    rewriteRequestPath: () => '/index.html',
  }));
}
