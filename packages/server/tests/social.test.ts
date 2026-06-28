import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, describe, expect, it } from 'vitest';
import { signSession } from '../src/auth/session.js';
import { createApp } from '../src/app.js';
import { openDatabase } from '../src/db.js';
import {
  acceptInvitation,
  createInvitation,
  createOrganization,
  getGlobalLeaderboard,
  getOrgLeaderboard,
  insertGameResult,
  upsertUserByFeishu,
} from '../src/socialDb.js';

describe('social features', () => {
  let dbPath: string;

  afterEach(() => {
    if (dbPath) {
      rmSync(dbPath, { force: true });
    }
  });

  function openTestDb() {
    const dir = mkdtempSync(join(tmpdir(), 'kanban-social-'));
    dbPath = join(dir, 'test.db');
    return openDatabase(dbPath);
  }

  it('creates organizations and accepts invitations', () => {
    const db = openTestDb();
    const admin = upsertUserByFeishu(db, {
      feishuOpenId: 'admin-open-id',
      name: 'Admin',
    });
    const org = createOrganization(db, admin.id, 'Acme Team');
    expect(org.name).toBe('Acme Team');

    const invitation = createInvitation(db, org.id, admin.id);
    expect(invitation.token).toBeTruthy();

    const member = upsertUserByFeishu(db, {
      feishuOpenId: 'member-open-id',
      name: 'Member',
    });
    const joined = acceptInvitation(db, invitation.token, member.id);
    expect(joined.id).toBe(org.id);
  });

  it('rejects invitation when user already belongs to an organization', () => {
    const db = openTestDb();
    const admin = upsertUserByFeishu(db, {
      feishuOpenId: 'admin-2',
      name: 'Admin',
    });
    const orgA = createOrganization(db, admin.id, 'Org A');
    const orgB = createOrganization(
      db,
      upsertUserByFeishu(db, { feishuOpenId: 'other-admin', name: 'Other' }).id,
      'Org B',
    );
    const invite = createInvitation(db, orgB.id, orgB.createdBy);

    expect(() => acceptInvitation(db, invite.token, admin.id)).toThrow(
      'User already belongs to an organization',
    );
    expect(orgA.id).not.toBe(orgB.id);
  });

  it('orders leaderboard entries by score descending', () => {
    const db = openTestDb();
    const alice = upsertUserByFeishu(db, { feishuOpenId: 'alice', name: 'Alice' });
    const bob = upsertUserByFeishu(db, { feishuOpenId: 'bob', name: 'Bob' });
    const org = createOrganization(db, alice.id, 'Leaders');

    insertGameResult(db, {
      userId: alice.id,
      sessionId: 'session-a',
      score: 1200,
      deployedCount: 8,
      snapshotCount: 13,
    });
    insertGameResult(db, {
      userId: bob.id,
      sessionId: 'session-b',
      score: 1800,
      deployedCount: 9,
      snapshotCount: 13,
    });
    insertGameResult(db, {
      userId: alice.id,
      sessionId: 'session-a2',
      score: 900,
      deployedCount: 7,
      snapshotCount: 13,
    });

    const global = getGlobalLeaderboard(db);
    expect(global).toHaveLength(3);
    expect(global[0]?.score).toBe(1800);
    expect(global[0]?.userName).toBe('Bob');
    expect(global[1]?.score).toBe(1200);

    const orgBoard = getOrgLeaderboard(db, org.id);
    expect(orgBoard).toHaveLength(2);
    expect(orgBoard.every((entry) => entry.orgId === org.id)).toBe(true);
  });

  it('protects authenticated routes and accepts result submissions', async () => {
    const db = openTestDb();
    const app = createApp(db);
    const user = upsertUserByFeishu(db, {
      feishuOpenId: 'player-1',
      name: 'Player',
    });
    const token = await signSession(user.id);
    const cookie = `kanban_session=${encodeURIComponent(token)}`;

    const meResponse = await app.request('http://localhost/api/auth/me', {
      headers: { Cookie: cookie },
    });
    expect(meResponse.status).toBe(200);
    const me = (await meResponse.json()) as { user: { name: string } };
    expect(me.user.name).toBe('Player');

    const resultResponse = await app.request('http://localhost/api/results', {
      method: 'POST',
      headers: {
        Cookie: cookie,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sessionId: 'session-http',
        score: 1500,
        deployedCount: 10,
        snapshotCount: 13,
      }),
    });
    expect(resultResponse.status).toBe(201);

    const leaderboardResponse = await app.request('http://localhost/api/leaderboard/global');
    expect(leaderboardResponse.status).toBe(200);
    const leaderboard = (await leaderboardResponse.json()) as {
      entries: Array<{ score: number; userName: string }>;
    };
    expect(leaderboard.entries[0]?.score).toBe(1500);
    expect(leaderboard.entries[0]?.userName).toBe('Player');
  });

  it('returns 401 for protected routes without a session cookie', async () => {
    const db = openTestDb();
    const app = createApp(db);
    const response = await app.request('http://localhost/api/auth/me');
    expect(response.status).toBe(401);
  });
});
