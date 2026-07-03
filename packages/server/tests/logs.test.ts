import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { logError, logInfo } from '../src/logging.js';
import { cleanupTempDatabase, openTempDatabase, type TempDatabase } from './helpers/tempDb.js';

describe('log routes', () => {
  let tempDatabase: TempDatabase | undefined;
  const originalToken = process.env.LOG_ACCESS_TOKEN;

  beforeEach(() => {
    process.env.LOG_ACCESS_TOKEN = 'test-log-token';
  });

  afterEach(() => {
    process.env.LOG_ACCESS_TOKEN = originalToken;
    cleanupTempDatabase(tempDatabase);
    tempDatabase = undefined;
  });

  it('returns recent logs when access token is valid', async () => {
    tempDatabase = openTempDatabase('kanban-logs-');
    const db = tempDatabase.db;
    const app = createApp(db);

    logInfo('test', 'hello log');
    logError('test', 'something failed', { code: 42 });

    const unauthorized = await app.request('http://localhost/api/logs');
    expect(unauthorized.status).toBe(401);

    const response = await app.request('http://localhost/api/logs?token=test-log-token&limit=10');
    expect(response.status).toBe(200);
    const payload = (await response.json()) as { entries: Array<{ message: string; level: string }> };
    expect(payload.entries.length).toBeGreaterThanOrEqual(2);
    expect(payload.entries.some((entry) => entry.message === 'something failed')).toBe(true);

    const statusResponse = await app.request('http://localhost/api/logs/status?token=test-log-token');
    expect(statusResponse.status).toBe(200);
    const status = (await statusResponse.json()) as { auth: { feishuConfigured: boolean } };
    expect(status.auth).toBeTruthy();
  });
});
