import { randomUUID } from 'node:crypto';
import type { ReplayDatabase } from './db.js';
import { getUserById } from './socialDb.js';

export type PlaySessionStatus = 'lobby' | 'active' | 'closed';
export type ParticipantRole = 'host' | 'player';
export type ParticipantStatus = 'joined' | 'playing' | 'completed';
export type PlayInvitationStatus = 'pending' | 'accepted' | 'expired';

export type PlaySession = {
  id: string;
  hostUserId: string;
  orgId: string | null;
  gameType: string;
  title: string;
  status: PlaySessionStatus;
  createdAt: string;
  startedAt: string | null;
  closedAt: string | null;
};

export type PlaySessionParticipant = {
  playSessionId: string;
  userId: string;
  role: ParticipantRole;
  status: ParticipantStatus;
  gameSessionId: string | null;
  score: number | null;
  deployedCount: number | null;
  currentDay: number | null;
  phase: string | null;
  joinedAt: string;
  completedAt: string | null;
  userName?: string;
  avatarUrl?: string | null;
};

export type PlaySessionInvitation = {
  id: string;
  playSessionId: string;
  token: string;
  invitedBy: string;
  status: PlayInvitationStatus;
  expiresAt: string;
  createdAt: string;
};

export type PlaySessionLeaderboardEntry = {
  rank: number;
  userId: string;
  userName: string;
  avatarUrl: string | null;
  status: ParticipantStatus;
  score: number | null;
  deployedCount: number | null;
  currentDay: number | null;
  completedAt: string | null;
};

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

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

export function migratePlaySessions(db: ReplayDatabase): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS play_sessions (
      id TEXT PRIMARY KEY,
      host_user_id TEXT NOT NULL REFERENCES users(id),
      org_id TEXT REFERENCES organizations(id),
      game_type TEXT NOT NULL,
      title TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'lobby',
      created_at TEXT NOT NULL,
      started_at TEXT,
      closed_at TEXT
    );

    CREATE TABLE IF NOT EXISTS play_session_participants (
      play_session_id TEXT NOT NULL REFERENCES play_sessions(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role TEXT NOT NULL DEFAULT 'player',
      status TEXT NOT NULL DEFAULT 'joined',
      game_session_id TEXT,
      score INTEGER,
      deployed_count INTEGER,
      current_day INTEGER,
      phase TEXT,
      joined_at TEXT NOT NULL,
      completed_at TEXT,
      PRIMARY KEY (play_session_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS play_session_invitations (
      id TEXT PRIMARY KEY,
      play_session_id TEXT NOT NULL REFERENCES play_sessions(id) ON DELETE CASCADE,
      token TEXT NOT NULL UNIQUE,
      invited_by TEXT NOT NULL REFERENCES users(id),
      status TEXT NOT NULL DEFAULT 'pending',
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_play_sessions_host ON play_sessions(host_user_id);
    CREATE INDEX IF NOT EXISTS idx_play_participants_user ON play_session_participants(user_id);
    CREATE INDEX IF NOT EXISTS idx_play_invitations_token ON play_session_invitations(token);
  `);

  addColumnIfMissing(db, 'game_sessions', 'user_id', 'TEXT REFERENCES users(id)');
  addColumnIfMissing(db, 'game_sessions', 'play_session_id', 'TEXT REFERENCES play_sessions(id)');
  addColumnIfMissing(db, 'game_results', 'play_session_id', 'TEXT REFERENCES play_sessions(id)');
}

function parsePlaySession(row: {
  id: string;
  host_user_id: string;
  org_id: string | null;
  game_type: string;
  title: string;
  status: string;
  created_at: string;
  started_at: string | null;
  closed_at: string | null;
}): PlaySession {
  return {
    id: row.id,
    hostUserId: row.host_user_id,
    orgId: row.org_id,
    gameType: row.game_type,
    title: row.title,
    status: row.status as PlaySessionStatus,
    createdAt: row.created_at,
    startedAt: row.started_at,
    closedAt: row.closed_at,
  };
}

export function createPlaySession(
  db: ReplayDatabase,
  hostUserId: string,
  input: { gameType: string; title: string; orgId?: string | null },
): PlaySession {
  const host = getUserById(db, hostUserId);
  if (!host) {
    throw new Error('User not found');
  }
  if (input.orgId && host.orgId !== input.orgId) {
    throw new Error('User is not in the specified organization');
  }

  const id = randomUUID();
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO play_sessions
      (id, host_user_id, org_id, game_type, title, status, created_at, started_at, closed_at)
     VALUES (?, ?, ?, ?, ?, 'lobby', ?, NULL, NULL)`,
  ).run(id, hostUserId, input.orgId ?? host.orgId ?? null, input.gameType, input.title.trim(), now);

  db.prepare(
    `INSERT INTO play_session_participants
      (play_session_id, user_id, role, status, joined_at)
     VALUES (?, ?, 'host', 'joined', ?)`,
  ).run(id, hostUserId, now);

  return getPlaySessionById(db, id)!;
}

export function getPlaySessionById(db: ReplayDatabase, id: string): PlaySession | null {
  const row = db.prepare('SELECT * FROM play_sessions WHERE id = ?').get(id) as
    | {
        id: string;
        host_user_id: string;
        org_id: string | null;
        game_type: string;
        title: string;
        status: string;
        created_at: string;
        started_at: string | null;
        closed_at: string | null;
      }
    | undefined;
  return row ? parsePlaySession(row) : null;
}

export function listPlaySessionsForUser(db: ReplayDatabase, userId: string): PlaySession[] {
  const rows = db
    .prepare(
      `SELECT s.*
       FROM play_sessions s
       JOIN play_session_participants p ON p.play_session_id = s.id
       WHERE p.user_id = ?
       ORDER BY s.created_at DESC`,
    )
    .all(userId) as Array<{
    id: string;
    host_user_id: string;
    org_id: string | null;
    game_type: string;
    title: string;
    status: string;
    created_at: string;
    started_at: string | null;
    closed_at: string | null;
  }>;
  return rows.map(parsePlaySession);
}

export function getPlaySessionParticipants(
  db: ReplayDatabase,
  playSessionId: string,
): PlaySessionParticipant[] {
  const rows = db
    .prepare(
      `SELECT
         p.play_session_id AS playSessionId,
         p.user_id AS userId,
         p.role,
         p.status,
         p.game_session_id AS gameSessionId,
         p.score,
         p.deployed_count AS deployedCount,
         p.current_day AS currentDay,
         p.phase,
         p.joined_at AS joinedAt,
         p.completed_at AS completedAt,
         u.name AS userName,
         u.avatar_url AS avatarUrl
       FROM play_session_participants p
       JOIN users u ON u.id = p.user_id
       WHERE p.play_session_id = ?
       ORDER BY p.joined_at ASC`,
    )
    .all(playSessionId) as Array<{
    playSessionId: string;
    userId: string;
    role: string;
    status: string;
    gameSessionId: string | null;
    score: number | null;
    deployedCount: number | null;
    currentDay: number | null;
    phase: string | null;
    joinedAt: string;
    completedAt: string | null;
    userName: string;
    avatarUrl: string | null;
  }>;

  return rows.map((row) => ({
    playSessionId: row.playSessionId,
    userId: row.userId,
    role: row.role as ParticipantRole,
    status: row.status as ParticipantStatus,
    gameSessionId: row.gameSessionId,
    score: row.score,
    deployedCount: row.deployedCount,
    currentDay: row.currentDay,
    phase: row.phase,
    joinedAt: row.joinedAt,
    completedAt: row.completedAt,
    userName: row.userName,
    avatarUrl: row.avatarUrl,
  }));
}

export function getParticipant(
  db: ReplayDatabase,
  playSessionId: string,
  userId: string,
): PlaySessionParticipant | null {
  return getPlaySessionParticipants(db, playSessionId).find((p) => p.userId === userId) ?? null;
}

export function joinPlaySession(db: ReplayDatabase, playSessionId: string, userId: string): void {
  const session = getPlaySessionById(db, playSessionId);
  if (!session) {
    throw new Error('Play session not found');
  }
  if (session.status === 'closed') {
    throw new Error('Play session is closed');
  }
  const existing = getParticipant(db, playSessionId, userId);
  if (existing) {
    return;
  }
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO play_session_participants
      (play_session_id, user_id, role, status, joined_at)
     VALUES (?, ?, 'player', 'joined', ?)`,
  ).run(playSessionId, userId, now);
}

export function startPlaySession(db: ReplayDatabase, playSessionId: string, userId: string): PlaySession {
  const session = getPlaySessionById(db, playSessionId);
  if (!session) {
    throw new Error('Play session not found');
  }
  if (session.hostUserId !== userId) {
    throw new Error('Only the host can start the session');
  }
  if (session.status !== 'lobby') {
    throw new Error('Play session is not in lobby state');
  }
  const now = new Date().toISOString();
  db.prepare(`UPDATE play_sessions SET status = 'active', started_at = ? WHERE id = ?`).run(
    now,
    playSessionId,
  );
  return getPlaySessionById(db, playSessionId)!;
}

export function createPlaySessionInvitation(
  db: ReplayDatabase,
  playSessionId: string,
  invitedBy: string,
): PlaySessionInvitation {
  const session = getPlaySessionById(db, playSessionId);
  if (!session) {
    throw new Error('Play session not found');
  }
  const inviter = getParticipant(db, playSessionId, invitedBy);
  if (!inviter || inviter.role !== 'host') {
    throw new Error('Only the host can create invitations');
  }

  const id = randomUUID();
  const token = randomUUID().replace(/-/g, '');
  const now = new Date();
  const expiresAt = new Date(now.getTime() + INVITE_TTL_MS).toISOString();
  db.prepare(
    `INSERT INTO play_session_invitations
      (id, play_session_id, token, invited_by, status, expires_at, created_at)
     VALUES (?, ?, ?, ?, 'pending', ?, ?)`,
  ).run(id, playSessionId, token, invitedBy, expiresAt, now.toISOString());

  return getPlaySessionInvitationByToken(db, token)!;
}

export function getPlaySessionInvitationByToken(
  db: ReplayDatabase,
  token: string,
): PlaySessionInvitation | null {
  const row = db.prepare('SELECT * FROM play_session_invitations WHERE token = ?').get(token) as
    | {
        id: string;
        play_session_id: string;
        token: string;
        invited_by: string;
        status: string;
        expires_at: string;
        created_at: string;
      }
    | undefined;
  if (!row) {
    return null;
  }
  return {
    id: row.id,
    playSessionId: row.play_session_id,
    token: row.token,
    invitedBy: row.invited_by,
    status: row.status as PlayInvitationStatus,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
  };
}

export function getPlaySessionInvitationPreview(
  db: ReplayDatabase,
  token: string,
): { token: string; playSessionTitle: string; gameType: string; status: PlayInvitationStatus; expired: boolean; expiresAt: string } | null {
  markExpiredPlayInvitations(db, token);
  const invitation = getPlaySessionInvitationByToken(db, token);
  if (!invitation) {
    return null;
  }
  const session = getPlaySessionById(db, invitation.playSessionId);
  if (!session) {
    return null;
  }
  const expired =
    invitation.status === 'expired' || new Date(invitation.expiresAt).getTime() < Date.now();
  return {
    token: invitation.token,
    playSessionTitle: session.title,
    gameType: session.gameType,
    status: expired ? 'expired' : invitation.status,
    expired,
    expiresAt: invitation.expiresAt,
  };
}

function markExpiredPlayInvitations(db: ReplayDatabase, token: string): void {
  const now = new Date().toISOString();
  db.prepare(
    `UPDATE play_session_invitations
     SET status = 'expired'
     WHERE token = ? AND status = 'pending' AND expires_at < ?`,
  ).run(token, now);
}

export function acceptPlaySessionInvitation(
  db: ReplayDatabase,
  token: string,
  userId: string,
): PlaySession {
  markExpiredPlayInvitations(db, token);
  const invitation = getPlaySessionInvitationByToken(db, token);
  if (!invitation) {
    throw new Error('Invitation not found');
  }
  if (invitation.status !== 'pending') {
    throw new Error('Invitation is no longer valid');
  }
  if (new Date(invitation.expiresAt).getTime() < Date.now()) {
    throw new Error('Invitation has expired');
  }
  joinPlaySession(db, invitation.playSessionId, userId);
  db.prepare(`UPDATE play_session_invitations SET status = 'accepted' WHERE id = ?`).run(
    invitation.id,
  );
  return getPlaySessionById(db, invitation.playSessionId)!;
}

export function bindParticipantGameSession(
  db: ReplayDatabase,
  playSessionId: string,
  userId: string,
  gameSessionId: string,
): void {
  const session = getPlaySessionById(db, playSessionId);
  if (!session) {
    throw new Error('Play session not found');
  }
  if (session.status === 'closed') {
    throw new Error('Play session is closed');
  }
  const participant = getParticipant(db, playSessionId, userId);
  if (!participant) {
    throw new Error('User is not a participant');
  }
  db.prepare(
    `UPDATE play_session_participants
     SET game_session_id = ?, status = 'playing'
     WHERE play_session_id = ? AND user_id = ?`,
  ).run(gameSessionId, playSessionId, userId);

  db.prepare(
    `UPDATE game_sessions SET user_id = ?, play_session_id = ? WHERE id = ?`,
  ).run(userId, playSessionId, gameSessionId);
}

export function updateParticipantProgress(
  db: ReplayDatabase,
  gameSessionId: string,
  userId: string,
  progress: { currentDay: number; phase: string },
): void {
  db.prepare(
    `UPDATE play_session_participants
     SET current_day = ?, phase = ?, status = CASE WHEN status = 'joined' THEN 'playing' ELSE status END
     WHERE game_session_id = ? AND user_id = ?`,
  ).run(progress.currentDay, progress.phase, gameSessionId, userId);
}

export function completeParticipant(
  db: ReplayDatabase,
  playSessionId: string,
  userId: string,
  result: { score: number; deployedCount: number; currentDay: number },
): void {
  const now = new Date().toISOString();
  db.prepare(
    `UPDATE play_session_participants
     SET status = 'completed', score = ?, deployed_count = ?, current_day = ?, completed_at = ?
     WHERE play_session_id = ? AND user_id = ?`,
  ).run(result.score, result.deployedCount, result.currentDay, now, playSessionId, userId);
}

export function getPlaySessionLeaderboard(
  db: ReplayDatabase,
  playSessionId: string,
): PlaySessionLeaderboardEntry[] {
  const participants = getPlaySessionParticipants(db, playSessionId);
  const sorted = [...participants].sort((a, b) => {
    const scoreA = a.status === 'completed' ? (a.score ?? -Infinity) : -Infinity;
    const scoreB = b.status === 'completed' ? (b.score ?? -Infinity) : -Infinity;
    if (scoreA !== scoreB) {
      return scoreB - scoreA;
    }
    return a.joinedAt.localeCompare(b.joinedAt);
  });

  return sorted.map((p, index) => ({
    rank: index + 1,
    userId: p.userId,
    userName: p.userName ?? 'Player',
    avatarUrl: p.avatarUrl ?? null,
    status: p.status,
    score: p.score,
    deployedCount: p.deployedCount,
    currentDay: p.currentDay,
    completedAt: p.completedAt,
  }));
}

export function canUserWriteGameSession(
  db: ReplayDatabase,
  gameSessionId: string,
  userId: string | null,
): boolean {
  const row = db
    .prepare('SELECT user_id, play_session_id FROM game_sessions WHERE id = ?')
    .get(gameSessionId) as { user_id: string | null; play_session_id: string | null } | undefined;
  if (!row) {
    return true;
  }
  if (!row.user_id && !row.play_session_id) {
    return true;
  }
  if (!userId) {
    return false;
  }
  return row.user_id === userId;
}
