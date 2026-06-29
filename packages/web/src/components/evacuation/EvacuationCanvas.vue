<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue';
import { canPlaceObstacle, createObstacle } from '../../simulation/evacuation/obstacles';
import type { EvacuationEngine } from '../../simulation/evacuation/engine';
import type { Obstacle, ObstacleKind } from '../../simulation/evacuation/types';

const props = defineProps<{
  engine: EvacuationEngine;
  frameTick: number;
  draggingKind: ObstacleKind | null;
  isRunning: boolean;
  registerDraw: (cb: () => void) => void;
  unregisterDraw: () => void;
}>();

const emit = defineEmits<{
  dropObstacle: [kind: ObstacleKind, x: number, y: number];
  dropRejected: [];
}>();

const canvasRef = ref<HTMLCanvasElement | null>(null);
const containerRef = ref<HTMLDivElement | null>(null);
const canvasSize = ref({ width: 600, height: 600 });
const isDragOver = ref(false);
const dragPreview = ref<{ x: number; y: number } | null>(null);
const dragPreviewValid = ref(true);

const padding = 40;

function worldToScreen(x: number, y: number, scale: number): { sx: number; sy: number } {
  const h = props.engine.room.height;
  return {
    sx: padding + x * scale,
    sy: padding + (h - y) * scale,
  };
}

function screenToWorld(sx: number, sy: number, scale: number): { x: number; y: number } {
  const h = props.engine.room.height;
  return {
    x: (sx - padding) / scale,
    y: h - (sy - padding) / scale,
  };
}

function getScale(): number {
  const w = props.engine.room.width;
  const h = props.engine.room.height;
  const availW = canvasSize.value.width - padding * 2;
  const availH = canvasSize.value.height - padding * 2;
  return Math.min(availW / w, availH / h);
}

function clientToWorld(clientX: number, clientY: number): { x: number; y: number } | null {
  const canvas = canvasRef.value;
  if (!canvas) return null;

  const rect = canvas.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return null;

  const sx = ((clientX - rect.left) / rect.width) * canvas.width;
  const sy = ((clientY - rect.top) / rect.height) * canvas.height;
  return screenToWorld(sx, sy, getScale());
}

function drawObstacle(
  ctx: CanvasRenderingContext2D,
  obstacle: Obstacle,
  scale: number,
  options?: { alpha?: number; invalid?: boolean },
): void {
  const center = worldToScreen(obstacle.cx, obstacle.cy, scale);
  const alpha = options?.alpha ?? 1;
  ctx.globalAlpha = alpha;
  ctx.fillStyle = options?.invalid ? '#fecaca' : '#cbd5e1';
  ctx.strokeStyle = options?.invalid ? '#ef4444' : '#64748b';
  ctx.lineWidth = 2;

  if (obstacle.kind === 'circle') {
    ctx.beginPath();
    ctx.arc(center.sx, center.sy, obstacle.rx * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.globalAlpha = 1;
    return;
  }

  if (obstacle.kind === 'rect') {
    const w = obstacle.rx * 2 * scale;
    const h = obstacle.ry * 2 * scale;
    ctx.fillRect(center.sx - w / 2, center.sy - h / 2, w, h);
    ctx.strokeRect(center.sx - w / 2, center.sy - h / 2, w, h);
    ctx.globalAlpha = 1;
    return;
  }

  ctx.beginPath();
  ctx.ellipse(center.sx, center.sy, obstacle.rx * scale, obstacle.ry * scale, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.globalAlpha = 1;
}

function draw(): void {
  const canvas = canvasRef.value;
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const engine = props.engine;
  const room = engine.room;
  const agents = engine.agents;
  const scale = getScale();
  const w = room.width;
  const h = room.height;
  const canvasW = canvasSize.value.width;
  const canvasH = canvasSize.value.height;

  if (canvasW <= 0 || canvasH <= 0) return;

  ctx.clearRect(0, 0, canvasW, canvasH);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvasW, canvasH);

  const topLeft = worldToScreen(0, h, scale);
  const roomW = w * scale;
  const roomH = h * scale;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(topLeft.sx, topLeft.sy, roomW, roomH);

  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (const wall of room.walls) {
    const p1 = worldToScreen(wall.x1, wall.y1, scale);
    const p2 = worldToScreen(wall.x2, wall.y2, scale);
    ctx.moveTo(p1.sx, p1.sy);
    ctx.lineTo(p2.sx, p2.sy);
  }
  ctx.stroke();

  for (const obstacle of room.obstacles) {
    drawObstacle(ctx, obstacle, scale);
  }

  if (props.draggingKind && dragPreview.value) {
    const preview = createObstacle(
      props.draggingKind,
      dragPreview.value.x,
      dragPreview.value.y,
      'preview',
    );
    drawObstacle(ctx, preview, scale, {
      alpha: 0.72,
      invalid: !dragPreviewValid.value,
    });
  }

  const exit = room.exit;
  const half = exit.width / 2;
  const exitLeft = worldToScreen(exit.cx - half, 0, scale);
  const exitW = exit.width * scale;
  ctx.fillStyle = '#22c55e';
  ctx.fillRect(exitLeft.sx, exitLeft.sy - 4, exitW, 8);
  ctx.fillStyle = '#15803d';
  ctx.font = '11px sans-serif';
  ctx.fillText('出口', exitLeft.sx + exitW / 2 - 12, exitLeft.sy + 20);

  for (const agent of agents) {
    if (agent.evacuated) continue;

    const p = worldToScreen(agent.pos.x, agent.pos.y, scale);
    const r = agent.radius * scale;

    ctx.globalAlpha = 1;
    ctx.fillStyle = agent.isPanic ? '#ef4444' : '#3b82f6';

    ctx.beginPath();
    ctx.arc(p.sx, p.sy, Math.max(r, 2), 0, Math.PI * 2);
    ctx.fill();
  }
}

function clearDragPreview(): void {
  dragPreview.value = null;
  isDragOver.value = false;
  draw();
}

function handleDragOver(event: DragEvent): void {
  if (props.isRunning || !props.draggingKind) return;
  if (!event.dataTransfer?.types.includes('application/x-evacuation-obstacle')) return;
  event.preventDefault();
  event.dataTransfer.dropEffect = 'copy';
  isDragOver.value = true;

  const world = clientToWorld(event.clientX, event.clientY);
  if (!world) return;

  dragPreview.value = world;
  const preview = createObstacle(props.draggingKind, world.x, world.y, 'preview');
  dragPreviewValid.value = canPlaceObstacle(props.engine.room, preview, props.engine.room.obstacles);
  draw();
}

function handleDragLeave(): void {
  clearDragPreview();
}

function handleDrop(event: DragEvent): void {
  event.preventDefault();
  if (props.isRunning) return;

  const kind = (event.dataTransfer?.getData('application/x-evacuation-obstacle') ||
    props.draggingKind) as ObstacleKind | null;
  clearDragPreview();

  if (!kind) return;

  const world = clientToWorld(event.clientX, event.clientY);
  if (!world) {
    emit('dropRejected');
    return;
  }

  emit('dropObstacle', kind, world.x, world.y);
}

function updateCanvasSize(): void {
  if (!containerRef.value) return;
  const rect = containerRef.value.getBoundingClientRect();
  const size = Math.floor(Math.max(200, Math.min(rect.width, rect.height)));
  if (size !== canvasSize.value.width) {
    canvasSize.value = { width: size, height: size };
  }
}

let resizeObserver: ResizeObserver | null = null;

onMounted(() => {
  updateCanvasSize();
  resizeObserver = new ResizeObserver(() => {
    updateCanvasSize();
    draw();
  });
  if (containerRef.value) {
    resizeObserver.observe(containerRef.value);
  }
  props.registerDraw(draw);
  draw();
});

onUnmounted(() => {
  props.unregisterDraw();
  resizeObserver?.disconnect();
});

watch(() => props.frameTick, draw);
watch(() => props.engine.config.panicRatio, draw);
watch(() => props.engine.room.obstacles.length, draw);
watch(() => props.draggingKind, (kind) => {
  if (!kind) clearDragPreview();
});
</script>

<template>
  <div
    ref="containerRef"
    class="canvas-wrap"
    :class="{ 'drag-over': isDragOver && !isRunning }"
  >
    <canvas
      ref="canvasRef"
      :width="canvasSize.width"
      :height="canvasSize.height"
      aria-label="疏散模拟画布"
      @dragover="handleDragOver"
      @dragleave="handleDragLeave"
      @drop="handleDrop"
    />
    <p v-if="isDragOver && !isRunning" class="drop-hint">松手放入房间</p>
  </div>
</template>

<style scoped>
.canvas-wrap {
  position: relative;
  flex: 1;
  min-width: 0;
  aspect-ratio: 1;
  max-height: 700px;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 0 0.75rem 0.75rem 0;
  overflow: hidden;
  transition: box-shadow 0.15s, border-color 0.15s;
}

.canvas-wrap.drag-over {
  border-color: #64748b;
  box-shadow: inset 0 0 0 2px #94a3b8;
}

canvas {
  display: block;
  width: 100%;
  height: 100%;
}

.drop-hint {
  position: absolute;
  bottom: 0.75rem;
  left: 50%;
  transform: translateX(-50%);
  margin: 0;
  padding: 0.375rem 0.75rem;
  background: rgba(15, 23, 42, 0.75);
  color: #fff;
  font-size: 0.75rem;
  border-radius: 999px;
  pointer-events: none;
}

@media (max-width: 900px) {
  .canvas-wrap {
    border-radius: 0 0 0.75rem 0.75rem;
    max-height: none;
  }
}
</style>
