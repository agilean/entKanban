<script setup lang="ts">
import { computed, ref, watch } from 'vue';

const props = defineProps<{
  value: number;
  rolling: boolean;
  accent: 'analysis' | 'development' | 'test';
  label?: string;
}>();

const tumbleSeed = ref(Math.random());

watch(
  () => props.rolling,
  (isRolling) => {
    if (isRolling) {
      tumbleSeed.value = Math.random();
    }
  },
);

const pipValue = computed(() => {
  const v = Math.round(props.value);
  if (v >= 1 && v <= 6) {
    return v;
  }
  return null;
});

const settleRotation = computed(() => {
  const v = pipValue.value ?? 1;
  switch (v) {
    case 1:
      return 'rotateX(0deg) rotateY(0deg)';
    case 2:
      return 'rotateY(-90deg)';
    case 3:
      return 'rotateX(-90deg)';
    case 4:
      return 'rotateX(90deg)';
    case 5:
      return 'rotateY(90deg)';
    case 6:
      return 'rotateY(180deg)';
    default:
      return 'rotateX(0deg) rotateY(0deg)';
  }
});

const tumbleStyle = computed(() => ({
  '--tumble-a': `${360 + tumbleSeed.value * 180}deg`,
  '--tumble-b': `${540 + tumbleSeed.value * 270}deg`,
}));
</script>

<template>
  <div class="die-wrap" :class="[`accent-${accent}`, { rolling, settled: !rolling }]">
    <span v-if="label" class="die-label">{{ label }}</span>
    <div class="die-scene" :style="tumbleStyle">
      <div
        class="die-cube"
        :class="{ rolling, landed: !rolling }"
        :style="rolling ? undefined : { transform: settleRotation }"
      >
        <template v-if="pipValue !== null">
          <div v-for="face in 6" :key="face" class="die-face" :class="`face-${face}`">
            <span v-for="pip in face" :key="pip" class="pip" />
          </div>
        </template>
        <template v-else>
          <div class="die-face face-numeric">
            <span class="numeric-value">{{ value }}</span>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.die-wrap {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  gap: 0.125rem;
}

.die-label {
  font-size: 0.5625rem;
  font-weight: 800;
  letter-spacing: 0.02em;
  opacity: 0.85;
}

.die-wrap.accent-analysis .die-label {
  color: #1d4ed8;
}

.die-wrap.accent-development .die-label {
  color: #15803d;
}

.die-wrap.accent-test .die-label {
  color: #b45309;
}

.die-scene {
  width: 2rem;
  height: 2rem;
  perspective: 320px;
}

.die-cube {
  position: relative;
  width: 2rem;
  height: 2rem;
  transform-style: preserve-3d;
  transition: transform 0.55s cubic-bezier(0.22, 1, 0.36, 1);
}

.die-cube.rolling {
  animation: die-tumble 0.95s ease-in-out infinite;
}

.die-cube.landed:not(.rolling) {
  animation: die-land 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.die-face {
  position: absolute;
  inset: 0;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: repeat(3, 1fr);
  padding: 0.2rem;
  border-radius: 0.35rem;
  background: linear-gradient(145deg, #ffffff, #f1f5f9);
  border: 1px solid rgb(15 23 42 / 12%);
  box-shadow:
    inset 0 1px 0 rgb(255 255 255 / 90%),
    inset 0 -2px 4px rgb(15 23 42 / 8%);
}

.die-wrap.accent-analysis .die-face {
  box-shadow:
    inset 0 1px 0 rgb(255 255 255 / 90%),
    inset 0 -2px 4px rgb(37 99 235 / 18%),
    0 0 0 1px rgb(37 99 235 / 25%);
}

.die-wrap.accent-development .die-face {
  box-shadow:
    inset 0 1px 0 rgb(255 255 255 / 90%),
    inset 0 -2px 4px rgb(22 163 74 / 18%),
    0 0 0 1px rgb(22 163 74 / 25%);
}

.die-wrap.accent-test .die-face {
  box-shadow:
    inset 0 1px 0 rgb(255 255 255 / 90%),
    inset 0 -2px 4px rgb(217 119 6 / 18%),
    0 0 0 1px rgb(217 119 6 / 25%);
}

.pip {
  align-self: center;
  justify-self: center;
  width: 0.3rem;
  height: 0.3rem;
  border-radius: 999px;
  background: radial-gradient(circle at 30% 30%, #475569, #0f172a);
  box-shadow: inset 0 -1px 1px rgb(255 255 255 / 35%);
}

.face-1 {
  transform: rotateY(0deg) translateZ(1rem);
}

.face-1 .pip:nth-child(1) {
  grid-area: 2 / 2;
}

.face-2 {
  transform: rotateY(90deg) translateZ(1rem);
}

.face-2 .pip:nth-child(1) {
  grid-area: 1 / 3;
}

.face-2 .pip:nth-child(2) {
  grid-area: 3 / 1;
}

.face-3 {
  transform: rotateX(90deg) translateZ(1rem);
}

.face-3 .pip:nth-child(1) {
  grid-area: 1 / 1;
}

.face-3 .pip:nth-child(2) {
  grid-area: 2 / 2;
}

.face-3 .pip:nth-child(3) {
  grid-area: 3 / 3;
}

.face-4 {
  transform: rotateX(-90deg) translateZ(1rem);
}

.face-4 .pip:nth-child(1) {
  grid-area: 1 / 1;
}

.face-4 .pip:nth-child(2) {
  grid-area: 1 / 3;
}

.face-4 .pip:nth-child(3) {
  grid-area: 3 / 1;
}

.face-4 .pip:nth-child(4) {
  grid-area: 3 / 3;
}

.face-5 {
  transform: rotateY(-90deg) translateZ(1rem);
}

.face-5 .pip:nth-child(1) {
  grid-area: 1 / 1;
}

.face-5 .pip:nth-child(2) {
  grid-area: 1 / 3;
}

.face-5 .pip:nth-child(3) {
  grid-area: 2 / 2;
}

.face-5 .pip:nth-child(4) {
  grid-area: 3 / 1;
}

.face-5 .pip:nth-child(5) {
  grid-area: 3 / 3;
}

.face-6 {
  transform: rotateY(180deg) translateZ(1rem);
}

.face-6 .pip:nth-child(1) {
  grid-area: 1 / 1;
}

.face-6 .pip:nth-child(2) {
  grid-area: 1 / 3;
}

.face-6 .pip:nth-child(3) {
  grid-area: 2 / 1;
}

.face-6 .pip:nth-child(4) {
  grid-area: 2 / 3;
}

.face-6 .pip:nth-child(5) {
  grid-area: 3 / 1;
}

.face-6 .pip:nth-child(6) {
  grid-area: 3 / 3;
}

.die-cube.numeric .face-numeric,
.die-cube:not(.rolling) .face-numeric {
  transform: rotateY(0deg) translateZ(1rem);
  display: flex;
  align-items: center;
  justify-content: center;
}

.numeric-value {
  font-size: 0.875rem;
  font-weight: 800;
  color: #0f172a;
}

@keyframes die-tumble {
  0% {
    transform: rotateX(0deg) rotateY(0deg) rotateZ(0deg);
  }
  25% {
    transform: rotateX(var(--tumble-a)) rotateY(calc(var(--tumble-a) * 0.6)) rotateZ(18deg);
  }
  50% {
    transform: rotateX(calc(var(--tumble-b) * 0.5)) rotateY(var(--tumble-b)) rotateZ(-14deg);
  }
  75% {
    transform: rotateX(var(--tumble-b)) rotateY(calc(var(--tumble-b) * 0.7)) rotateZ(10deg);
  }
  100% {
    transform: rotateX(calc(var(--tumble-a) * 1.2)) rotateY(calc(var(--tumble-b) * 0.9)) rotateZ(0deg);
  }
}

@keyframes die-land {
  0% {
    scale: 1.08;
  }
  100% {
    scale: 1;
  }
}
</style>
