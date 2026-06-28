import { randomUUID } from 'node:crypto';
import type { ReplayDatabase } from './db.js';

export type UserRole = 'member' | 'admin';
export type InvitationStatus = 'pending' | 'accepted' | 'expired';

export type User = {
  id: string;
  feishuOpenId: string;
  feishuUnionId: string | null;
  name: string;
  avatarUrl: string | null;
  orgId: string | null;
  role: UserRole;
  createdAt: string;
};

export type Organization = {
  id: string;
  name: string;
  createdBy: string;
  createdAt: string;
};

export type OrgInvitation = {
  id: string;
  orgId: string;
  token: string;
  invitedBy: string;
  status: InvitationStatus;
  expiresAt: string;
  createdAt: string;
};

export type GameResult = {
  id: string;
  userId: string;
  orgId: string | null;
  sessionId: string;
  score: number;
  deployedCount: number;
  snapshotCount: number;
  completedAt: string;
};

export type UserWithOrg = User & {
  org: Organization | null;
};

export type LeaderboardEntry = {
  rank: number;
  userId: string;
  userName: string;
  avatarUrl: string | null;
  orgId: string | null;
  orgName: string | null;
  score: number;
  deployedCount: number;
  snapshotCount: number;
  completedAt: string;
};

export type InvitationPreview = {
  token: string;
  orgName: string;
  status: InvitationStatus;
  expired: boolean;
  expiresAt: string;
};

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export function migrateSocial(db: ReplayDatabase): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      feishu_open_id TEXT NOT NULL UNIQUE,
      feishu_union_id TEXT,
      name TEXT NOT NULL,
      avatar_url TEXT,
      org_id TEXT REFERENCES organizations(id),
      role TEXT NOT NULL DEFAULT 'member',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS organizations (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      created_by TEXT NOT NULL REFERENCES users(id),
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS org_invitations (
      id TEXT PRIMARY KEY,
      org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      token TEXT NOT NULL UNIQUE,
      invited_by TEXT NOT NULL REFERENCES users(id),
      status TEXT NOT NULL DEFAULT 'pending',
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS game_results (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      org_id TEXT REFERENCES organizations(id),
      session_id TEXT NOT NULL,
      score INTEGER NOT NULL,
      deployed_count INTEGER NOT NULL,
      snapshot_count INTEGER NOT NULL,
      completed_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_users_org ON users(org_id);
    CREATE INDEX IF NOT EXISTS idx_game_results_score ON game_results(score DESC, completed_at DESC);
    CREATE INDEX IF NOT EXISTS idx_game_results_org_score ON game_results(org_id, score DESC, completed_at DESC);
    CREATE INDEX IF NOT EXISTS idx_org_invitations_token ON org_invitations(token);
  `);
}

function parseUser(row: {
  id: string;
  feishu_open_id: string;
  feishu_union_id: string | null;
  name: string;
  avatar_url: string | null;
  org_id: string | null;
  role: string;
  created_at: string;
}): User {
  return {
    id: row.id,
    feishuOpenId: row.feishu_open_id,
    feishuUnionId: row.feishu_union_id,
    name: row.name,
    avatarUrl: row.avatar_url,
    orgId: row.org_id,
    role: row.role as UserRole,
    createdAt: row.created_at,
  };
}

function parseOrganization(row: {
  id: string;
  name: string;
  created_by: string;
  created_at: string;
}): Organization {
  return {
    id: row.id,
    name: row.name,
    createdBy: row.created_by,
    createdAt: row.created_at,
  };
}

export function upsertUserByFeishu(
  db: ReplayDatabase,
  profile: {
    feishuOpenId: string;
    feishuUnionId?: string | null;
    name: string;
    avatarUrl?: string | null;
  },
): User {
  const existing = db
    .prepare('SELECT * FROM users WHERE feishu_open_id = ?')
    .get(profile.feishuOpenId) as
    | {
        id: string;
        feishu_open_id: string;
        feishu_union_id: string | null;
        name: string;
        avatar_url: string | null;
        org_id: string | null;
        role: string;
        created_at: string;
      }
    | undefined;

  if (existing) {
    db.prepare(
      `UPDATE users
       SET feishu_union_id = ?, name = ?, avatar_url = ?
       WHERE id = ?`,
    ).run(
      profile.feishuUnionId ?? existing.feishu_union_id,
      profile.name,
      profile.avatarUrl ?? existing.avatar_url,
      existing.id,
    );
    return getUserById(db, existing.id)!;
  }

  const id = randomUUID();
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO users (id, feishu_open_id, feishu_union_id, name, avatar_url, org_id, role, created_at)
     VALUES (?, ?, ?, ?, ?, NULL, 'member', ?)`,
  ).run(
    id,
    profile.feishuOpenId,
    profile.feishuUnionId ?? null,
    profile.name,
    profile.avatarUrl ?? null,
    now,
  );
  return getUserById(db, id)!;
}

export function getUserById(db: ReplayDatabase, userId: string): User | null {
  const row = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as
    | {
        id: string;
        feishu_open_id: string;
        feishu_union_id: string | null;
        name: string;
        avatar_url: string | null;
        org_id: string | null;
        role: string;
        created_at: string;
      }
    | undefined;
  return row ? parseUser(row) : null;
}

export function getUserWithOrg(db: ReplayDatabase, userId: string): UserWithOrg | null {
  const user = getUserById(db, userId);
  if (!user) {
    return null;
  }
  const org = user.orgId ? getOrganizationById(db, user.orgId) : null;
  return { ...user, org };
}

export function createOrganization(
  db: ReplayDatabase,
  userId: string,
  name: string,
): Organization {
  const user = getUserById(db, userId);
  if (!user) {
    throw new Error('User not found');
  }
  if (user.orgId) {
    throw new Error('User already belongs to an organization');
  }

  const id = randomUUID();
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO organizations (id, name, created_by, created_at)
     VALUES (?, ?, ?, ?)`,
  ).run(id, name.trim(), userId, now);
  db.prepare(`UPDATE users SET org_id = ?, role = 'admin' WHERE id = ?`).run(id, userId);
  return getOrganizationById(db, id)!;
}

export function getOrganizationById(db: ReplayDatabase, orgId: string): Organization | null {
  const row = db.prepare('SELECT * FROM organizations WHERE id = ?').get(orgId) as
    | {
        id: string;
        name: string;
        created_by: string;
        created_at: string;
      }
    | undefined;
  return row ? parseOrganization(row) : null;
}

export function createInvitation(
  db: ReplayDatabase,
  orgId: string,
  invitedBy: string,
): OrgInvitation {
  const org = getOrganizationById(db, orgId);
  if (!org) {
    throw new Error('Organization not found');
  }
  const inviter = getUserById(db, invitedBy);
  if (!inviter || inviter.orgId !== orgId || inviter.role !== 'admin') {
    throw new Error('Only organization admins can create invitations');
  }

  const id = randomUUID();
  const token = randomUUID().replace(/-/g, '');
  const now = new Date();
  const expiresAt = new Date(now.getTime() + INVITE_TTL_MS).toISOString();
  db.prepare(
    `INSERT INTO org_invitations (id, org_id, token, invited_by, status, expires_at, created_at)
     VALUES (?, ?, ?, ?, 'pending', ?, ?)`,
  ).run(id, orgId, token, invitedBy, expiresAt, now.toISOString());

  return getInvitationByToken(db, token)!;
}

export function getInvitationByToken(db: ReplayDatabase, token: string): OrgInvitation | null {
  const row = db.prepare('SELECT * FROM org_invitations WHERE token = ?').get(token) as
    | {
        id: string;
        org_id: string;
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
    orgId: row.org_id,
    token: row.token,
    invitedBy: row.invited_by,
    status: row.status as InvitationStatus,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
  };
}

function markExpiredInvitations(db: ReplayDatabase, token: string): void {
  const now = new Date().toISOString();
  db.prepare(
    `UPDATE org_invitations
     SET status = 'expired'
     WHERE token = ? AND status = 'pending' AND expires_at < ?`,
  ).run(token, now);
}

export function getInvitationPreview(db: ReplayDatabase, token: string): InvitationPreview | null {
  markExpiredInvitations(db, token);
  const invitation = getInvitationByToken(db, token);
  if (!invitation) {
    return null;
  }
  const org = getOrganizationById(db, invitation.orgId);
  if (!org) {
    return null;
  }
  const expired =
    invitation.status === 'expired' || new Date(invitation.expiresAt).getTime() < Date.now();
  return {
    token: invitation.token,
    orgName: org.name,
    status: expired ? 'expired' : invitation.status,
    expired,
    expiresAt: invitation.expiresAt,
  };
}

export function acceptInvitation(db: ReplayDatabase, token: string, userId: string): Organization {
  markExpiredInvitations(db, token);
  const invitation = getInvitationByToken(db, token);
  if (!invitation) {
    throw new Error('Invitation not found');
  }
  if (invitation.status !== 'pending') {
    throw new Error('Invitation is no longer valid');
  }
  if (new Date(invitation.expiresAt).getTime() < Date.now()) {
    throw new Error('Invitation has expired');
  }

  const user = getUserById(db, userId);
  if (!user) {
    throw new Error('User not found');
  }
  if (user.orgId) {
    throw new Error('User already belongs to an organization');
  }

  const org = getOrganizationById(db, invitation.orgId);
  if (!org) {
    throw new Error('Organization not found');
  }

  db.prepare(`UPDATE users SET org_id = ?, role = 'member' WHERE id = ?`).run(org.id, userId);
  db.prepare(`UPDATE org_invitations SET status = 'accepted' WHERE id = ?`).run(invitation.id);
  return org;
}

export function insertGameResult(
  db: ReplayDatabase,
  input: {
    userId: string;
    sessionId: string;
    score: number;
    deployedCount: number;
    snapshotCount: number;
  },
): GameResult {
  const user = getUserById(db, input.userId);
  if (!user) {
    throw new Error('User not found');
  }

  const id = randomUUID();
  const completedAt = new Date().toISOString();
  db.prepare(
    `INSERT INTO game_results
      (id, user_id, org_id, session_id, score, deployed_count, snapshot_count, completed_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    input.userId,
    user.orgId,
    input.sessionId,
    input.score,
    input.deployedCount,
    input.snapshotCount,
    completedAt,
  );

  return {
    id,
    userId: input.userId,
    orgId: user.orgId,
    sessionId: input.sessionId,
    score: input.score,
    deployedCount: input.deployedCount,
    snapshotCount: input.snapshotCount,
    completedAt,
  };
}

export function getGlobalLeaderboard(
  db: ReplayDatabase,
  limit = 50,
  offset = 0,
): LeaderboardEntry[] {
  const rows = db
    .prepare(
      `SELECT
         r.id,
         r.user_id AS userId,
         u.name AS userName,
         u.avatar_url AS avatarUrl,
         r.org_id AS orgId,
         o.name AS orgName,
         r.score,
         r.deployed_count AS deployedCount,
         r.snapshot_count AS snapshotCount,
         r.completed_at AS completedAt
       FROM game_results r
       JOIN users u ON u.id = r.user_id
       LEFT JOIN organizations o ON o.id = r.org_id
       ORDER BY r.score DESC, r.completed_at ASC
       LIMIT ? OFFSET ?`,
    )
    .all(limit, offset) as Array<{
    id: string;
    userId: string;
    userName: string;
    avatarUrl: string | null;
    orgId: string | null;
    orgName: string | null;
    score: number;
    deployedCount: number;
    snapshotCount: number;
    completedAt: string;
  }>;

  return rows.map((row, index) => ({
    rank: offset + index + 1,
    userId: row.userId,
    userName: row.userName,
    avatarUrl: row.avatarUrl,
    orgId: row.orgId,
    orgName: row.orgName,
    score: row.score,
    deployedCount: row.deployedCount,
    snapshotCount: row.snapshotCount,
    completedAt: row.completedAt,
  }));
}

export function getOrgLeaderboard(
  db: ReplayDatabase,
  orgId: string,
  limit = 50,
  offset = 0,
): LeaderboardEntry[] {
  const rows = db
    .prepare(
      `SELECT
         r.id,
         r.user_id AS userId,
         u.name AS userName,
         u.avatar_url AS avatarUrl,
         r.org_id AS orgId,
         o.name AS orgName,
         r.score,
         r.deployed_count AS deployedCount,
         r.snapshot_count AS snapshotCount,
         r.completed_at AS completedAt
       FROM game_results r
       JOIN users u ON u.id = r.user_id
       LEFT JOIN organizations o ON o.id = r.org_id
       WHERE r.org_id = ?
       ORDER BY r.score DESC, r.completed_at ASC
       LIMIT ? OFFSET ?`,
    )
    .all(orgId, limit, offset) as Array<{
    id: string;
    userId: string;
    userName: string;
    avatarUrl: string | null;
    orgId: string | null;
    orgName: string | null;
    score: number;
    deployedCount: number;
    snapshotCount: number;
    completedAt: string;
  }>;

  return rows.map((row, index) => ({
    rank: offset + index + 1,
    userId: row.userId,
    userName: row.userName,
    avatarUrl: row.avatarUrl,
    orgId: row.orgId,
    orgName: row.orgName,
    score: row.score,
    deployedCount: row.deployedCount,
    snapshotCount: row.snapshotCount,
    completedAt: row.completedAt,
  }));
}

export function listOrgMembers(db: ReplayDatabase, orgId: string): User[] {
  const rows = db
    .prepare('SELECT * FROM users WHERE org_id = ? ORDER BY created_at ASC')
    .all(orgId) as Array<{
    id: string;
    feishu_open_id: string;
    feishu_union_id: string | null;
    name: string;
    avatar_url: string | null;
    org_id: string | null;
    role: string;
    created_at: string;
  }>;
  return rows.map(parseUser);
}
