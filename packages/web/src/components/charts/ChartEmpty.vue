<script setup lang="ts">
defineProps<{
  message?: string;
}>();
</script>

<template>
  <div class="empty">
    <p>{{ message ?? '推进游戏后图表将显示数据' }}</p>
  </div>
</template>

<style scoped>
.empty {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 240px;
  color: #94a3b8;
  font-size: 0.875rem;
  background: #f8fafc;
  border-radius: 0.5rem;
}
</style>
