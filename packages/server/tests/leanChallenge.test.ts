import { afterEach, describe, expect, it } from 'vitest';
import { signSession } from '../src/auth/session.js';
import { createApp } from '../src/app.js';
import {
  getLeanChallengeLeaderboard,
  insertLeanChallengeScore,
} from '../src/leanChallengeDb.js';
import { upsertUserByFeishu } from '../src/socialDb.js';
import { cleanupTempDatabase, openTempDatabase, type TempDatabase } from './helpers/tempDb.js';

describe('lean challenge features', () => {
  let tempDatabase: TempDatabase | undefined;

  afterEach(() => {
    cleanupTempDatabase(tempDatabase);
    tempDatabase = undefined;
  });

  function openTestDb() {
    tempDatabase = openTempDatabase('kanban-lean-challenge-');
    return tempDatabase.db;
  }

  it('returns 401 when submitting a score without a session cookie', async () => {
    const db = openTestDb();
    const app = createApp(db);

    const response = await app.request('http://localhost/api/lean-challenge/score-submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        completedAt: new Date().toISOString(),
        durationSeconds: 120,
      }),
    });

    expect(response.status).toBe(401);
  });

  it('accepts authenticated score submissions and stores them in sqlite', async () => {
    const db = openTestDb();
    const app = createApp(db);
    const user = upsertUserByFeishu(db, {
      feishuOpenId: 'lean-player',
      name: 'Lean Player',
    });
    const token = await signSession(user.id);
    const cookie = `kanban_session=${encodeURIComponent(token)}`;

    const response = await app.request('http://localhost/api/lean-challenge/score-submit', {
      method: 'POST',
      headers: {
        Cookie: cookie,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        completedAt: '2026-07-08T10:00:00.000Z',
        durationSeconds: 180,
      }),
    });

    expect(response.status).toBe(201);
    const leaderboard = getLeanChallengeLeaderboard(db);
    expect(leaderboard).toHaveLength(1);
    expect(leaderboard[0]?.userName).toBe('Lean Player');
    expect(leaderboard[0]?.durationSeconds).toBe(180);
  });

  it('shows only the fastest completion per user on the leaderboard', async () => {
    const db = openTestDb();
    const user = upsertUserByFeishu(db, {
      feishuOpenId: 'repeat-player',
      name: 'Repeat Player',
    });

    insertLeanChallengeScore(db, {
      userId: user.id,
      durationSeconds: 240,
      completedAt: '2026-07-08T10:00:00.000Z',
    });
    insertLeanChallengeScore(db, {
      userId: user.id,
      durationSeconds: 150,
      completedAt: '2026-07-08T11:00:00.000Z',
    });

    const leaderboard = getLeanChallengeLeaderboard(db);
    expect(leaderboard).toHaveLength(1);
    expect(leaderboard[0]?.durationSeconds).toBe(150);
    expect(leaderboard[0]?.rank).toBe(1);
  });

  it('refreshes the leaderboard when a repeated player submits a faster score', async () => {
    const db = openTestDb();
    const app = createApp(db);
    const user = upsertUserByFeishu(db, {
      feishuOpenId: 'improving-player',
      name: 'Improving Player',
    });
    const token = await signSession(user.id);
    const headers = {
      Cookie: `kanban_session=${encodeURIComponent(token)}`,
      'Content-Type': 'application/json',
    };

    const submitScore = (durationSeconds: number, completedAt: string) =>
      app.request('http://localhost/api/lean-challenge/score-submit', {
        method: 'POST',
        headers,
        body: JSON.stringify({ durationSeconds, completedAt }),
      });

    await submitScore(240, '2026-07-08T10:00:00.000Z');
    const fasterResponse = await submitScore(150, '2026-07-08T11:00:00.000Z');
    const fasterPayload = (await fasterResponse.json()) as {
      isPersonalBest: boolean;
      personalBestDurationSeconds: number;
    };

    expect(fasterResponse.status).toBe(201);
    expect(fasterPayload.isPersonalBest).toBe(true);
    expect(fasterPayload.personalBestDurationSeconds).toBe(150);

    const slowerResponse = await submitScore(180, '2026-07-08T12:00:00.000Z');
    const slowerPayload = (await slowerResponse.json()) as {
      isPersonalBest: boolean;
      personalBestDurationSeconds: number;
    };
    expect(slowerPayload.isPersonalBest).toBe(false);
    expect(slowerPayload.personalBestDurationSeconds).toBe(150);

    const leaderboardResponse = await app.request(
      'http://localhost/api/lean-challenge/leaderboard',
    );
    const leaderboardPayload = (await leaderboardResponse.json()) as {
      entries: Array<{ userId: string; durationSeconds: number }>;
    };

    expect(leaderboardResponse.headers.get('Cache-Control')).toContain('no-store');
    expect(leaderboardPayload.entries).toEqual([
      expect.objectContaining({ userId: user.id, durationSeconds: 150 }),
    ]);
  });

  it('orders leaderboard entries by duration ascending across users', async () => {
    const db = openTestDb();
    const app = createApp(db);
    const fast = upsertUserByFeishu(db, { feishuOpenId: 'fast', name: 'Fast' });
    const slow = upsertUserByFeishu(db, { feishuOpenId: 'slow', name: 'Slow' });

    insertLeanChallengeScore(db, {
      userId: slow.id,
      durationSeconds: 300,
      completedAt: '2026-07-08T10:00:00.000Z',
    });
    insertLeanChallengeScore(db, {
      userId: fast.id,
      durationSeconds: 120,
      completedAt: '2026-07-08T10:05:00.000Z',
    });

    const response = await app.request('http://localhost/api/lean-challenge/leaderboard');
    expect(response.status).toBe(200);

    const payload = (await response.json()) as {
      entries: Array<{ rank: number; userName: string; durationSeconds: number }>;
    };

    expect(payload.entries).toHaveLength(2);
    expect(payload.entries[0]?.rank).toBe(1);
    expect(payload.entries[0]?.userName).toBe('Fast');
    expect(payload.entries[0]?.durationSeconds).toBe(120);
    expect(payload.entries[1]?.userName).toBe('Slow');
    expect(payload.entries[1]?.durationSeconds).toBe(300);
  });

  it('limits the public leaderboard to ten people while keeping every admin record', async () => {
    const db = openTestDb();
    const app = createApp(db);

    for (let index = 0; index < 12; index += 1) {
      const user = upsertUserByFeishu(db, {
        feishuOpenId: `top-ten-player-${index}`,
        name: `Top Ten Player ${index}`,
      });
      insertLeanChallengeScore(db, {
        userId: user.id,
        durationSeconds: 100 + index,
        completedAt: `2026-07-08T10:${String(index).padStart(2, '0')}:00.000Z`,
      });
    }

    const leaderboardResponse = await app.request(
      'http://localhost/api/lean-challenge/leaderboard?limit=50',
    );
    const leaderboardPayload = (await leaderboardResponse.json()) as {
      entries: Array<{ durationSeconds: number }>;
    };
    expect(leaderboardPayload.entries).toHaveLength(10);
    expect(leaderboardPayload.entries[0]?.durationSeconds).toBe(100);
    expect(leaderboardPayload.entries[9]?.durationSeconds).toBe(109);

    const adminResponse = await app.request(
      'http://localhost/api/lean-challenge/score-list',
    );
    const adminPayload = (await adminResponse.json()) as Array<unknown>;
    expect(adminPayload).toHaveLength(12);
  });

  it('keeps legacy netlify function routes working', async () => {
    const db = openTestDb();
    const app = createApp(db);

    const response = await app.request('http://localhost/.netlify/functions/leaderboard');
    expect(response.status).toBe(200);
  });
});
