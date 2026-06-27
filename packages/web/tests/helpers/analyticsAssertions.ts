import { expect } from 'vitest';
import type { ColumnWipCounts } from '@kanban-game/engine';
import {
  CFD_STAGE_ORDER,
  computeCfdFromWipCounts,
  type TimelinePoint,
} from '../../src/utils/analytics';

/** Assert CFD invariants for a single WIP snapshot. */
export function expectCfdSnapshotValid(wip: ColumnWipCounts): void {
  const { bands, boundaries, total } = computeCfdFromWipCounts(wip);

  expect(bands).toHaveLength(CFD_STAGE_ORDER.length);
  expect(boundaries).toHaveLength(CFD_STAGE_ORDER.length);
  expect(total).toBe(CFD_STAGE_ORDER.reduce((sum, key) => sum + wip[key], 0));

  for (let i = 1; i < boundaries.length; i++) {
    expect(boundaries[i]).toBeGreaterThanOrEqual(boundaries[i - 1]!);
  }

  expect(boundaries[0]).toBe(wip.deployed);
  expect(total).toBe(boundaries[boundaries.length - 1]);
}

/** Assert cumulative CFD boundaries never decrease across a timeline. */
export function expectCfdTimelineMonotonic(timeline: TimelinePoint[]): void {
  if (timeline.length === 0) {
    return;
  }

  for (const point of timeline) {
    expectCfdSnapshotValid(point.wipCounts);
  }

  if (timeline.length < 2) {
    return;
  }

  const stageCount = CFD_STAGE_ORDER.length;
  for (let stage = 0; stage < stageCount; stage++) {
    for (let day = 1; day < timeline.length; day++) {
      const prev = computeCfdFromWipCounts(timeline[day - 1]!.wipCounts).boundaries[stage]!;
      const curr = computeCfdFromWipCounts(timeline[day]!.wipCounts).boundaries[stage]!;
      expect(curr).toBeGreaterThanOrEqual(prev);
    }
  }
}
