import { afterEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { awardGameResultPoints, getPersonalLeaderboard, rankToGamePoints } from '../src/personalPointsDb.js';
import { insertGameResult, upsertUserByFeishu } from '../src/socialDb.js';
import { autoJoinDefaultOrganization, ensureDefaultOrganization } from '../src/singleOrg.js';
import { createWasteEntry } from '../src/wasteDb.js';
import { cleanupTempDatabase, openTempDatabase, type TempDatabase } from './helpers/tempDb.js';

describe('personal points and single org', () => {
  let tempDatabase: TempDatabase | undefined;

  afterEach(() => {
    cleanupTempDatabase(tempDatabase);
    tempDatabase = undefined;
  });

  function openTestDb() {
    tempDatabase = openTempDatabase('kanban-personal-');
    return tempDatabase.db;
  }

  it('maps game rank to points', () => {
    expect(rankToGamePoints(1)).toBe(100);
    expect(rankToGamePoints(3)).toBe(60);
    expect(rankToGamePoints(15)).toBe(20);
    expect(rankToGamePoints(99)).toBe(10);
  });

  it('auto joins users into the default organization', () => {
    const db = openTestDb();
    const user = upsertUserByFeishu(db, { feishuOpenId: 'u1', name: 'Alice' });
    const org = autoJoinDefaultOrganization(db, user.id);
    expect(org.name).toBe('精益学习平台');
    const joined = upsertUserByFeishu(db, { feishuOpenId: 'u2', name: 'Bob' });
    const sameOrg = autoJoinDefaultOrganization(db, joined.id);
    expect(sameOrg.id).toBe(org.id);
  });

  it('awards personal points for game results and waste submissions', () => {
    const db = openTestDb();
    const alice = upsertUserByFeishu(db, { feishuOpenId: 'alice', name: 'Alice' });
    const bob = upsertUserByFeishu(db, { feishuOpenId: 'bob', name: 'Bob' });
    const org = ensureDefaultOrganization(db, alice.id);
    autoJoinDefaultOrganization(db, alice.id);
    autoJoinDefaultOrganization(db, bob.id);

    const aliceResult = insertGameResult(db, {
      userId: alice.id,
      sessionId: 's1',
      score: 1000,
      deployedCount: 10,
      snapshotCount: 21,
    });
    awardGameResultPoints(db, aliceResult.id, alice.id, org.id, 'kanban');

    const bobResult = insertGameResult(db, {
      userId: bob.id,
      sessionId: 's2',
      score: 500,
      deployedCount: 8,
      snapshotCount: 21,
    });
    awardGameResultPoints(db, bobResult.id, bob.id, org.id, 'kanban');

    createWasteEntry(db, {
      nickname: '观察者',
      description: '测试浪费观察描述内容',
      userId: alice.id,
    });

    const board = getPersonalLeaderboard(db);
    expect(board.length).toBeGreaterThan(0);
    expect(board[0]?.userName).toBe('Alice');
  });

  it('blocks manual organization creation', async () => {
    const db = openTestDb();
    const app = createApp(db);
    const user = upsertUserByFeishu(db, { feishuOpenId: 'creator', name: 'Creator' });
    autoJoinDefaultOrganization(db, user.id);
    const { signSession } = await import('../src/auth/session.js');
    const token = await signSession(user.id);

    const response = await app.request('/api/orgs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `kanban_session=${token}`,
      },
      body: JSON.stringify({ name: 'Another Org' }),
    });
    expect(response.status).toBe(403);
  });
});
