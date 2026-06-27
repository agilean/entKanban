import type { DeployedCardMetrics } from '@kanban-game/engine';
import { describe, expect, it } from 'vitest';
import {
  allDeployedMetrics,
  buildControlChartOption,
  buildTimeline,
  CARD_TYPE_COLORS,
  getCardTypeColor,
} from '../../src/utils/analytics';
import { OFFICIAL_DAY9_DEPLOY_FLOW, OFFICIAL_DEPLOY_FLOW } from '../fixtures/cardFlowScenarios';
import {
  expectControlChartOptionValid,
  expectDeployedCountMatchesCfd,
} from '../helpers/analyticsAssertions';
import { simulateCardFlow } from '../helpers/cardFlowSimulation';

describe('getCardTypeColor', () => {
  it('maps ticket prefixes to getKanban marker colors', () => {
    expect(getCardTypeColor('S1')).toBe(CARD_TYPE_COLORS.standard);
    expect(getCardTypeColor('F1')).toBe(CARD_TYPE_COLORS.fixed);
    expect(getCardTypeColor('I2')).toBe(CARD_TYPE_COLORS.intangible);
    expect(getCardTypeColor('E1')).toBe(CARD_TYPE_COLORS.expedite);
  });
});

describe('buildControlChartOption', () => {
  it('returns empty chart config when no cards are deployed', () => {
    const option = buildControlChartOption([]);

    expect(option.xAxis.data).toEqual([]);
    expect(option.series).toHaveLength(1);
    expect(option.series[0]!.data).toEqual([]);
    expect(option.yAxis).toMatchObject({ name: 'Lead Time' });
  });

  it('colors each card type independently', () => {
    const metrics: DeployedCardMetrics[] = [
      { name: 'S1', cycleTime: 8, leadTime: 8 },
      { name: 'F1', cycleTime: 6, leadTime: 6 },
      { name: 'I1', cycleTime: 5, leadTime: 5 },
      { name: 'E1', cycleTime: 4, leadTime: 4 },
    ];

    const option = buildControlChartOption(metrics);
    expectControlChartOptionValid(option, metrics);
  });
});

describe('Control chart with simulated card flow', () => {
  it('tracks lead times in deployment order using official Day 9/12 scenario', () => {
    const snapshots = simulateCardFlow(OFFICIAL_DEPLOY_FLOW, 12);
    const timeline = buildTimeline(snapshots, 12, null, 0);
    const metrics = allDeployedMetrics(timeline);

    expect(metrics.map((card) => card.name)).toEqual(['S1', 'S2', 'S4']);
    // S4 deploys on Day 12 (daySelected=3) → leadTime = 9
    expect(metrics.map((card) => card.leadTime)).toEqual([8, 8, 9]);

    const option = buildControlChartOption(metrics);
    expectControlChartOptionValid(option, metrics);
    expectDeployedCountMatchesCfd(timeline);
  });

  it('matches getKanban facilitator walkthrough lead times when all deploy on Day 9', () => {
    const snapshots = simulateCardFlow(OFFICIAL_DAY9_DEPLOY_FLOW, 9);
    const metrics = allDeployedMetrics(buildTimeline(snapshots, 9, null, 0));

    expect(metrics.map((card) => card.name)).toEqual(['S1', 'S2', 'S4']);
    expect(metrics.map((card) => card.leadTime)).toEqual([8, 8, 6]);

    expectControlChartOptionValid(buildControlChartOption(metrics), metrics);
  });

  it('appends points progressively as cards deploy on later days', () => {
    const day9Snapshots = simulateCardFlow([OFFICIAL_DEPLOY_FLOW[0]!], 9);
    const day12Snapshots = simulateCardFlow(OFFICIAL_DEPLOY_FLOW, 12);

    const day9Metrics = allDeployedMetrics(buildTimeline(day9Snapshots, 9, null, 0));
    const day12Metrics = allDeployedMetrics(buildTimeline(day12Snapshots, 12, null, 0));

    expect(day9Metrics.map((card) => card.name)).toEqual(['S1', 'S2']);
    expect(day12Metrics.map((card) => card.name)).toEqual(['S1', 'S2', 'S4']);
    expect(day9Metrics).toHaveLength(2);
    expect(day12Metrics).toHaveLength(3);

    expectControlChartOptionValid(buildControlChartOption(day9Metrics), day9Metrics);
    expectControlChartOptionValid(buildControlChartOption(day12Metrics), day12Metrics);
  });
});
