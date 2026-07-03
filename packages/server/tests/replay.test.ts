import { GameSession } from '@kanban-game/engine';
import { afterEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { getReplay, insertDiceRollEntry, upsertSession } from '../src/db.js';
import { State } from '@kanban-game/engine';
import { cleanupTempDatabase, openTempDatabase, type TempDatabase } from './helpers/tempDb.js';

describe('replay database', () => {
  let tempDatabase: TempDatabase | undefined;

  afterEach(() => {
    cleanupTempDatabase(tempDatabase);
    tempDatabase = undefined;
  });

  it('stores session snapshots and dice roll entries for replay', () => {
    tempDatabase = openTempDatabase('kanban-db-');
    const db = tempDatabase.db;

    upsertSession(db, 'session-1', GameSession.createNew().toJSON());
    insertDiceRollEntry(db, 'session-1', {
      day: 9,
      recordedAt: '2026-06-27T12:00:00.000Z',
      assignments: [{ state: State.DEVELOPMENT, cardName: 'S7', diceIndices: [2] }],
      steps: [
        {
          cardName: 'S7',
          state: State.DEVELOPMENT,
          diceIndices: [2],
          dieLabels: ['D'],
          rollValues: [5],
          totalRoll: 5,
          effortBefore: 8,
          delta: 5,
          effortAfter: 3,
        },
      ],
    });

    const replay = getReplay(db, 'session-1');
    expect(replay?.session.currentDay).toBe(9);
    expect(replay?.diceRolls).toHaveLength(1);
    expect(replay?.diceRolls[0]?.steps[0]?.totalRoll).toBe(5);
  });

  it('exposes replay over HTTP', async () => {
    tempDatabase = openTempDatabase('kanban-db-');
    const db = tempDatabase.db;
    const app = createApp(db);

    upsertSession(db, 'session-http', GameSession.createNew().toJSON());

    const putResponse = await app.request('http://localhost/api/sessions/session-http', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session: GameSession.createNew().toJSON() }),
    });
    expect(putResponse.status).toBe(200);

    const replayResponse = await app.request('http://localhost/api/replay/session-http');
    expect(replayResponse.status).toBe(200);
    const payload = (await replayResponse.json()) as { sessionId: string };
    expect(payload.sessionId).toBe('session-http');
  });
});
