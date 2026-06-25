<script setup lang="ts">
import { GamePhase } from '@kanban-game/engine';
import { computed } from 'vue';

const props = defineProps<{
  phase: GamePhase;
  currentDay: number;
}>();

const visible = computed(() => props.currentDay === 9 && props.phase === GamePhase.SETUP);
</script>

<template>
  <aside v-if="visible" class="guide">
    <h2>欢迎来到 getKanban</h2>
    <p>你正在 <strong>Day 9</strong> 的晨会。当前棋盘是团队的真实状态。</p>
    <ul>
      <li>先浏览各列 WIP 与卡片位置，理解价值流瓶颈。</li>
      <li>可选：记录最多 3 次 WIP 限制调整（在后续各日晨会生效）。</li>
      <li>准备好后点击「开始 Day 10」进入正式游戏。</li>
    </ul>
    <p class="hint">提示：Backlog 排队策略会影响后续补货顺序，先观察再决策。</p>
  </aside>
</template>

<style scoped>
.guide {
  margin-bottom: 1rem;
  padding: 1rem 1.25rem;
  border-radius: 0.5rem;
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  color: #1e3a5f;
}

.guide h2 {
  margin: 0 0 0.5rem;
  font-size: 1rem;
}

.guide p {
  margin: 0 0 0.5rem;
  font-size: 0.875rem;
  line-height: 1.5;
}

.guide ul {
  margin: 0 0 0.5rem;
  padding-left: 1.25rem;
  font-size: 0.875rem;
  line-height: 1.6;
}

.hint {
  color: #3b82f6;
  font-size: 0.8125rem;
}
</style>
