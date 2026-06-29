<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue';
import type { EvacuationEngine } from '../../simulation/evacuation/engine';

const props = defineProps<{
  engine: EvacuationEngine;
  frameTick: number;
  registerDraw: (cb: () => void) => void;
  unregisterDraw: () => void;
}>();

const canvasRef = ref<HTMLCanvasElement | null>(null);
const containerRef = ref<HTMLDivElement | null>(null);
const canvasSize = ref({ width: 600, height: 600 });

const padding = 40;

function worldToScreen(x: number, y: number, scale: number): { sx: number; sy: number } {
  const h = props.engine.room.height;
  const offsetX = padding;
  const offsetY = padding;
  return {
    sx: offsetX + x * scale,
    sy: offsetY + (h - y) * scale,
  };
}

function getScale(): number {
  const w = props.engine.room.width;
  const h = props.engine.room.height;
  const availW = canvasSize.value.width - padding * 2;
  const availH = canvasSize.value.height - padding * 2;
  return Math.min(availW / w, availH / h);
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

function updateCanvasSize(): void {
  if (!containerRef.value) return;
  const rect = containerRef.value.getBoundingClientRect();
  const size = Math.max(200, Math.min(rect.width, rect.height, 700));
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
</script>

<template>
  <div ref="containerRef" class="canvas-wrap">
    <canvas
      ref="canvasRef"
      :width="canvasSize.width"
      :height="canvasSize.height"
      aria-label="疏散模拟画布"
    />
  </div>
</template>

<style scoped>
.canvas-wrap {
  width: 100%;
  aspect-ratio: 1;
  max-height: 700px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fff;
  border-radius: 0.75rem;
  border: 1px solid #e2e8f0;
  overflow: hidden;
}

canvas {
  display: block;
}
</style>
