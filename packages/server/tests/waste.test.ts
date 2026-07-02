import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, describe, expect, it } from 'vitest';
import { signSession } from '../src/auth/session.js';
import { createApp } from '../src/app.js';
import { openDatabase } from '../src/db.js';
import { upsertUserByFeishu } from '../src/socialDb.js';
import {
  addWasteComment,
  createWasteEntry,
  getWasteLeaderboard,
  joinWasteTeam,
  upvoteWasteEntry,
} from '../src/wasteDb.js';

describe('waste board', () => {
  let dbPath: string;

  afterEach(() => {
    if (dbPath) {
      rmSync(dbPath, { force: true });
    }
  });

  function openTestDb() {
    const dir = mkdtempSync(join(tmpdir(), 'kanban-waste-'));
    dbPath = join(dir, 'test.db');
    return openDatabase(dbPath);
  }

  it('allows anonymous submission with nickname', () => {
    const db = openTestDb();
    const entry = createWasteEntry(db, {
      nickname: '现场观察员',
      description: '这是一个足够长的浪费现象描述内容',
    });
    expect(entry.authorNickname).toBe('现场观察员');
    expect(entry.userId).toBeNull();
  });

  it('scores leaderboard by upvotes and comments on author nickname', () => {
    const db = openTestDb();
    const voter = upsertUserByFeishu(db, { feishuOpenId: 'voter', name: 'Voter' });
    const entry = createWasteEntry(db, {
      nickname: '精益达人',
      description: '审批流程中存在大量等待浪费',
    });
    upvoteWasteEntry(db, voter.id, entry.id);
    addWasteComment(
      db,
      voter.id,
      entry.id,
      '建议梳理审批节点，合并重复审核环节，缩短等待时间。',
    );

    const board = getWasteLeaderboard(db);
    expect(board).toHaveLength(1);
    expect(board[0]?.nickname).toBe('精益达人');
    expect(board[0]?.score).toBe(3);
    expect(board[0]?.upvoteCount).toBe(1);
    expect(board[0]?.commentCount).toBe(1);
  });

  it('exposes anonymous create and authenticated interactions via API', async () => {
    const db = openTestDb();
    const app = createApp(db);
    const user = upsertUserByFeishu(db, { feishuOpenId: 'api-user', name: 'Api User' });
    const token = await signSession(user.id);

    const createRes = await app.request('/api/waste/entries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nickname: '匿名观察者',
        description: '产线切换时存在大量搬运浪费现象',
      }),
    });
    expect(createRes.status).toBe(201);
    const createBody = (await createRes.json()) as { entry: { id: string; authorNickname: string } };

    const listRes = await app.request('/api/waste/entries');
    expect(listRes.status).toBe(200);
    const listBody = (await listRes.json()) as { entries: Array<{ id: string; authorNickname: string }> };
    expect(listBody.entries[0]?.authorNickname).toBe('匿名观察者');

    const wasteId = createBody.entry.id;
    const upvoteRes = await app.request(`/api/waste/entries/${wasteId}/upvote`, {
      method: 'POST',
      headers: { Cookie: `kanban_session=${token}` },
    });
    expect(upvoteRes.status).toBe(200);

    const teamRes = await app.request(`/api/waste/entries/${wasteId}/team`, {
      method: 'POST',
      headers: { Cookie: `kanban_session=${token}` },
    });
    expect(teamRes.status).toBe(200);
    const teamBody = (await teamRes.json()) as { teamCount: number; teamMembers: Array<{ name: string }> };
    expect(teamBody.teamCount).toBe(1);
    expect(teamBody.teamMembers[0]?.name).toBe('Api User');
  });

  it('rejects short comments', () => {
    const db = openTestDb();
    const commenter = upsertUserByFeishu(db, { feishuOpenId: 'c2', name: 'C' });
    const entry = createWasteEntry(db, {
      nickname: '作者',
      description: '库存积压导致资金占用浪费',
    });
    expect(() => addWasteComment(db, commenter.id, entry.id, '太短了')).toThrow('评论至少 20 个字');
  });

  it('allows logged-in users to join improvement teams', () => {
    const db = openTestDb();
    const member = upsertUserByFeishu(db, { feishuOpenId: 'member', name: 'Member' });
    const entry = createWasteEntry(db, {
      nickname: '观察员',
      description: '会议过多导致等待浪费严重',
    });
    const result = joinWasteTeam(db, member.id, entry.id);
    expect(result.teamCount).toBe(1);
    expect(result.teamMembers[0]?.name).toBe('Member');
  });
});
