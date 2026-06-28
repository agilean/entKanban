<script setup lang="ts">
import { COLUMN_NEXT, type FlowColumnId } from '@kanban-game/engine';
import { computed } from 'vue';
import { useDragPolicy } from '../../composables/useDragPolicy';
import { useGameStore } from '../../stores/gameStore';
import { useUiStore } from '../../stores/uiStore';
import { columnLabel, nextColumnLabel } from '../../utils/columnLabels';
import MobileActionSheet from './MobileActionSheet.vue';

const game = useGameStore();
const ui = useUiStore();
const { canPullToSelected, canAdvanceFlow } = useDragPolicy();

const target = computed(() => ui.mobileCardTarget);

const cardName = computed(() => target.value?.cardName ?? '');
const fromColumn = computed(() => target.value?.fromColumn ?? '');

const nextColumn = computed(() => {
  const from = fromColumn.value as FlowColumnId;
  return COLUMN_NEXT[from] ?? null;
});

const canPull = computed(() => {
  if (!target.value || fromColumn.value !== 'backlog' || !canPullToSelected.value) {
    return false;
  }
  return game.checkPullToSelected(cardName.value).ok;
});

const canAdvance = computed(() => {
  if (!target.value || !canAdvanceFlow.value || !nextColumn.value) {
    return false;
  }
  return game.checkAdvance(fromColumn.value, nextColumn.value, cardName.value).ok;
});

const advanceReason = computed(() => {
  if (!target.value || !nextColumn.value) {
    return '';
  }
  const check = game.checkAdvance(fromColumn.value, nextColumn.value, cardName.value);
  return check.ok ? '' : check.reason;
});

function close(): void {
  ui.closeMobileCardActions();
}

function handlePullToSelected(): void {
  const result = game.pullToSelected(cardName.value);
  if (!result?.ok && result?.error) {
    ui.showDragToast(result.error);
  }
  close();
}

function handleAdvance(): void {
  if (!nextColumn.value) {
    return;
  }
  const result = game.advanceCard(fromColumn.value, nextColumn.value, cardName.value);
  if (!result?.ok && result?.error) {
    ui.showDragToast(result.error);
  }
  close();
}
</script>

<template>
  <MobileActionSheet :open="Boolean(target)" :title="`${cardName} · ${columnLabel(fromColumn)}`" @close="close">
    <div class="actions">
      <button v-if="canPull" type="button" class="action-btn primary" @click="handlePullToSelected">
        拉入优先列
      </button>
      <button
        v-if="canAdvance && nextColumn"
        type="button"
        class="action-btn primary"
        @click="handleAdvance"
      >
        推进到{{ nextColumnLabel(fromColumn) }}
      </button>
      <p v-if="canAdvanceFlow && nextColumn && !canAdvance && advanceReason" class="hint">
        {{ advanceReason }}
      </p>
      <p v-if="!canPull && !canAdvance" class="hint">当前阶段暂无可用操作，可长按查看卡片详情。</p>
      <button type="button" class="action-btn" @click="close">取消</button>
    </div>
  </MobileActionSheet>
</template>

<style scoped>
.actions {
  display: grid;
  gap: 0.5rem;
  padding: 0.5rem;
}

.action-btn {
  border: 1px solid #e2e8f0;
  background: #fff;
  border-radius: 0.625rem;
  padding: 0.875rem 1rem;
  font-size: 0.9375rem;
  cursor: pointer;
  text-align: center;
}

.action-btn.primary {
  background: #2563eb;
  border-color: #2563eb;
  color: #fff;
}

.hint {
  margin: 0;
  padding: 0.5rem 0.75rem;
  font-size: 0.8125rem;
  color: #64748b;
  line-height: 1.4;
}
</style>
