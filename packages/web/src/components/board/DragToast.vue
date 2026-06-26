<script setup lang="ts">
import { useUiStore } from '../../stores/uiStore';

const ui = useUiStore();
</script>

<template>
  <Transition name="toast">
    <aside
      v-if="ui.dragToast"
      class="drag-toast"
      role="status"
      aria-live="polite"
    >
      {{ ui.dragToast }}
    </aside>
  </Transition>
</template>

<style scoped>
.drag-toast {
  position: fixed;
  bottom: 1.5rem;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1100;
  max-width: min(24rem, calc(100vw - 2rem));
  padding: 0.75rem 1rem;
  border-radius: 0.625rem;
  background: #991b1b;
  color: #fff;
  font-size: 0.875rem;
  font-weight: 600;
  box-shadow: 0 10px 24px rgb(15 23 42 / 25%);
  text-align: center;
}

.toast-enter-active,
.toast-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translate(-50%, 0.5rem);
}
</style>
