<script setup lang="ts">
import { computed } from 'vue';
import { useAnalytics } from '../../composables/useAnalytics';

const { financialSummary } = useAnalytics();

const billingDays = [9, 12, 15, 18, 21];

const rows = computed(() => {
  const summary = financialSummary.value;
  if (!summary) {
    return [];
  }
  return [
    { label: 'New Subscribers', get: (day: number) => summary.getNewSubscribers(day) },
    { label: 'Total Subscribers', get: (day: number) => summary.getTotalSubscribersToDate(day) },
    { label: 'Cycle Revenue', get: (day: number) => summary.getBillingCycleRevenue(day) },
    { label: 'Fines or Payments', get: (day: number) => summary.getFinesOrPayments(day) },
    { label: 'Cycle Gross Profit', get: (day: number) => summary.getBillingCycleGrossProfit(day) },
    {
      label: 'Gross Profit To Date',
      get: (day: number) => summary.getTotalGrossProfitToDate(day),
    },
  ];
});

const finalProfit = computed(() => {
  const summary = financialSummary.value;
  if (!summary) {
    return 0;
  }
  return summary.getTotalGrossProfitToDate(21);
});
</script>

<template>
  <section class="chart-panel">
    <h2>财务表</h2>
    <p class="desc">
      计费周期 Day 9/12/15/18/21 · 当前累计净利润
      <strong>{{ finalProfit }}</strong>
    </p>

    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th />
            <th v-for="day in billingDays" :key="day">Day {{ day }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in rows" :key="row.label">
            <th scope="row">{{ row.label }}</th>
            <td v-for="day in billingDays" :key="day">{{ row.get(day) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

<style scoped>
.chart-panel {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 0.75rem;
  padding: 1rem;
}

.chart-panel h2 {
  margin: 0;
  font-size: 1rem;
  font-weight: 700;
}

.desc {
  margin: 0.25rem 0 0.75rem;
  font-size: 0.8125rem;
  color: #64748b;
}

.desc strong {
  color: #16a34a;
  margin-left: 0.25rem;
}

.table-wrap {
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.8125rem;
}

th,
td {
  border: 1px solid #e2e8f0;
  padding: 0.5rem 0.625rem;
  text-align: right;
}

th[scope='row'] {
  text-align: left;
  font-weight: 600;
  color: #334155;
  background: #f8fafc;
}

thead th {
  background: #eff6ff;
  color: #1e40af;
  font-weight: 600;
}
</style>
