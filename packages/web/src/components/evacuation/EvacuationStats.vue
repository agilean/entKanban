<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink } from 'vue-router';
import { useAuthStore } from '../../stores/authStore';
import type { SimStats } from '../../simulation/evacuation/types';

const auth = useAuthStore();

const props = defineProps<{
  stats: SimStats;
  panicRatio: number;
  submitStatus: 'idle' | 'submitting' | 'success' | 'error' | 'login-required';
}>();

const intervalChartPoints = computed(() => {
  const intervals = props.stats.exitIntervals;
  if (intervals.length === 0) return '';

  const maxVal = Math.max(...intervals, 1);
  const width = 280;
  const height = 80;
  const stepX = intervals.length > 1 ? width / (intervals.length - 1) : 0;

  return intervals
    .map((val, i) => {
      const x = i * stepX;
      const y = height - (val / maxVal) * (height - 10);
      return `${i === 0 ? 'M' : 'L'}${x},${y}`;
    })
    .join(' ');
});

const avgIntervalLabel = computed(() =>
  props.stats.avgExitInterval > 0 ? `${props.stats.avgExitInterval.toFixed(2)}s` : '—',
);

const elapsedLabel = computed(() => `${props.stats.elapsedTime.toFixed(1)}s`);

const progressPct = computed(() => {
  if (props.stats.totalAgents === 0) return 0;
  return Math.round((props.stats.evacuatedCount / props.stats.totalAgents) * 100);
});
</script>

<template>
  <div class="stats">
    <h3>实时统计</h3>

    <div class="stat-grid">
      <div class="stat-item">
        <span class="label">已疏散</span>
        <span class="value">{{ stats.evacuatedCount }} / {{ stats.totalAgents }}</span>
      </div>
      <div class="stat-item">
        <span class="label">用时</span>
        <span class="value">{{ elapsedLabel }}</span>
      </div>
      <div class="stat-item">
        <span class="label">平均出口间隔</span>
        <span class="value">{{ avgIntervalLabel }}</span>
      </div>
      <div class="stat-item">
        <span class="label">恐慌比例</span>
        <span class="value" :class="{ panic: panicRatio > 0 }">{{ panicRatio }}%</span>
      </div>
    </div>

    <div class="progress-bar">
      <div class="progress-fill" :style="{ width: `${progressPct}%` }" />
    </div>

    <div v-if="stats.isComplete" class="complete-banner">
      疏散完成！总用时 {{ elapsedLabel }}
      <span v-if="submitStatus === 'submitting'" class="submit-note"> · 成绩提交中…</span>
      <span v-else-if="submitStatus === 'success'" class="submit-note success"> · 已记入排行榜</span>
      <span v-else-if="submitStatus === 'login-required'" class="submit-note">
        · <button type="button" class="inline-btn" @click="auth.login()">登录</button> 后可上榜
      </span>
      <span v-else-if="submitStatus === 'error'" class="submit-note error"> · 成绩提交失败</span>
    </div>

    <div v-if="stats.isComplete && submitStatus === 'success'" class="leaderboard-link">
      <RouterLink to="/leaderboard?game=evacuation">查看疏散排行榜 →</RouterLink>
    </div>

    <div class="chart-section">
      <h4>出口通过间隔</h4>
      <svg v-if="stats.exitIntervals.length > 0" viewBox="0 0 280 80" class="interval-chart">
        <path :d="intervalChartPoints" fill="none" stroke="#6366f1" stroke-width="2" />
      </svg>
      <p v-else class="empty-chart">开始模拟后显示</p>
    </div>

    <div class="hint">
      <strong>排行榜规则：</strong>
      50 人全部疏散后，总用时记入疏散排行榜（用时越短排名越高）。
    </div>
  </div>
</template>

<style scoped>
.stats {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.stats h3 {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
}

.stat-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
}

.stat-item {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.label {
  font-size: 0.75rem;
  color: #64748b;
}

.value {
  font-size: 1.125rem;
  font-weight: 600;
  color: #1e293b;
}

.value.panic {
  color: #dc2626;
}

.progress-bar {
  height: 6px;
  background: #e2e8f0;
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: #22c55e;
  transition: width 0.2s;
}

.complete-banner {
  padding: 0.625rem 0.75rem;
  background: #dcfce7;
  color: #166534;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  font-weight: 500;
}

.submit-note {
  font-weight: 400;
}

.submit-note.success {
  color: #15803d;
}

.submit-note.error {
  color: #b91c1c;
}

.inline-btn {
  border: none;
  background: none;
  color: #2563eb;
  cursor: pointer;
  padding: 0;
  font: inherit;
}

.leaderboard-link {
  font-size: 0.8125rem;
}

.leaderboard-link a {
  color: #2563eb;
  text-decoration: none;
}

.leaderboard-link a:hover {
  text-decoration: underline;
}

.chart-section h4 {
  margin: 0 0 0.5rem;
  font-size: 0.8125rem;
  color: #64748b;
  font-weight: 500;
}

.interval-chart {
  width: 100%;
  height: 80px;
  background: #f8fafc;
  border-radius: 0.375rem;
}

.empty-chart {
  margin: 0;
  font-size: 0.8125rem;
  color: #94a3b8;
  text-align: center;
  padding: 1.5rem 0;
}

.hint {
  padding: 0.75rem;
  background: #eff6ff;
  border-radius: 0.5rem;
  font-size: 0.8125rem;
  color: #1e40af;
  line-height: 1.5;
}

.hint strong {
  display: block;
  margin-bottom: 0.25rem;
}
</style>
