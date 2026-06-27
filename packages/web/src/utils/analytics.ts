import type { ColumnWipCounts, DaySnapshot, DeployedCardMetrics } from '@kanban-game/engine';

export type TimelinePoint = DaySnapshot & { provisional?: boolean };

/** CFD stack order: Deployed (bottom) → Backlog (top), matching Kanban convention. */
export const CFD_STAGE_ORDER: readonly (keyof ColumnWipCounts)[] = [
  'deployed',
  'readyToDeploy',
  'test',
  'development',
  'analysis',
  'selected',
  'backlog',
];

const CFD_COLUMNS: Array<{ key: keyof ColumnWipCounts; label: string; color: string }> = [
  { key: 'deployed', label: 'Deployed', color: '#64748b' },
  { key: 'readyToDeploy', label: 'Ready', color: '#a855f7' },
  { key: 'test', label: 'Test', color: '#f59e0b' },
  { key: 'development', label: 'Development', color: '#22c55e' },
  { key: 'analysis', label: 'Analysis', color: '#3b82f6' },
  { key: 'selected', label: 'Selected', color: '#60a5fa' },
  { key: 'backlog', label: 'Backlog', color: '#94a3b8' },
];

export type CfdComputed = {
  /** WIP per stage, same order as CFD_STAGE_ORDER. */
  bands: number[];
  /** Cumulative upper bounds (cards that have reached each stage), monotonic non-decreasing. */
  boundaries: number[];
  /** Total cards in the system at this point in time. */
  total: number;
};

/** Derive CFD bands and cumulative "passed through" boundaries from a WIP snapshot. */
export function computeCfdFromWipCounts(wip: ColumnWipCounts): CfdComputed {
  const bands = CFD_STAGE_ORDER.map((key) => wip[key]);
  const boundaries: number[] = [];
  let cum = 0;
  for (const height of bands) {
    cum += height;
    boundaries.push(cum);
  }
  return { bands, boundaries, total: cum };
}

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
  const computed = timeline.map((point) => computeCfdFromWipCounts(point.wipCounts));

  return {
    tooltip: {
      trigger: 'axis',
      formatter: (params: unknown) => formatCfdTooltip(timeline, computed, params),
    },
    legend: { top: 0 },
    grid: { left: 48, right: 16, top: 40, bottom: 28 },
    xAxis: { type: 'category', data: days, boundaryGap: false },
    yAxis: { type: 'value', name: '累计卡片数', min: 0 },
    series: CFD_COLUMNS.map((column, stageIndex) => ({
      name: column.label,
      type: 'line',
      smooth: false,
      symbol: timeline.length <= 14 ? 'circle' : 'none',
      symbolSize: 6,
      showSymbol: timeline.length <= 14,
      itemStyle: { color: column.color },
      lineStyle: { width: 2, color: column.color },
      emphasis: { focus: 'series' },
      data: computed.map((cfd) => cfd.boundaries[stageIndex]!),
    })),
  };
}

type CfdTooltipParam = {
  seriesName: string;
  dataIndex: number;
  color: string;
};

/** Tooltip: cumulative boundary per stage; band thickness = current WIP. */
function formatCfdTooltip(
  timeline: TimelinePoint[],
  computed: CfdComputed[],
  params: unknown,
): string {
  const items = params as CfdTooltipParam[];
  if (!items.length) {
    return '';
  }
  const index = items[0]!.dataIndex;
  const point = timeline[index];
  const cfd = computed[index];
  if (!point || !cfd) {
    return '';
  }
  const lines = CFD_COLUMNS.map((column, stageIndex) => {
    const boundary = cfd.boundaries[stageIndex]!;
    const wip = cfd.bands[stageIndex]!;
    return `${column.label}：累计 <strong>${boundary}</strong>（WIP ${wip}）`;
  });
  return [`Day ${point.day}`, ...lines].join('<br/>');
}

/** Card-type colors matching getKanban physical chart markers. */
export const CARD_TYPE_COLORS = {
  standard: '#92400e',
  fixed: '#ea580c',
  intangible: '#9333ea',
  expedite: '#64748b',
} as const;

export function getCardTypeColor(name: string): string {
  const prefix = name.charAt(0);
  switch (prefix) {
    case 'S':
      return CARD_TYPE_COLORS.standard;
    case 'F':
      return CARD_TYPE_COLORS.fixed;
    case 'I':
      return CARD_TYPE_COLORS.intangible;
    case 'E':
      return CARD_TYPE_COLORS.expedite;
    default:
      return CARD_TYPE_COLORS.expedite;
  }
}

export function buildControlChartOption(metrics: DeployedCardMetrics[]) {
  const labels = metrics.map((card) => card.name);

  return {
    tooltip: {
      trigger: 'item',
      formatter: (params: { name: string; value: number }) =>
        `${params.name}: ${params.value} 天`,
    },
    grid: { left: 40, right: 16, top: 32, bottom: 40 },
    xAxis: { type: 'category', data: labels, axisLabel: { rotate: 45 } },
    yAxis: { type: 'value', name: 'Lead Time', minInterval: 1 },
    series: [
      {
        name: 'Lead Time',
        type: 'line',
        data: metrics.map((card) => ({
          value: card.leadTime,
          itemStyle: { color: getCardTypeColor(card.name) },
        })),
        symbolSize: 10,
        lineStyle: { width: 0 },
        label: {
          show: true,
          position: 'top',
          formatter: '{c}',
          fontSize: 11,
        },
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
