<script setup lang="ts">
import { ref, watch } from 'vue';
import draggable from 'vuedraggable';
import { useGameStore } from '../../stores/gameStore';

type BacklogItem = { id: string; name: string };

const props = defineProps<{
  cardNames: string[];
}>();

const game = useGameStore();

function toItems(names: string[]): BacklogItem[] {
  return names.map((name) => ({ id: name, name }));
}

const items = ref<BacklogItem[]>(toItems(props.cardNames));

watch(
  () => props.cardNames,
  (names) => {
    items.value = toItems(names);
  },
);

function apply(): void {
  game.reorderBacklog(items.value.map((item) => item.name));
}
</script>

<template>
  <section class="decision-section">
    <h3>调整 Backlog 顺序</h3>
    <p class="hint">拖拽排序，顶部优先被拉入 Selected</p>

    <draggable v-model="items" item-key="id" class="card-list" @end="apply">
      <template #item="{ element }">
        <div class="card-row">{{ element.name }}</div>
      </template>
    </draggable>
  </section>
</template>

<style scoped>
.decision-section h3 {
  margin: 0 0 0.5rem;
  font-size: 0.875rem;
  font-weight: 600;
}

.hint {
  margin: 0 0 0.75rem;
  font-size: 0.75rem;
  color: #64748b;
}

.card-list {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.card-row {
  padding: 0.5rem 0.625rem;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 0.375rem;
  font-size: 0.8125rem;
  font-weight: 600;
  cursor: grab;
}

.card-row:active {
  cursor: grabbing;
}
</style>
