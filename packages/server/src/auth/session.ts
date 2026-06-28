import { SignJWT, jwtVerify } from 'jose';
import { getConfig } from '../config.js';

const COOKIE_NAME = 'kanban_session';
const SESSION_TTL = '30d';

function secretKey(): Uint8Array {
  return new TextEncoder().encode(getConfig().jwtSecret);
}

export async function signSession(userId: string): Promise<string> {
  return new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(SESSION_TTL)
    .sign(secretKey());
}

export async function verifySession(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey());
    return typeof payload.sub === 'string' ? payload.sub : null;
  } catch {
    return null;
  }
}

export function sessionCookieOptions(): {
  name: string;
  httpOnly: boolean;
  sameSite: 'Lax';
  secure: boolean;
  path: string;
  maxAge: number;
} {
  const config = getConfig();
  return {
    name: COOKIE_NAME,
    httpOnly: true,
    sameSite: 'Lax',
    secure: config.cookieSecure,
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  };
}

export function parseSessionCookie(cookieHeader: string | undefined): string | null {
  if (!cookieHeader) {
    return null;
  }
  const parts = cookieHeader.split(';').map((part) => part.trim());
  for (const part of parts) {
    const [name, ...rest] = part.split('=');
    if (name === COOKIE_NAME) {
      return decodeURIComponent(rest.join('='));
    }
  }
  return null;
}

export function buildSetCookieHeader(token: string): string {
  const options = sessionCookieOptions();
  const segments = [
    `${options.name}=${encodeURIComponent(token)}`,
    'HttpOnly',
    `Path=${options.path}`,
    `Max-Age=${options.maxAge}`,
    `SameSite=${options.sameSite}`,
  ];
  if (options.secure) {
    segments.push('Secure');
  }
  return segments.join('; ');
}

export function buildClearCookieHeader(): string {
  const options = sessionCookieOptions();
  return `${options.name}=; Path=${options.path}; Max-Age=0; HttpOnly; SameSite=${options.sameSite}`;
}
