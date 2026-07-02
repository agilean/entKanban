import { randomUUID } from 'node:crypto';
import type { ReplayDatabase } from './db.js';
import { getOrganizationById, getUserById } from './socialDb.js';

export type PointSource =
  | 'game_kanban'
  | 'game_evacuation'
  | 'waste_submit'
  | 'waste_upvote_received'
  | 'waste_comment_received';

export type PersonalLeaderboardEntry = {
  rank: number;
  userId: string;
  userName: string;
  avatarUrl: string | null;
  totalPoints: number;
  gamePoints: number;
  wastePoints: number;
  gameCount: number;
  wasteSubmissionCount: number;
};

export type PersonalPointsSummary = {
  totalPoints: number;
  gamePoints: number;
  wastePoints: number;
  breakdown: Array<{
    source: PointSource;
    points: number;
    count: number;
  }>;
};

export function rankToGamePoints(rank: number): number {
  if (rank === 1) return 100;
  if (rank === 2) return 80;
  if (rank === 3) return 60;
  if (rank <= 10) return 40;
  if (rank <= 20) return 20;
  return 10;
}

export function migratePersonalPoints(db: ReplayDatabase): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_point_events (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      source TEXT NOT NULL,
      points INTEGER NOT NULL,
      reference_id TEXT,
      description TEXT,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_user_point_events_user ON user_point_events(user_id);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_user_point_events_ref ON user_point_events(user_id, source, reference_id);
  `);
}

function addPointEvent(
  db: ReplayDatabase,
  input: {
    userId: string;
    source: PointSource;
    points: number;
    referenceId?: string | null;
    description?: string;
  },
): void {
  if (input.points <= 0) {
    return;
  }
  const id = randomUUID();
  const now = new Date().toISOString();
  db.prepare(
    `INSERT OR IGNORE INTO user_point_events (id, user_id, source, points, reference_id, description, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    input.userId,
    input.source,
    input.points,
    input.referenceId ?? null,
    input.description ?? null,
    now,
  );
}

function getResultRankInOrg(
  db: ReplayDatabase,
  resultId: string,
  orgId: string,
  gameType: string,
): number {
  const orderBy = gameType === 'evacuation' ? 'score ASC, completed_at ASC' : 'score DESC, completed_at ASC';
  const rows = db
    .prepare(
      `SELECT id FROM game_results
       WHERE org_id = ? AND game_type = ?
       ORDER BY ${orderBy}`,
    )
    .all(orgId, gameType) as Array<{ id: string }>;
  const index = rows.findIndex((row) => row.id === resultId);
  return index >= 0 ? index + 1 : rows.length;
}

export function awardGameResultPoints(
  db: ReplayDatabase,
  resultId: string,
  userId: string,
  orgId: string | null,
  gameType: string,
): number {
  if (!orgId) {
    return 0;
  }
  const rank = getResultRankInOrg(db, resultId, orgId, gameType);
  const points = rankToGamePoints(rank);
  const source: PointSource = gameType === 'evacuation' ? 'game_evacuation' : 'game_kanban';
  const org = getOrganizationById(db, orgId);
  addPointEvent(db, {
    userId,
    source,
    points,
    referenceId: resultId,
    description: `${org?.name ?? '组织'}内排名第 ${rank}`,
  });
  return points;
}

export function awardWasteSubmitPoints(db: ReplayDatabase, userId: string, wasteId: string): void {
  addPointEvent(db, {
    userId,
    source: 'waste_submit',
    points: 5,
    referenceId: wasteId,
    description: '提交浪费观察',
  });
}

export function awardWasteUpvoteReceived(db: ReplayDatabase, authorUserId: string, wasteId: string, voterId: string): void {
  addPointEvent(db, {
    userId: authorUserId,
    source: 'waste_upvote_received',
    points: 1,
    referenceId: `${wasteId}:upvote:${voterId}`,
    description: '浪费观察被顶',
  });
}

export function awardWasteCommentReceived(
  db: ReplayDatabase,
  authorUserId: string,
  wasteId: string,
  commentId: string,
): void {
  addPointEvent(db, {
    userId: authorUserId,
    source: 'waste_comment_received',
    points: 2,
    referenceId: `${wasteId}:comment:${commentId}`,
    description: '浪费观察被评论',
  });
}

export function getPersonalLeaderboard(db: ReplayDatabase, limit = 50): PersonalLeaderboardEntry[] {
  const rows = db
    .prepare(
      `SELECT
         u.id AS userId,
         u.name AS userName,
         u.avatar_url AS avatarUrl,
         COALESCE(SUM(e.points), 0) AS totalPoints,
         COALESCE(SUM(CASE WHEN e.source IN ('game_kanban', 'game_evacuation') THEN e.points ELSE 0 END), 0) AS gamePoints,
         COALESCE(SUM(CASE WHEN e.source IN ('waste_submit', 'waste_upvote_received', 'waste_comment_received') THEN e.points ELSE 0 END), 0) AS wastePoints,
         COALESCE(SUM(CASE WHEN e.source IN ('game_kanban', 'game_evacuation') THEN 1 ELSE 0 END), 0) AS gameCount,
         COALESCE(SUM(CASE WHEN e.source = 'waste_submit' THEN 1 ELSE 0 END), 0) AS wasteSubmissionCount
       FROM users u
       LEFT JOIN user_point_events e ON e.user_id = u.id
       WHERE u.org_id IS NOT NULL
       GROUP BY u.id, u.name, u.avatar_url
       HAVING totalPoints > 0
       ORDER BY totalPoints DESC, gamePoints DESC, wastePoints DESC, u.name ASC
       LIMIT ?`,
    )
    .all(limit) as Array<{
    userId: string;
    userName: string;
    avatarUrl: string | null;
    totalPoints: number;
    gamePoints: number;
    wastePoints: number;
    gameCount: number;
    wasteSubmissionCount: number;
  }>;

  return rows.map((row, index) => ({
    rank: index + 1,
    userId: row.userId,
    userName: row.userName,
    avatarUrl: row.avatarUrl,
    totalPoints: row.totalPoints,
    gamePoints: row.gamePoints,
    wastePoints: row.wastePoints,
    gameCount: row.gameCount,
    wasteSubmissionCount: row.wasteSubmissionCount,
  }));
}

export function getUserPointsSummary(db: ReplayDatabase, userId: string): PersonalPointsSummary | null {
  const user = getUserById(db, userId);
  if (!user) {
    return null;
  }

  const rows = db
    .prepare(
      `SELECT source, SUM(points) AS points, COUNT(*) AS count
       FROM user_point_events
       WHERE user_id = ?
       GROUP BY source`,
    )
    .all(userId) as Array<{ source: PointSource; points: number; count: number }>;

  const gamePoints = rows
    .filter((row) => row.source === 'game_kanban' || row.source === 'game_evacuation')
    .reduce((sum, row) => sum + row.points, 0);
  const wastePoints = rows
    .filter(
      (row) =>
        row.source === 'waste_submit' ||
        row.source === 'waste_upvote_received' ||
        row.source === 'waste_comment_received',
    )
    .reduce((sum, row) => sum + row.points, 0);

  return {
    totalPoints: gamePoints + wastePoints,
    gamePoints,
    wastePoints,
    breakdown: rows.map((row) => ({
      source: row.source,
      points: row.points,
      count: row.count,
    })),
  };
}
