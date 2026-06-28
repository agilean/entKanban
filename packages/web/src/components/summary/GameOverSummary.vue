<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { RouterLink } from 'vue-router';
import { useAuthStore } from '../../stores/authStore';
import { useGameStore } from '../../stores/gameStore';
import { useUiStore } from '../../stores/uiStore';
import { submitGameResult } from '../../utils/leaderboardApi';
import { getReplaySessionId } from '../../utils/replayApi';

const game = useGameStore();
const ui = useUiStore();
const auth = useAuthStore();

const submitStatus = ref<'idle' | 'submitting' | 'success' | 'error'>('idle');

const deployedCount = computed(() => game.board?.getDeployed().getCards().length ?? 0);

const totalProfit = computed(() => {
  const summary = game.financialSummary;
  if (!summary) {
    return 0;
  }
  return summary.getTotalGrossProfitToDate(21);
});

function submissionKey(): string {
  return `kanban-result-submitted:${getReplaySessionId()}`;
}

async function submitResultIfNeeded(): Promise<void> {
  if (!auth.isLoggedIn || !game.isGameOver) {
    return;
  }
  if (sessionStorage.getItem(submissionKey()) === '1') {
    submitStatus.value = 'success';
    return;
  }
  submitStatus.value = 'submitting';
  const ok = await submitGameResult({
    sessionId: getReplaySessionId(),
    score: totalProfit.value,
    deployedCount: deployedCount.value,
    snapshotCount: game.snapshotCount,
  });
  if (ok) {
    sessionStorage.setItem(submissionKey(), '1');
    submitStatus.value = 'success';
    return;
  }
  submitStatus.value = 'error';
}

function viewFinance(): void {
  ui.dismissGameOver();
  ui.setTab('finance');
}

function dismiss(): void {
  ui.dismissGameOver();
}

onMounted(async () => {
  if (!auth.initialized) {
    await auth.initialize();
  }
  await submitResultIfNeeded();
});

watch(
  () => game.isGameOver,
  (isOver) => {
    if (isOver) {
      void submitResultIfNeeded();
    }
  },
);
</script>

<template>
  <div class="overlay" role="dialog" aria-labelledby="game-over-title">
    <div class="panel">
      <h2 id="game-over-title">游戏结束</h2>
      <p class="lead">21 天挑战已完成，以下是最终成绩。</p>

      <dl class="stats">
        <div>
          <dt>累计净利润</dt>
          <dd :class="{ positive: totalProfit >= 0, negative: totalProfit < 0 }">
            {{ totalProfit >= 0 ? '+' : '' }}{{ totalProfit.toLocaleString() }}
          </dd>
        </div>
        <div>
          <dt>已部署卡片</dt>
          <dd>{{ deployedCount }}</dd>
        </div>
        <div>
          <dt>历史快照</dt>
          <dd>{{ game.snapshotCount }} 天</dd>
        </div>
      </dl>

      <p v-if="auth.isLoggedIn && submitStatus === 'submitting'" class="status">正在提交排行榜成绩…</p>
      <p v-else-if="auth.isLoggedIn && submitStatus === 'success'" class="status success">
        成绩已计入排行榜。
      </p>
      <p v-else-if="auth.isLoggedIn && submitStatus === 'error'" class="status error">
        成绩提交失败，请稍后重试。
      </p>
      <p v-else-if="!auth.isLoggedIn" class="status hint">
        <button type="button" class="inline-btn" @click="auth.login()">飞书登录</button>
        后可参与排行榜。
      </p>

      <div class="actions">
        <button type="button" class="btn" @click="dismiss">关闭，查看数据</button>
        <RouterLink to="/leaderboard" class="btn">查看排行榜</RouterLink>
        <button type="button" class="btn primary" @click="viewFinance">查看财务详情</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(15, 23, 42, 0.45);
  padding: 1rem;
}

.panel {
  width: min(28rem, 100%);
  padding: 1.5rem;
  border-radius: 0.75rem;
  background: #fff;
  box-shadow: 0 20px 40px rgba(15, 23, 42, 0.15);
}

.panel h2 {
  margin: 0 0 0.5rem;
  font-size: 1.25rem;
}

.lead {
  margin: 0 0 1.25rem;
  color: #64748b;
  font-size: 0.875rem;
}

.stats {
  display: grid;
  gap: 0.75rem;
  margin: 0 0 1.25rem;
}

.stats div {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  padding: 0.5rem 0;
  border-bottom: 1px solid #f1f5f9;
}

dt {
  font-size: 0.875rem;
  color: #64748b;
}

dd {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 700;
  color: #1e293b;
}

dd.positive {
  color: #15803d;
}

dd.negative {
  color: #b91c1c;
}

.status {
  margin: 0 0 1rem;
  font-size: 0.875rem;
}

.status.success {
  color: #15803d;
}

.status.error {
  color: #b91c1c;
}

.status.hint {
  color: #64748b;
}

.inline-btn {
  border: none;
  background: none;
  color: #2563eb;
  cursor: pointer;
  padding: 0;
  font: inherit;
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.btn {
  border: 1px solid #cbd5e1;
  background: #fff;
  color: #334155;
  border-radius: 0.5rem;
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
  cursor: pointer;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
}

.btn.primary {
  background: #2563eb;
  border-color: #2563eb;
  color: #fff;
}

.btn.primary:hover {
  background: #1d4ed8;
}
</style>
