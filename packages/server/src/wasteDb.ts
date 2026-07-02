import { randomUUID } from 'node:crypto';
import type { ReplayDatabase } from './db.js';
import { getUserById } from './socialDb.js';

const MIN_NICKNAME_LENGTH = 2;
const MAX_NICKNAME_LENGTH = 20;
const MIN_COMMENT_LENGTH = 20;
const MAX_COMMENT_LENGTH = 1000;
const MIN_DESCRIPTION_LENGTH = 10;
const MAX_DESCRIPTION_LENGTH = 500;

export type WasteEntry = {
  id: string;
  userId: string | null;
  authorNickname: string;
  description: string;
  createdAt: string;
};

export type WasteCommentView = {
  id: string;
  authorName: string;
  content: string;
  createdAt: string;
};

export type WasteTeamMemberView = {
  userId: string;
  name: string;
  joinedAt: string;
};

export type WasteEntryView = {
  id: string;
  description: string;
  authorNickname: string;
  createdAt: string;
  upvoteCount: number;
  commentCount: number;
  teamCount: number;
  hasUpvoted: boolean;
  hasJoinedTeam: boolean;
  comments: WasteCommentView[];
  teamMembers: WasteTeamMemberView[];
};

export type WasteLeaderboardEntry = {
  rank: number;
  nickname: string;
  score: number;
  submissionCount: number;
  upvoteCount: number;
  commentCount: number;
};

function addColumnIfMissing(
  db: ReplayDatabase,
  table: string,
  column: string,
  definition: string,
): void {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
  if (!columns.some((col) => col.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

function tableExists(db: ReplayDatabase, table: string): boolean {
  const row = db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?")
    .get(table) as { name: string } | undefined;
  return Boolean(row);
}

function migrateWasteEntriesSchema(db: ReplayDatabase): void {
  if (!tableExists(db, 'waste_entries')) {
    return;
  }

  addColumnIfMissing(db, 'waste_entries', 'author_nickname', 'TEXT');

  db.exec(`
    UPDATE waste_entries
    SET author_nickname = COALESCE(
      NULLIF(TRIM(author_nickname), ''),
      (SELECT name FROM users WHERE users.id = waste_entries.user_id),
      '匿名'
    )
    WHERE author_nickname IS NULL OR TRIM(author_nickname) = ''
  `);

  const userIdColumn = db.prepare('PRAGMA table_info(waste_entries)').all() as Array<{
    name: string;
    notnull: number;
  }>;
  const userIdNotNull = userIdColumn.find((col) => col.name === 'user_id')?.notnull === 1;
  if (!userIdNotNull) {
    return;
  }

  db.exec(`
    CREATE TABLE waste_entries_new (
      id TEXT PRIMARY KEY,
      user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      author_nickname TEXT NOT NULL,
      description TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    INSERT INTO waste_entries_new (id, user_id, author_nickname, description, created_at)
    SELECT id, user_id, author_nickname, description, created_at
    FROM waste_entries;

    DROP TABLE waste_entries;
    ALTER TABLE waste_entries_new RENAME TO waste_entries;
    CREATE INDEX IF NOT EXISTS idx_waste_entries_created ON waste_entries(created_at DESC);
  `);
}

export function migrateWaste(db: ReplayDatabase): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS waste_entries (
      id TEXT PRIMARY KEY,
      user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      author_nickname TEXT NOT NULL,
      description TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS waste_upvotes (
      waste_id TEXT NOT NULL REFERENCES waste_entries(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL,
      PRIMARY KEY (waste_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS waste_comments (
      id TEXT PRIMARY KEY,
      waste_id TEXT NOT NULL REFERENCES waste_entries(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS waste_teams (
      waste_id TEXT NOT NULL REFERENCES waste_entries(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      joined_at TEXT NOT NULL,
      PRIMARY KEY (waste_id, user_id)
    );

    CREATE INDEX IF NOT EXISTS idx_waste_entries_created ON waste_entries(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_waste_upvotes_waste ON waste_upvotes(waste_id);
    CREATE INDEX IF NOT EXISTS idx_waste_comments_waste ON waste_comments(waste_id);
    CREATE INDEX IF NOT EXISTS idx_waste_teams_waste ON waste_teams(waste_id);
  `);

  migrateWasteEntriesSchema(db);
}

export function validateNickname(nickname: string): string {
  const trimmed = nickname.trim();
  if (trimmed.length < MIN_NICKNAME_LENGTH || trimmed.length > MAX_NICKNAME_LENGTH) {
    throw new Error(`花名长度需在 ${MIN_NICKNAME_LENGTH}-${MAX_NICKNAME_LENGTH} 个字符之间`);
  }
  return trimmed;
}

function getUserDisplayName(db: ReplayDatabase, userId: string): string {
  return getUserById(db, userId)?.name ?? '用户';
}

export function createWasteEntry(
  db: ReplayDatabase,
  input: { nickname: string; description: string },
): WasteEntry {
  const authorNickname = validateNickname(input.nickname);
  const trimmed = input.description.trim();
  if (trimmed.length < MIN_DESCRIPTION_LENGTH || trimmed.length > MAX_DESCRIPTION_LENGTH) {
    throw new Error(`浪费现象描述需在 ${MIN_DESCRIPTION_LENGTH}-${MAX_DESCRIPTION_LENGTH} 个字符之间`);
  }

  const id = randomUUID();
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO waste_entries (id, user_id, author_nickname, description, created_at)
     VALUES (?, NULL, ?, ?, ?)`,
  ).run(id, authorNickname, trimmed, now);

  return { id, userId: null, authorNickname, description: trimmed, createdAt: now };
}

function listCommentsForEntry(db: ReplayDatabase, wasteId: string): WasteCommentView[] {
  const rows = db
    .prepare(
      `SELECT c.id, c.user_id AS userId, c.content, c.created_at AS createdAt
       FROM waste_comments c
       WHERE c.waste_id = ?
       ORDER BY c.created_at ASC`,
    )
    .all(wasteId) as Array<{
    id: string;
    userId: string;
    content: string;
    createdAt: string;
  }>;

  return rows.map((row) => ({
    id: row.id,
    authorName: getUserDisplayName(db, row.userId),
    content: row.content,
    createdAt: row.createdAt,
  }));
}

function listTeamMembersForEntry(db: ReplayDatabase, wasteId: string): WasteTeamMemberView[] {
  const rows = db
    .prepare(
      `SELECT t.user_id AS userId, t.joined_at AS joinedAt
       FROM waste_teams t
       WHERE t.waste_id = ?
       ORDER BY t.joined_at ASC`,
    )
    .all(wasteId) as Array<{ userId: string; joinedAt: string }>;

  return rows.map((row) => ({
    userId: row.userId,
    name: getUserDisplayName(db, row.userId),
    joinedAt: row.joinedAt,
  }));
}

export function listWasteEntries(
  db: ReplayDatabase,
  options: { limit?: number; offset?: number; currentUserId?: string | null } = {},
): WasteEntryView[] {
  const limit = options.limit ?? 20;
  const offset = options.offset ?? 0;
  const rows = db
    .prepare(
      `SELECT
         e.id,
         e.author_nickname AS authorNickname,
         e.description,
         e.created_at AS createdAt,
         (SELECT COUNT(*) FROM waste_upvotes u WHERE u.waste_id = e.id) AS upvoteCount,
         (SELECT COUNT(*) FROM waste_comments c WHERE c.waste_id = e.id) AS commentCount,
         (SELECT COUNT(*) FROM waste_teams t WHERE t.waste_id = e.id) AS teamCount
       FROM waste_entries e
       ORDER BY e.created_at DESC
       LIMIT ? OFFSET ?`,
    )
    .all(limit, offset) as Array<{
    id: string;
    authorNickname: string;
    description: string;
    createdAt: string;
    upvoteCount: number;
    commentCount: number;
    teamCount: number;
  }>;

  return rows.map((row) => {
    let hasUpvoted = false;
    let hasJoinedTeam = false;
    if (options.currentUserId) {
      hasUpvoted = Boolean(
        db
          .prepare('SELECT 1 FROM waste_upvotes WHERE waste_id = ? AND user_id = ?')
          .get(row.id, options.currentUserId),
      );
      hasJoinedTeam = Boolean(
        db
          .prepare('SELECT 1 FROM waste_teams WHERE waste_id = ? AND user_id = ?')
          .get(row.id, options.currentUserId),
      );
    }
    return {
      id: row.id,
      description: row.description,
      authorNickname: row.authorNickname,
      createdAt: row.createdAt,
      upvoteCount: row.upvoteCount,
      commentCount: row.commentCount,
      teamCount: row.teamCount,
      hasUpvoted,
      hasJoinedTeam,
      comments: listCommentsForEntry(db, row.id),
      teamMembers: listTeamMembersForEntry(db, row.id),
    };
  });
}

export function upvoteWasteEntry(db: ReplayDatabase, userId: string, wasteId: string): { upvoteCount: number } {
  const entry = db.prepare('SELECT user_id FROM waste_entries WHERE id = ?').get(wasteId) as
    | { user_id: string | null }
    | undefined;
  if (!entry) {
    throw new Error('浪费现象不存在');
  }
  if (entry.user_id && entry.user_id === userId) {
    throw new Error('不能给自己的提交顶');
  }

  const now = new Date().toISOString();
  db.prepare(
    `INSERT OR IGNORE INTO waste_upvotes (waste_id, user_id, created_at)
     VALUES (?, ?, ?)`,
  ).run(wasteId, userId, now);

  const countRow = db
    .prepare('SELECT COUNT(*) AS count FROM waste_upvotes WHERE waste_id = ?')
    .get(wasteId) as { count: number };
  return { upvoteCount: countRow.count };
}

export function addWasteComment(
  db: ReplayDatabase,
  userId: string,
  wasteId: string,
  content: string,
): WasteCommentView {
  const entry = db.prepare('SELECT id FROM waste_entries WHERE id = ?').get(wasteId) as
    | { id: string }
    | undefined;
  if (!entry) {
    throw new Error('浪费现象不存在');
  }

  const trimmed = content.trim();
  if (trimmed.length < MIN_COMMENT_LENGTH || trimmed.length > MAX_COMMENT_LENGTH) {
    throw new Error(`评论至少 ${MIN_COMMENT_LENGTH} 个字，最多 ${MAX_COMMENT_LENGTH} 个字`);
  }

  const id = randomUUID();
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO waste_comments (id, waste_id, user_id, content, created_at)
     VALUES (?, ?, ?, ?, ?)`,
  ).run(id, wasteId, userId, trimmed, now);

  return {
    id,
    authorName: getUserDisplayName(db, userId),
    content: trimmed,
    createdAt: now,
  };
}

export function joinWasteTeam(
  db: ReplayDatabase,
  userId: string,
  wasteId: string,
): { teamCount: number; teamMembers: WasteTeamMemberView[] } {
  const entry = db.prepare('SELECT id FROM waste_entries WHERE id = ?').get(wasteId) as
    | { id: string }
    | undefined;
  if (!entry) {
    throw new Error('浪费现象不存在');
  }

  const now = new Date().toISOString();
  db.prepare(
    `INSERT OR IGNORE INTO waste_teams (waste_id, user_id, joined_at)
     VALUES (?, ?, ?)`,
  ).run(wasteId, userId, now);

  const teamMembers = listTeamMembersForEntry(db, wasteId);
  return { teamCount: teamMembers.length, teamMembers };
}

export function getWasteLeaderboard(db: ReplayDatabase, limit = 50): WasteLeaderboardEntry[] {
  const rows = db
    .prepare(
      `SELECT
         e.author_nickname AS nickname,
         COUNT(DISTINCT e.id) AS submissionCount,
         (SELECT COUNT(*)
          FROM waste_upvotes wu
          JOIN waste_entries we ON we.id = wu.waste_id
          WHERE we.author_nickname = e.author_nickname) AS upvoteCount,
         (SELECT COUNT(*)
          FROM waste_comments wc
          JOIN waste_entries we ON we.id = wc.waste_id
          WHERE we.author_nickname = e.author_nickname) AS commentCount
       FROM waste_entries e
       WHERE TRIM(e.author_nickname) != ''
       GROUP BY e.author_nickname
       ORDER BY upvoteCount DESC, commentCount DESC, submissionCount DESC, e.author_nickname ASC
       LIMIT ?`,
    )
    .all(limit) as Array<{
    nickname: string;
    submissionCount: number;
    upvoteCount: number;
    commentCount: number;
  }>;

  const scored = rows
    .map((row) => ({
      ...row,
      score: row.upvoteCount * 1 + row.commentCount * 2,
    }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (b.submissionCount !== a.submissionCount) return b.submissionCount - a.submissionCount;
      return a.nickname.localeCompare(b.nickname, 'zh-CN');
    });

  return scored.map((row, index) => ({
    rank: index + 1,
    nickname: row.nickname,
    score: row.score,
    submissionCount: row.submissionCount,
    upvoteCount: row.upvoteCount,
    commentCount: row.commentCount,
  }));
}
