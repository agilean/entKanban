<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  phase: 'rolling' | 'settling';
  currentDay: number;
}>();

const title = computed(() =>
  props.phase === 'rolling' ? '掷骰子中…' : `Day ${props.currentDay} 结算中…`,
);

const subtitle = computed(() =>
  props.phase === 'rolling'
    ? '团队正在投入工作'
    : '人员归位 · 核销点数 · 进入下一天',
);

const diceFaces = ['A', 'D', 'T', 'A', 'D', 'T'];
</script>

<template>
  <div class="overlay" role="dialog" aria-modal="true" aria-live="polite">
    <div class="panel">
      <p class="title">{{ title }}</p>
      <p class="subtitle">{{ subtitle }}</p>
      <div class="dice-row" :class="{ rolling: phase === 'rolling' }">
        <span
          v-for="(face, index) in diceFaces"
          :key="index"
          class="die"
          :class="[`die-${index % 3}`, { spin: phase === 'rolling' }]"
          :style="{ animationDelay: `${index * 0.08}s` }"
        >
          {{ face }}
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgb(15 23 42 / 45%);
  backdrop-filter: blur(2px);
}

.panel {
  min-width: 18rem;
  padding: 1.5rem 2rem;
  border-radius: 1rem;
  background: #fff;
  box-shadow: 0 20px 40px rgb(15 23 42 / 20%);
  text-align: center;
}

.title {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 700;
  color: #1e293b;
}

.subtitle {
  margin: 0.5rem 0 1.25rem;
  font-size: 0.875rem;
  color: #64748b;
}

.dice-row {
  display: flex;
  justify-content: center;
  gap: 0.625rem;
}

.die {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.25rem;
  height: 2.25rem;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  font-weight: 700;
  color: #fff;
  box-shadow: 0 4px 8px rgb(15 23 42 / 18%);
}

.die-0 {
  background: #2563eb;
}

.die-1 {
  background: #16a34a;
}

.die-2 {
  background: #d97706;
}

.die.spin {
  animation: roll 0.55s ease-in-out infinite alternate;
}

.dice-row:not(.rolling) .die {
  animation: settle 0.45s ease-out both;
}

@keyframes roll {
  0% {
    transform: rotate(-18deg) translateY(0);
  }
  100% {
    transform: rotate(18deg) translateY(-6px);
  }
}

@keyframes settle {
  from {
    transform: scale(1.15) translateY(-8px);
    opacity: 0.6;
  }
  to {
    transform: scale(1) translateY(0);
    opacity: 1;
  }
}
</style>
