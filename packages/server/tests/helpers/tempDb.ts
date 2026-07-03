import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openDatabase, type ReplayDatabase } from '../../src/db.js';

export type TempDatabase = {
  db: ReplayDatabase;
  dir: string;
};

export function openTempDatabase(prefix: string): TempDatabase {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  return {
    db: openDatabase(join(dir, 'test.db')),
    dir,
  };
}

export function cleanupTempDatabase(tempDatabase: TempDatabase | undefined): void {
  if (!tempDatabase) {
    return;
  }

  tempDatabase.db.close();
  rmSync(tempDatabase.dir, { recursive: true, force: true });
}
