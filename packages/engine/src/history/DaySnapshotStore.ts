import type { DaySnapshot } from './DaySnapshot.js';

export class DaySnapshotStore {
  private readonly snapshots: DaySnapshot[] = [];

  append(snapshot: DaySnapshot): void {
    this.snapshots.push(snapshot);
  }

  getAll(): readonly DaySnapshot[] {
    return this.snapshots;
  }

  getLatest(): DaySnapshot | undefined {
    return this.snapshots[this.snapshots.length - 1];
  }

  toArray(): DaySnapshot[] {
    return [...this.snapshots];
  }

  static fromArray(snapshots: DaySnapshot[]): DaySnapshotStore {
    const store = new DaySnapshotStore();
    for (const snapshot of snapshots) {
      store.append(snapshot);
    }
    return store;
  }
}
