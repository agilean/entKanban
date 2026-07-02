import { randomUUID } from 'node:crypto';
import type { ReplayDatabase } from './db.js';
import { getOrganizationById, getUserById, type Organization } from './socialDb.js';
import { getConfig } from './config.js';

export function ensureDefaultOrganization(db: ReplayDatabase, creatorUserId: string): Organization {
  const config = getConfig();
  const existing = db
    .prepare('SELECT id FROM organizations WHERE name = ? LIMIT 1')
    .get(config.defaultOrgName) as { id: string } | undefined;

  if (existing) {
    return getOrganizationById(db, existing.id)!;
  }

  const id = randomUUID();
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO organizations (id, name, created_by, created_at)
     VALUES (?, ?, ?, ?)`,
  ).run(id, config.defaultOrgName, creatorUserId, now);
  return getOrganizationById(db, id)!;
}

export function autoJoinDefaultOrganization(db: ReplayDatabase, userId: string): Organization {
  const user = getUserById(db, userId);
  if (!user) {
    throw new Error('User not found');
  }
  if (user.orgId) {
    return getOrganizationById(db, user.orgId)!;
  }

  const org = ensureDefaultOrganization(db, userId);
  db.prepare(`UPDATE users SET org_id = ?, role = 'member' WHERE id = ?`).run(org.id, userId);
  return org;
}

export function getDefaultOrganization(db: ReplayDatabase): Organization | null {
  const config = getConfig();
  const row = db.prepare('SELECT id FROM organizations WHERE name = ? LIMIT 1').get(config.defaultOrgName) as
    | { id: string }
    | undefined;
  return row ? getOrganizationById(db, row.id) : null;
}
