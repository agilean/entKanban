<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useGameStore } from '../../stores/gameStore';
import { useUiStore } from '../../stores/uiStore';
import MobileActionSheet from './MobileActionSheet.vue';

const game = useGameStore();
const ui = useUiStore();

const items = ref<string[]>([]);

const backlogCards = computed(
  () => game.boardView?.columns.find((column) => column.id === 'backlog')?.cards.map((c) => c.name) ?? [],
);

watch(
  () => ui.mobileBacklogReorderOpen,
  (open) => {
    if (open) {
      items.value = [...backlogCards.value];
    }
  },
);

function moveUp(index: number): void {
  if (index <= 0) {
    return;
  }
  const next = [...items.value];
  const temp = next[index - 1]!;
  next[index - 1] = next[index]!;
  next[index] = temp;
  items.value = next;
}

function moveDown(index: number): void {
  if (index >= items.value.length - 1) {
    return;
  }
  const next = [...items.value];
  const temp = next[index + 1]!;
  next[index + 1] = next[index]!;
  next[index] = temp;
  items.value = next;
}

function apply(): void {
  game.reorderBacklog(items.value);
  ui.closeMobileBacklogReorder();
}
</script>

<template>
  <MobileActionSheet
    :open="ui.mobileBacklogReorderOpen"
    title="调整存量顺序"
    @close="ui.closeMobileBacklogReorder()"
  >
    <p class="hint">顶部优先被拉入优先列。使用 ↑↓ 调整顺序。</p>
    <ul class="list">
      <li v-for="(name, index) in items" :key="name" class="row">
        <span class="name">{{ name }}</span>
        <div class="row-actions">
          <button type="button" class="icon-btn" :disabled="index === 0" @click="moveUp(index)">↑</button>
          <button
            type="button"
            class="icon-btn"
            :disabled="index === items.length - 1"
            @click="moveDown(index)"
          >
            ↓
          </button>
        </div>
      </li>
    </ul>
    <button type="button" class="apply-btn" @click="apply">保存顺序</button>
  </MobileActionSheet>
</template>

<style scoped>
.hint {
  margin: 0 0 0.75rem;
  padding: 0 0.5rem;
  font-size: 0.8125rem;
  color: #64748b;
}

.list {
  list-style: none;
  margin: 0;
  padding: 0 0.5rem;
  display: grid;
  gap: 0.375rem;
}

.row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.625rem 0.75rem;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 0.5rem;
}

.name {
  font-weight: 600;
  font-size: 0.875rem;
}

.row-actions {
  display: flex;
  gap: 0.25rem;
}

.icon-btn {
  min-width: 2.25rem;
  min-height: 2.25rem;
  border: 1px solid #cbd5e1;
  background: #fff;
  border-radius: 0.375rem;
  cursor: pointer;
}

.icon-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.apply-btn {
  display: block;
  width: calc(100% - 1rem);
  margin: 1rem auto 0.5rem;
  border: none;
  background: #2563eb;
  color: #fff;
  border-radius: 0.625rem;
  padding: 0.875rem;
  font-size: 0.9375rem;
  cursor: pointer;
}
</style>
