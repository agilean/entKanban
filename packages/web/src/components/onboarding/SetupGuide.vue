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

    <section class="special-cards">
      <h3>特殊卡片（本局重点）</h3>
      <dl>
        <div class="card-entry">
          <dt>F1 · 固定交付日</dt>
          <dd>须在 Day 15 前部署。按期免 $1,500 罚金；逾期在发布日扣 $1,500。</dd>
        </div>
        <div class="card-entry">
          <dt>I1 · 基础设施</dt>
          <dd>进入<strong>就绪列</strong>后生效：就绪列改为每日均可发布（部署频率 = 1）。</dd>
        </div>
        <div class="card-entry">
          <dt>I2 · 技术债</dt>
          <dd>进入<strong>就绪列</strong>后生效：测试列所有卡片测试工作量 -2，新进测试列的卡也会自动减 2。</dd>
        </div>
      </dl>
      <p class="tip">发布日（Day 9 / 12 / 15…）侧栏会列出已触发的特殊效果。</p>
    </section>
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
  margin: 0 0 0.75rem;
  padding-left: 1.25rem;
  font-size: 0.875rem;
  line-height: 1.6;
}

.special-cards {
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px solid #bfdbfe;
}

.special-cards h3 {
  margin: 0 0 0.5rem;
  font-size: 0.875rem;
  font-weight: 700;
}

.special-cards dl {
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.card-entry dt {
  font-size: 0.8125rem;
  font-weight: 700;
  color: #1e40af;
}

.card-entry dd {
  margin: 0.125rem 0 0;
  font-size: 0.8125rem;
  line-height: 1.45;
  color: #334155;
}

.tip {
  margin: 0.625rem 0 0;
  font-size: 0.75rem;
  color: #64748b;
  font-style: italic;
}
</style>
