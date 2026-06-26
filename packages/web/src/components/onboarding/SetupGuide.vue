<script setup lang="ts">
import { GamePhase } from '@kanban-game/engine';
import { computed } from 'vue';

const props = defineProps<{
  phase: GamePhase;
  currentDay: number;
}>();

const visible = computed(() => props.currentDay === 9 && props.phase === GamePhase.REPLENISH);
</script>

<template>
  <aside v-if="visible" class="guide">
    <h2>欢迎来到 getKanban</h2>
    <p>你正在 <strong>Day 9</strong> 准备阶段。当前棋盘是团队的真实状态。</p>
    <ul>
      <li>浏览各列 WIP 与卡片位置，点击卡片右上角 ⓘ 查看详情。</li>
      <li>准备阶段可填充优先列、拖入 Expedite 加速、将列底骰子拖到卡片上分配。</li>
      <li>分配完成后点击「掷骰子」：动画结束后自动结算并进入下一天。</li>
    </ul>
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
  margin: 0;
  padding-left: 1.25rem;
  font-size: 0.875rem;
  line-height: 1.6;
}
</style>
