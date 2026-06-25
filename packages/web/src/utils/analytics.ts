import type { ColumnWipCounts, DaySnapshot, DeployedCardMetrics } from '@kanban-game/engine';

export type TimelinePoint = DaySnapshot & { provisional?: boolean };

const CFD_COLUMNS: Array<{ key: keyof ColumnWipCounts; label: string; color: string }> = [
  { key: 'backlog', label: 'Backlog', color: '#94a3b8' },
  { key: 'selected', label: 'Selected', color: '#60a5fa' },
  { key: 'analysis', label: 'Analysis', color: '#3b82f6' },
  { key: 'development', label: 'Development', color: '#22c55e' },
  { key: 'test', label: 'Test', color: '#f59e0b' },
  { key: 'readyToDeploy', label: 'Ready', color: '#a855f7' },
  { key: 'deployed', label: 'Deployed', color: '#64748b' },
];

export function buildTimeline(
  snapshots: readonly DaySnapshot[],
  currentDay: number,
  currentWip: ColumnWipCounts | null,
  currentProfit: number,
): TimelinePoint[] {
  const items: TimelinePoint[] = [...snapshots];
  const last = items[items.length - 1];
  if (currentWip && (!last || last.day < currentDay)) {
    items.push({
      day: currentDay,
      wipCounts: currentWip,
      deployedToday: [],
      totalGrossProfit: currentProfit,
      provisional: true,
    });
  }
  return items;
}

export function allDeployedMetrics(timeline: TimelinePoint[]): DeployedCardMetrics[] {
  return timeline.flatMap((point) => point.deployedToday);
}

export function percentile(values: number[], p: number): number {
  if (values.length === 0) {
    return 0;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)]!;
}

export function buildCfdOption(timeline: TimelinePoint[]) {
  const days = timeline.map((point) => `D${point.day}`);
  return {
    tooltip: { trigger: 'axis' },
    legend: { top: 0 },
    grid: { left: 40, right: 16, top: 40, bottom: 28 },
    xAxis: { type: 'category', data: days },
    yAxis: { type: 'value', name: 'WIP' },
    series: CFD_COLUMNS.map((column) => ({
      name: column.label,
      type: 'line',
      stack: 'cfd',
      areaStyle: { opacity: 0.85 },
      emphasis: { focus: 'series' },
      itemStyle: { color: column.color },
      data: timeline.map((point) => point.wipCounts[column.key]),
    })),
  };
}

export function buildControlChartOption(metrics: DeployedCardMetrics[]) {
  const labels = metrics.map((card) => card.name);
  const cycleTimes = metrics.map((card) => card.cycleTime);
  const mean =
    cycleTimes.length === 0
      ? 0
      : cycleTimes.reduce((sum, value) => sum + value, 0) / cycleTimes.length;

  return {
    tooltip: { trigger: 'axis' },
    grid: { left: 40, right: 16, top: 24, bottom: 40 },
    xAxis: { type: 'category', data: labels, axisLabel: { rotate: 45 } },
    yAxis: { type: 'value', name: 'Cycle Time' },
    series: [
      {
        name: 'Cycle Time',
        type: 'line',
        data: cycleTimes,
        symbolSize: 8,
        itemStyle: { color: '#2563eb' },
      },
      {
        name: 'Mean',
        type: 'line',
        data: labels.map(() => Number(mean.toFixed(2))),
        lineStyle: { type: 'dashed', color: '#ef4444' },
        symbol: 'none',
      },
    ],
  };
}

export function buildLeadTimeOption(metrics: DeployedCardMetrics[], p85: number) {
  const leadTimes = metrics.map((card) => card.leadTime);
  const max = Math.max(...leadTimes, 1);
  const binCount = Math.min(8, Math.max(3, Math.ceil(Math.sqrt(Math.max(leadTimes.length, 1)))));
  const binSize = Math.max(1, Math.ceil(max / binCount));
  const bins = Array.from({ length: binCount }, (_, index) => `${index * binSize}-${(index + 1) * binSize - 1}`);
  const counts = Array(binCount).fill(0);
  for (const value of leadTimes) {
    const index = Math.min(binCount - 1, Math.floor(value / binSize));
    counts[index]! += 1;
  }

  return {
    tooltip: { trigger: 'axis' },
    grid: { left: 40, right: 16, top: 32, bottom: 28 },
    xAxis: { type: 'category', data: bins, name: 'Lead Time' },
    yAxis: { type: 'value', name: 'Cards' },
    title: {
      subtext: metrics.length > 0 ? `P85 = ${p85} 天` : '暂无部署数据',
      left: 'center',
      top: 0,
      subtextStyle: { fontSize: 12, color: '#64748b' },
    },
    series: [
      {
        name: 'Lead Time',
        type: 'bar',
        data: counts,
        itemStyle: { color: '#8b5cf6' },
      },
    ],
  };
}

export function buildRunChartOption(timeline: TimelinePoint[]) {
  return {
    tooltip: { trigger: 'axis' },
    grid: { left: 40, right: 16, top: 24, bottom: 28 },
    xAxis: { type: 'category', data: timeline.map((point) => `D${point.day}`) },
    yAxis: { type: 'value', name: 'Deployed' },
    series: [
      {
        name: 'Deployed',
        type: 'bar',
        data: timeline.map((point) => point.deployedToday.length),
        itemStyle: { color: '#16a34a' },
      },
    ],
  };
}
