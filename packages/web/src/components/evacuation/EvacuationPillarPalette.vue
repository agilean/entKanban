<script setup lang="ts">
import type { ObstacleKind } from '../../simulation/evacuation/types';

defineProps<{
  disabled: boolean;
}>();

const emit = defineEmits<{
  dragStart: [kind: ObstacleKind];
  dragEnd: [];
}>();

const pillars: { kind: ObstacleKind; label: string }[] = [
  { kind: 'circle', label: '圆形' },
  { kind: 'rect', label: '方形' },
  { kind: 'ellipse', label: '椭圆' },
];

function onDragStart(kind: ObstacleKind, event: DragEvent): void {
  if (!event.dataTransfer) return;
  event.dataTransfer.setData('application/x-evacuation-obstacle', kind);
  event.dataTransfer.effectAllowed = 'copy';
  emit('dragStart', kind);
}

function onDragEnd(): void {
  emit('dragEnd');
}
</script>

<template>
  <aside class="palette" :class="{ disabled }">
    <p class="palette-title">柱体</p>
    <p class="palette-hint">拖入房间</p>
    <div class="pillar-list">
      <div
        v-for="pillar in pillars"
        :key="pillar.kind"
        class="pillar-item"
        :draggable="!disabled"
        @dragstart="onDragStart(pillar.kind, $event)"
        @dragend="onDragEnd"
      >
        <svg viewBox="0 0 48 48" class="pillar-icon" aria-hidden="true">
          <rect width="48" height="48" fill="#f8fafc" rx="6" />
          <g v-if="pillar.kind === 'circle'">
            <circle cx="24" cy="24" r="17" fill="#cbd5e1" stroke="#64748b" stroke-width="2" />
          </g>
          <g v-else-if="pillar.kind === 'rect'">
            <rect x="8" y="8" width="32" height="32" fill="#cbd5e1" stroke="#64748b" stroke-width="2" />
          </g>
          <g v-else>
            <ellipse cx="24" cy="24" rx="20" ry="12" fill="#cbd5e1" stroke="#64748b" stroke-width="2" />
          </g>
        </svg>
        <span class="pillar-label">{{ pillar.label }}</span>
      </div>
    </div>
  </aside>
</template>

<style scoped>
.palette {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  width: 5.5rem;
  flex-shrink: 0;
  padding: 0.75rem 0.5rem;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 0.75rem 0 0 0.75rem;
  border-right: none;
}

.palette.disabled {
  opacity: 0.55;
  pointer-events: none;
}

.palette-title {
  margin: 0;
  font-size: 0.75rem;
  font-weight: 600;
  color: #334155;
}

.palette-hint {
  margin: 0;
  font-size: 0.625rem;
  color: #94a3b8;
  text-align: center;
  line-height: 1.3;
}

.pillar-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  width: 100%;
}

.pillar-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  padding: 0.375rem;
  border-radius: 0.5rem;
  cursor: grab;
  transition: background 0.15s;
}

.pillar-item:hover {
  background: #e2e8f0;
}

.pillar-item:active {
  cursor: grabbing;
}

.pillar-icon {
  width: 3rem;
  height: 3rem;
  border-radius: 0.375rem;
  border: 1px solid #e2e8f0;
}

.pillar-label {
  font-size: 0.6875rem;
  color: #64748b;
}

@media (max-width: 900px) {
  .palette {
    flex-direction: row;
    flex-wrap: wrap;
    justify-content: center;
    width: 100%;
    border-radius: 0.75rem 0.75rem 0 0;
    border-right: 1px solid #e2e8f0;
    border-bottom: none;
    padding: 0.625rem;
  }

  .pillar-list {
    flex-direction: row;
    gap: 1rem;
  }
}
</style>
