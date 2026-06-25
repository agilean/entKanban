<script setup lang="ts">
import { onMounted } from 'vue';
import KanbanBoard from '../components/board/KanbanBoard.vue';
import PhaseStepper from '../components/board/PhaseStepper.vue';
import AppLayout from '../layouts/AppLayout.vue';
import { useGameStore } from '../stores/gameStore';
import { phaseLabel } from '../utils/phaseLabel';

const game = useGameStore();

onMounted(() => {
  if (!game.hasSession) {
    game.startNewGame();
  }
});

function pendingLabel(kind: string): string {
  const labels: Record<string, string> = {
    'adjust-wip': '调整 WIP 限制',
    'reorder-backlog': '调整 Backlog 顺序',
    expedite: '选择 Expedite 卡片',
    'assign-dice': '分配骰子',
    'ted-training': 'Ted 是否参加培训',
    'blocker-rolls': 'Blocker 掷骰结果',
    confirm: '确认并继续',
  };
  return labels[kind] ?? kind;
}
</script>

<template>
  <AppLayout>
    <section v-if="!game.hasSession" class="panel empty">
      <p>正在初始化游戏…</p>
    </section>

    <template v-else>
      <p v-if="game.lastError" class="error">{{ game.lastError }}</p>

      <PhaseStepper :phase="game.phase" :current-day="game.currentDay" />

      <KanbanBoard v-if="game.boardView" :board="game.boardView" />

      <section class="side-panels">
        <article class="panel">
          <h2>当前阶段</h2>
          <p class="phase">{{ phaseLabel(game.phase) }}</p>
          <p class="meta">已完成 {{ game.snapshotCount }} 个工作日</p>
        </article>

        <article class="panel">
          <h2>待办操作</h2>
          <ul v-if="game.pendingActions.length > 0" class="pending-list">
            <li v-for="(action, index) in game.pendingActions" :key="index">
              {{ pendingLabel(action.kind) }}
              <span v-if="action.kind === 'confirm'" class="tag">{{ action.label }}</span>
            </li>
          </ul>
          <p v-else class="hint">暂无待办</p>
        </article>
      </section>
    </template>
  </AppLayout>
</template>

<style scoped>
.side-panels {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1rem;
  margin-top: 1rem;
}

.panel {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 0.75rem;
  padding: 1rem 1.25rem;
}

.panel h2 {
  margin: 0 0 0.75rem;
  font-size: 0.9375rem;
  font-weight: 600;
}

.phase {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 600;
}

.meta {
  margin: 0.5rem 0 0;
  font-size: 0.8125rem;
  color: #64748b;
}

.pending-list {
  margin: 0;
  padding-left: 1.25rem;
}

.pending-list li {
  margin-bottom: 0.375rem;
  font-size: 0.875rem;
}

.tag {
  margin-left: 0.5rem;
  padding: 0.125rem 0.375rem;
  border-radius: 0.25rem;
  background: #f1f5f9;
  font-size: 0.75rem;
  color: #475569;
}

.hint {
  margin: 0;
  font-size: 0.8125rem;
  color: #94a3b8;
}

.error {
  margin: 0 0 1rem;
  padding: 0.75rem 1rem;
  border-radius: 0.5rem;
  background: #fef2f2;
  color: #b91c1c;
  font-size: 0.875rem;
}

.empty {
  text-align: center;
  color: #64748b;
}
</style>
