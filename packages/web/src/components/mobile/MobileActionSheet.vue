<script setup lang="ts">
defineProps<{
  title?: string;
  open: boolean;
}>();

const emit = defineEmits<{
  close: [];
}>();

function onBackdropClick(): void {
  emit('close');
}
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="sheet-root" @click.self="onBackdropClick">
      <div class="sheet-panel" role="dialog" aria-modal="true">
        <header v-if="title" class="sheet-header">
          <h3>{{ title }}</h3>
          <button type="button" class="close-btn" aria-label="关闭" @click="emit('close')">×</button>
        </header>
        <div class="sheet-body">
          <slot />
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.sheet-root {
  position: fixed;
  inset: 0;
  z-index: 100;
  background: rgba(15, 23, 42, 0.45);
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.sheet-panel {
  width: 100%;
  max-width: 32rem;
  max-height: 85vh;
  background: #fff;
  border-radius: 1rem 1rem 0 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  animation: slide-up 0.2s ease-out;
}

@keyframes slide-up {
  from {
    transform: translateY(100%);
  }
  to {
    transform: translateY(0);
  }
}

.sheet-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.875rem 1rem;
  border-bottom: 1px solid #f1f5f9;
}

.sheet-header h3 {
  margin: 0;
  font-size: 1rem;
}

.close-btn {
  border: none;
  background: transparent;
  font-size: 1.5rem;
  line-height: 1;
  color: #94a3b8;
  cursor: pointer;
  padding: 0.25rem;
}

.sheet-body {
  overflow-y: auto;
  padding: 0.5rem;
}
</style>
