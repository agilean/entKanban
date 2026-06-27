import { FinancialSummary } from '@kanban-game/engine';
import { computed } from 'vue';
import { useGameStore } from '../stores/gameStore';
import {
  allDeployedMetrics,
  buildCfdOption,
  buildControlChartOption,
  buildLeadTimeOption,
  buildTimeline,
  percentile,
} from '../utils/analytics';

export function useAnalytics() {
  const game = useGameStore();

  const timeline = computed(() => {
    if (!game.session) {
      return [];
    }
    const summary = game.session.getFinancialSummary();
    const profit = summary.getTotalGrossProfitToDate(
      FinancialSummary.getBillingDay(game.currentDay),
    );
    return buildTimeline(game.snapshots, game.currentDay, game.wipCounts, profit);
  });

  const deployedMetrics = computed(() => allDeployedMetrics(timeline.value));

  const leadTimeP85 = computed(() => percentile(deployedMetrics.value.map((c) => c.leadTime), 85));

  const cfdOption = computed(() => buildCfdOption(timeline.value));
  const controlOption = computed(() => buildControlChartOption(deployedMetrics.value));
  const leadTimeOption = computed(() =>
    buildLeadTimeOption(deployedMetrics.value, leadTimeP85.value),
  );

  const financialSummary = computed(() => game.financialSummary);

  const hasData = computed(() => timeline.value.length > 0);

  return {
    timeline,
    deployedMetrics,
    leadTimeP85,
    cfdOption,
    controlOption,
    leadTimeOption,
    financialSummary,
    hasData,
  };
}
