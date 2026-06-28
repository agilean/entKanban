import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, describe, expect, it } from 'vitest';
import { signSession } from '../src/auth/session.js';
import { createApp } from '../src/app.js';
import { openDatabase } from '../src/db.js';
import {
  createPlaySession,
  getPlaySessionLeaderboard,
  joinPlaySession,
  startPlaySession,
  completeParticipant,
} from '../src/playSessionDb.js';
import { upsertUserByFeishu, createOrganization } from '../src/socialDb.js';

describe('play sessions', () => {
  let dbPath: string;

  afterEach(() => {
    if (dbPath) {
      rmSync(dbPath, { force: true });
    }
  });

  function openTestDb() {
    const dir = mkdtempSync(join(tmpdir(), 'kanban-play-'));
    dbPath = join(dir, 'test.db');
    return openDatabase(dbPath);
  }

  it('creates play session and ranks leaderboard', async () => {
    const db = openTestDb();
    const app = createApp(db);
    const host = upsertUserByFeishu(db, { feishuOpenId: 'host-1', name: 'Host' });
    const player = upsertUserByFeishu(db, { feishuOpenId: 'player-1', name: 'Player' });
    createOrganization(db, host.id, 'Test Org');

    const playSession = createPlaySession(db, host.id, { gameType: 'kanban', title: 'Friday Game' });
    startPlaySession(db, playSession.id, host.id);
    joinPlaySession(db, playSession.id, player.id);

    completeParticipant(db, playSession.id, host.id, { score: 1200, deployedCount: 8, currentDay: 21 });
    completeParticipant(db, playSession.id, player.id, { score: 1800, deployedCount: 9, currentDay: 21 });

    const board = getPlaySessionLeaderboard(db, playSession.id);
    expect(board[0]?.userName).toBe('Player');
    expect(board[0]?.score).toBe(1800);
  });

  it('starts a play via HTTP for authenticated participant', async () => {
    const db = openTestDb();
    const app = createApp(db);
    const host = upsertUserByFeishu(db, { feishuOpenId: 'host-http', name: 'Host' });
    createOrganization(db, host.id, 'HTTP Org');
    const playSession = createPlaySession(db, host.id, { gameType: 'kanban', title: 'HTTP Room' });
    startPlaySession(db, playSession.id, host.id);

    const token = await signSession(host.id);
    const cookie = `kanban_session=${encodeURIComponent(token)}`;

    const playResponse = await app.request(`http://localhost/api/play-sessions/${playSession.id}/plays`, {
      method: 'POST',
      headers: { Cookie: cookie, 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    expect(playResponse.status).toBe(201);
    const payload = (await playResponse.json()) as { gameSessionId: string };
    expect(payload.gameSessionId).toBeTruthy();
  });

  it('rejects play session creation without organization', () => {
    const db = openTestDb();
    const host = upsertUserByFeishu(db, { feishuOpenId: 'solo-host', name: 'Host' });
    expect(() =>
      createPlaySession(db, host.id, { gameType: 'kanban', title: 'No Org Room' }),
    ).toThrow('请先创建或加入组织后再开竞赛房');
  });
});
