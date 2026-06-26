<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { DaysFactory } from '@kanban-game/engine';
import { useGameStore } from '../../stores/gameStore';
import { buildCardDetail, type CardDetail } from '../../utils/buildCardDetail';

const props = defineProps<{
  cardName: string;
  anchorRect: DOMRect;
}>();

const emit = defineEmits<{
  close: [];
}>();

const game = useGameStore();
const popoverRef = ref<HTMLElement | null>(null);

const detail = computed((): CardDetail | null => {
  void game.boardEpoch;
  if (!game.board) {
    return null;
  }
  const card = game.board.findCardByName(props.cardName);
  if (!card) {
    return null;
  }
  const training = game.session?.supportsTraining() ?? false;
  const day = new DaysFactory(training).getDay(game.currentDay);
  return buildCardDetail(card, game.currentDay, day);
});

const style = computed(() => {
  const rect = props.anchorRect;
  const width = 16 * 16;
  let left = rect.right + 8;
  let top = rect.top;

  if (typeof window !== 'undefined') {
    if (left + width > window.innerWidth - 12) {
      left = rect.left - width - 8;
    }
    if (top + 280 > window.innerHeight - 12) {
      top = Math.max(12, window.innerHeight - 292);
    }
    left = Math.max(12, left);
    top = Math.max(12, top);
  }

  return {
    left: `${left}px`,
    top: `${top}px`,
    width: `${width}px`,
  };
});

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') {
    emit('close');
  }
}

function onBackdropClick(event: MouseEvent): void {
  if (event.target === event.currentTarget) {
    emit('close');
  }
}

onMounted(() => {
  window.addEventListener('keydown', onKeydown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown);
});
</script>

<template>
  <div class="card-detail-backdrop" @click="onBackdropClick">
    <aside
      ref="popoverRef"
      class="card-detail-popover"
      :style="style"
      role="dialog"
      :aria-label="`${cardName} 卡片详情`"
      @click.stop
    >
      <header class="popover-header">
        <div>
          <h3>{{ detail?.name ?? cardName }}</h3>
          <p class="title">{{ detail?.title }}</p>
        </div>
        <button type="button" class="btn-close" aria-label="关闭" @click="emit('close')">×</button>
      </header>

      <p v-if="detail" class="description">{{ detail.description }}</p>

      <section v-if="detail?.effect" class="effect-section">
        <h4>卡片作用</h4>
        <p class="effect">{{ detail.effect }}</p>
      </section>

      <section v-if="detail" class="effort-section">
        <h4>剩余工作量</h4>
        <div class="effort-row">
          <span class="effort analysis">A {{ detail.effort.analysis }}</span>
          <span class="effort development">D {{ detail.effort.development }}</span>
          <span class="effort test">T {{ detail.effort.test }}</span>
        </div>
      </section>

      <section v-if="detail && detail.metrics.length > 0" class="metrics-section">
        <h4>卡片数据</h4>
        <dl class="metrics">
          <template v-for="metric in detail.metrics" :key="metric.label">
            <dt>{{ metric.label }}</dt>
            <dd>{{ metric.value }}</dd>
          </template>
        </dl>
      </section>
    </aside>
  </div>
</template>

<style scoped>
.card-detail-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: rgb(15 23 42 / 12%);
}

.card-detail-popover {
  position: fixed;
  z-index: 1001;
  background: #fff;
  border: 1px solid #cbd5e1;
  border-radius: 0.75rem;
  box-shadow: 0 12px 32px rgb(15 23 42 / 18%);
  padding: 0.875rem 1rem;
  max-height: calc(100vh - 24px);
  overflow-y: auto;
}

.popover-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 0.5rem;
}

.popover-header h3 {
  margin: 0;
  font-size: 1rem;
  font-weight: 700;
  color: #0f172a;
}

.title {
  margin: 0.125rem 0 0;
  font-size: 0.8125rem;
  color: #64748b;
}

.btn-close {
  border: none;
  background: #f1f5f9;
  color: #475569;
  width: 1.75rem;
  height: 1.75rem;
  border-radius: 999px;
  font-size: 1.125rem;
  line-height: 1;
  cursor: pointer;
}

.description {
  margin: 0.75rem 0 0;
  font-size: 0.8125rem;
  line-height: 1.5;
  color: #334155;
}

.effect {
  margin: 0;
  font-size: 0.8125rem;
  line-height: 1.5;
  color: #5b21b6;
  background: #f5f3ff;
  border-radius: 0.375rem;
  padding: 0.5rem 0.625rem;
}

.effort-section,
.effect-section,
.metrics-section {
  margin-top: 0.875rem;
}

.effort-section h4,
.effect-section h4,
.metrics-section h4 {
  margin: 0 0 0.375rem;
  font-size: 0.75rem;
  font-weight: 700;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.effort-row {
  display: flex;
  gap: 0.375rem;
}

.effort {
  padding: 0.125rem 0.5rem;
  border-radius: 0.25rem;
  font-size: 0.75rem;
  font-weight: 700;
}

.effort.analysis {
  background: #dbeafe;
  color: #1d4ed8;
}

.effort.development {
  background: #dcfce7;
  color: #15803d;
}

.effort.test {
  background: #fef3c7;
  color: #b45309;
}

.metrics {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.25rem 0.75rem;
  margin: 0;
  font-size: 0.8125rem;
}

.metrics dt {
  color: #64748b;
  font-weight: 500;
}

.metrics dd {
  margin: 0;
  color: #1e293b;
  font-weight: 600;
}
</style>
