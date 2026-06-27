import { expect } from 'vitest';
import type { ColumnWipCounts, DeployedCardMetrics } from '@kanban-game/engine';
import {
  allDeployedMetrics,
  CFD_STAGE_ORDER,
  computeCfdFromWipCounts,
  getCardTypeColor,
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

type EChartsSeries = {
  name: string;
  type: string;
  lineStyle?: { width: number };
  label?: { show: boolean };
  data: Array<number | { value: number; itemStyle?: { color?: string } }>;
};

type ControlChartOption = {
  xAxis: { data: string[] };
  yAxis: { name: string };
  series: EChartsSeries[];
};

function seriesLeadTimeValues(series: EChartsSeries): number[] {
  return series.data.map((point) => (typeof point === 'number' ? point : point.value));
}

/** Assert control chart option matches getKanban Run Chart rules. */
export function expectControlChartOptionValid(
  option: ControlChartOption,
  expectedMetrics: DeployedCardMetrics[],
): void {
  expect(option.yAxis).toMatchObject({ name: 'Lead Time' });
  expect(option.xAxis.data).toEqual(expectedMetrics.map((card) => card.name));
  expect(option.series).toHaveLength(1);

  const [series] = option.series;
  expect(series!.name).toBe('Lead Time');
  expect(series!.type).toBe('line');
  expect(series!.lineStyle).toMatchObject({ width: 0 });
  expect(series!.label).toMatchObject({ show: true });
  expect(seriesLeadTimeValues(series!)).toEqual(expectedMetrics.map((card) => card.leadTime));

  for (let i = 0; i < expectedMetrics.length; i++) {
    const point = series!.data[i]!;
    expect(typeof point).toBe('object');
    const styled = point as { value: number; itemStyle: { color: string } };
    expect(styled.value).toBe(expectedMetrics[i]!.leadTime);
    expect(styled.itemStyle.color).toBe(getCardTypeColor(expectedMetrics[i]!.name));
  }
}

/** Deployed card count on control chart must match CFD cumulative deployed boundary. */
export function expectDeployedCountMatchesCfd(timeline: TimelinePoint[]): void {
  if (timeline.length === 0) {
    return;
  }

  const deployedMetrics = allDeployedMetrics(timeline);
  const lastPoint = timeline[timeline.length - 1]!;
  const deployedBoundary = computeCfdFromWipCounts(lastPoint.wipCounts).boundaries[0]!;

  expect(deployedMetrics.length).toBe(deployedBoundary);
}
