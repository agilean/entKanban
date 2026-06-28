import type { Context, Next } from 'hono';
import { parseSessionCookie, verifySession } from './session.js';

export type AuthVariables = {
  userId: string;
};

export async function optionalAuth(c: Context, next: Next): Promise<void> {
  const token = parseSessionCookie(c.req.header('Cookie'));
  if (token) {
    const userId = await verifySession(token);
    if (userId) {
      c.set('userId', userId);
    }
  }
  await next();
}

export async function requireAuth(c: Context, next: Next): Promise<Response | void> {
  const token = parseSessionCookie(c.req.header('Cookie'));
  if (!token) {
    return c.json({ error: 'Authentication required' }, 401);
  }
  const userId = await verifySession(token);
  if (!userId) {
    return c.json({ error: 'Invalid or expired session' }, 401);
  }
  c.set('userId', userId);
  await next();
}
