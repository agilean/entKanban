import { captureWipCounts, Board } from '@kanban-game/engine';
import { describe, expect, it } from 'vitest';
import {
  buildCfdOption,
  buildTimeline,
  CFD_STAGE_ORDER,
  computeCfdFromWipCounts,
} from '../../src/utils/analytics';
import { expectCfdSnapshotValid, expectCfdTimelineMonotonic } from '../helpers/analyticsAssertions';
import { simulateCardFlow } from '../helpers/cardFlowSimulation';
import { OFFICIAL_DEPLOY_FLOW } from '../fixtures/cardFlowScenarios';

describe('computeCfdFromWipCounts', () => {
  it('derives monotonic cumulative boundaries from WIP snapshot', () => {
    const wip = {
      backlog: 8,
      selected: 2,
      analysis: 1,
      development: 0,
      test: 0,
      readyToDeploy: 0,
      deployed: 2,
    };

    const cfd = computeCfdFromWipCounts(wip);

    expect(cfd.bands).toEqual([2, 0, 0, 0, 1, 2, 8]);
    expect(cfd.boundaries).toEqual([2, 2, 2, 2, 3, 5, 13]);
    expect(cfd.total).toBe(13);
    expectCfdSnapshotValid(wip);
  });

  it('treats deployed boundary as cumulative completed count', () => {
    const before = computeCfdFromWipCounts({
      backlog: 10,
      selected: 0,
      analysis: 0,
      development: 0,
      test: 0,
      readyToDeploy: 0,
      deployed: 0,
    });
    const after = computeCfdFromWipCounts({
      backlog: 8,
      selected: 0,
      analysis: 0,
      development: 0,
      test: 0,
      readyToDeploy: 0,
      deployed: 2,
    });

    expect(before.boundaries[0]).toBe(0);
    expect(after.boundaries[0]).toBe(2);
    expect(before.total).toBe(after.total);
  });
});

describe('buildCfdOption', () => {
  it('stacks stages from Deployed (bottom) to Backlog (top)', () => {
    const board = new Board();
    const wip = captureWipCounts(board);
    const option = buildCfdOption([
      {
        day: 1,
        wipCounts: wip,
        deployedToday: [],
        totalGrossProfit: 0,
      },
    ]);

    const series = option.series as Array<{ name: string; data: number[] }>;
    expect(series.map((item) => item.name)).toEqual([
      'Deployed',
      'Ready',
      'Test',
      'Development',
      'Analysis',
      'Selected',
      'Backlog',
    ]);
    expect(option.yAxis).toMatchObject({ name: '累计卡片数' });
  });
});

describe('CFD with simulated card flow', () => {
  it('keeps cumulative boundaries monotonic as cards deploy over multiple days', () => {
    const snapshots = simulateCardFlow(OFFICIAL_DEPLOY_FLOW, 12);

    const timeline = buildTimeline(snapshots, 12, null, 0);
    expectCfdTimelineMonotonic(timeline);

    const day8 = snapshots[7]!.wipCounts;
    const day9 = snapshots[8]!.wipCounts;
    const day12 = snapshots[11]!.wipCounts;

    expect(computeCfdFromWipCounts(day8).boundaries[0]).toBe(0);
    expect(computeCfdFromWipCounts(day9).boundaries[0]).toBe(2);
    expect(computeCfdFromWipCounts(day12).boundaries[0]).toBe(3);

    expect(computeCfdFromWipCounts(day8).total).toBe(computeCfdFromWipCounts(day12).total);
  });

  it('tracks cumulative passed-through counts when pulling from backlog to selected', () => {
    const snapshots = simulateCardFlow(
      [
        {
          day: 2,
          actions: [{ type: 'pull-to-selected', cardName: 'S11' }],
        },
      ],
      2,
    );

    const before = snapshots[0]!.wipCounts;
    const after = snapshots[1]!.wipCounts;

    expect(before.backlog).toBeGreaterThan(after.backlog);
    expect(after.selected).toBe(before.selected + 1);

    const selectedIndex = CFD_STAGE_ORDER.indexOf('selected');
    const cumBefore = computeCfdFromWipCounts(before).boundaries[selectedIndex]!;
    const cumAfter = computeCfdFromWipCounts(after).boundaries[selectedIndex]!;

    expect(cumAfter).toBeGreaterThan(cumBefore);
    expectCfdTimelineMonotonic(buildTimeline(snapshots, 2, null, 0));
  });
});
