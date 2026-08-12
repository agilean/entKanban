import { randomUUID } from 'node:crypto';
import type { ReplayDatabase } from './db.js';

export type LeanChallengeScore = {
  id: string;
  userId: string;
  stage: string;
  stageName: string;
  durationSeconds: number;
  completedAt: string;
  createdAt: string;
};

export type LeanChallengeLeaderboardEntry = {
  rank: number;
  userId: string;
  userName: string;
  avatarUrl: string | null;
  orgId: string | null;
  orgName: string | null;
  durationSeconds: number;
  completedAt: string;
};

export type LeanChallengeAdminScore = {
  id: string;
  userId: string;
  userName: string;
  stage: string;
  stageName: string;
  durationSeconds: number;
  completedAt: string;
  createdAt: string;
};

export function migrateLeanChallenge(db: ReplayDatabase): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS lean_challenge_scores (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      stage TEXT NOT NULL DEFAULT 'Lean Basics',
      stage_name TEXT NOT NULL DEFAULT '知识闯关：认识精益',
      duration_seconds INTEGER NOT NULL,
      completed_at TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_lean_challenge_user ON lean_challenge_scores(user_id);
    CREATE INDEX IF NOT EXISTS idx_lean_challenge_duration ON lean_challenge_scores(duration_seconds);
  `);
}

export function insertLeanChallengeScore(
  db: ReplayDatabase,
  input: {
    userId: string;
    durationSeconds: number;
    completedAt: string;
    stage?: string;
    stageName?: string;
  },
): LeanChallengeScore {
  const id = randomUUID();
  const now = new Date().toISOString();
  const stage = input.stage ?? 'Lean Basics';
  const stageName = input.stageName ?? '知识闯关：认识精益';

  db.prepare(
    `INSERT INTO lean_challenge_scores
      (id, user_id, stage, stage_name, duration_seconds, completed_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(id, input.userId, stage, stageName, input.durationSeconds, input.completedAt, now);

  return {
    id,
    userId: input.userId,
    stage,
    stageName,
    durationSeconds: input.durationSeconds,
    completedAt: input.completedAt,
    createdAt: now,
  };
}

export function getLeanChallengePersonalBest(
  db: ReplayDatabase,
  userId: string,
): number | null {
  const row = db
    .prepare(
      `SELECT MIN(duration_seconds) AS durationSeconds
       FROM lean_challenge_scores
       WHERE user_id = ?`,
    )
    .get(userId) as { durationSeconds: number | null };

  return row.durationSeconds;
}

export function getLeanChallengeRank(
  db: ReplayDatabase,
  userId: string,
): number | null {
  const row = db
    .prepare(
      `WITH personal_bests AS (
         SELECT
           s.user_id AS userId,
           s.duration_seconds AS durationSeconds,
           s.completed_at AS completedAt,
           ROW_NUMBER() OVER (
             PARTITION BY s.user_id
             ORDER BY s.duration_seconds ASC, s.completed_at ASC
           ) AS personalBestRow
         FROM lean_challenge_scores s
       ),
       ranked AS (
         SELECT
           userId,
           ROW_NUMBER() OVER (
             ORDER BY durationSeconds ASC, completedAt ASC, userId ASC
           ) AS currentRank
         FROM personal_bests
         WHERE personalBestRow = 1
       )
       SELECT currentRank
       FROM ranked
       WHERE userId = ?`,
    )
    .get(userId) as { currentRank: number } | undefined;

  return row?.currentRank ?? null;
}

export function getLeanChallengeLeaderboard(
  db: ReplayDatabase,
  limit = 50,
  offset = 0,
): LeanChallengeLeaderboardEntry[] {
  const rows = db
    .prepare(
      `SELECT userId, userName, avatarUrl, orgId, orgName, durationSeconds, completedAt
       FROM (
         SELECT
           u.id AS userId,
           u.name AS userName,
           u.avatar_url AS avatarUrl,
           u.org_id AS orgId,
           o.name AS orgName,
           s.duration_seconds AS durationSeconds,
           s.completed_at AS completedAt,
           ROW_NUMBER() OVER (
             PARTITION BY s.user_id
             ORDER BY s.duration_seconds ASC, s.completed_at ASC
           ) AS rn
         FROM lean_challenge_scores s
         JOIN users u ON u.id = s.user_id
         LEFT JOIN organizations o ON o.id = u.org_id
       )
       WHERE rn = 1
       ORDER BY durationSeconds ASC, completedAt ASC, userId ASC
       LIMIT ? OFFSET ?`,
    )
    .all(limit, offset) as Array<{
    userId: string;
    userName: string;
    avatarUrl: string | null;
    orgId: string | null;
    orgName: string | null;
    durationSeconds: number;
    completedAt: string;
  }>;

  return rows.map((row, index) => ({
    rank: offset + index + 1,
    userId: row.userId,
    userName: row.userName,
    avatarUrl: row.avatarUrl,
    orgId: row.orgId,
    orgName: row.orgName,
    durationSeconds: row.durationSeconds,
    completedAt: row.completedAt,
  }));
}

export function listLeanChallengeScoresAdmin(db: ReplayDatabase): LeanChallengeAdminScore[] {
  const rows = db
    .prepare(
      `SELECT
         s.id,
         s.user_id AS userId,
         u.name AS userName,
         s.stage,
         s.stage_name AS stageName,
         s.duration_seconds AS durationSeconds,
         s.completed_at AS completedAt,
         s.created_at AS createdAt
       FROM lean_challenge_scores s
       JOIN users u ON u.id = s.user_id
       ORDER BY s.duration_seconds ASC, s.completed_at ASC`,
    )
    .all() as LeanChallengeAdminScore[];

  return rows;
}
