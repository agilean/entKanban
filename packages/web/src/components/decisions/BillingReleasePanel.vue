<script setup lang="ts">
import { computed } from 'vue';
import { useGameStore } from '../../stores/gameStore';

const game = useGameStore();

const billingAction = computed(() =>
  game.pendingActions.find((action) => action.kind === 'billing-summary'),
);

const billingDay = computed(() =>
  billingAction.value && billingAction.value.kind === 'billing-summary'
    ? billingAction.value.billingDay
    : game.currentDay,
);

const summary = computed(() => game.financialSummary);

const rows = computed(() => {
  const s = summary.value;
  const day = billingDay.value;
  if (!s) {
    return [];
  }
  return [
    { label: '本周期新订阅', value: s.getNewSubscribers(day) },
    { label: '累计订阅', value: s.getTotalSubscribersToDate(day) },
    { label: '周期收入', value: s.getBillingCycleRevenue(day) },
    { label: '罚金/奖励', value: s.getFinesOrPayments(day) },
    { label: '周期毛利', value: s.getBillingCycleGrossProfit(day) },
    { label: '累计毛利', value: s.getTotalGrossProfitToDate(day) },
  ];
});

const effectEvents = computed(() => game.releaseEffectEvents);
</script>

<template>
  <section class="billing-panel">
    <header>
      <h3>Day {{ billingDay }} 发布与收益</h3>
      <p class="hint">测试完成与就绪卡片已在掷骰后自动发布，确认收益后点击下方按钮进入下一天</p>
    </header>

    <section v-if="effectEvents.length > 0" class="effects">
      <h4>特殊效果已生效</h4>
      <ul>
        <li v-for="event in effectEvents" :key="`${event.cardName}-${event.kind}`">
          <strong>{{ event.cardName }}</strong>
          <span>{{ event.message }}</span>
        </li>
      </ul>
    </section>

    <dl v-if="summary" class="metrics">
      <div v-for="row in rows" :key="row.label" class="metric-row">
        <dt>{{ row.label }}</dt>
        <dd :class="{ profit: row.label.includes('毛利'), fine: row.label.includes('罚金') && row.value < 0 }">
          {{ row.value }}
        </dd>
      </div>
    </dl>
  </section>
</template>

<style scoped>
.billing-panel {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.billing-panel h3 {
  margin: 0;
  font-size: 0.9375rem;
  font-weight: 700;
  color: #1e293b;
}

.hint {
  margin: 0.375rem 0 0;
  font-size: 0.8125rem;
  color: #64748b;
  line-height: 1.45;
}

.effects {
  padding: 0.625rem 0.75rem;
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  border-radius: 0.5rem;
}

.effects h4 {
  margin: 0 0 0.5rem;
  font-size: 0.8125rem;
  font-weight: 700;
  color: #166534;
}

.effects ul {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.effects li {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  font-size: 0.8125rem;
  color: #334155;
  line-height: 1.4;
}

.effects strong {
  color: #15803d;
  font-size: 0.75rem;
}

.metrics {
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.metric-row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 0.75rem;
  padding: 0.5rem 0.625rem;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 0.5rem;
}

.metric-row dt {
  font-size: 0.8125rem;
  color: #64748b;
}

.metric-row dd {
  margin: 0;
  font-size: 0.875rem;
  font-weight: 700;
  color: #334155;
  font-variant-numeric: tabular-nums;
}

.metric-row dd.profit {
  color: #16a34a;
}

.metric-row dd.fine {
  color: #dc2626;
}
</style>
