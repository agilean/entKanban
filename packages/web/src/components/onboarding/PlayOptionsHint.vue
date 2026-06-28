<script setup lang="ts">
import { RouterLink } from 'vue-router';
import { useAuthStore } from '../../stores/authStore';
import { useGameStore } from '../../stores/gameStore';

const auth = useAuthStore();
const game = useGameStore();
</script>

<template>
  <section v-if="auth.hasOrg && !game.activePlaySessionId" class="hint-bar">
    <span class="org-name">{{ auth.org?.name }}</span>
    <span class="sep">·</span>
    <span class="text">竞赛竞技或单人练习：</span>
    <RouterLink to="/sessions/new" class="link">创建竞赛房</RouterLink>
    <span class="sep">·</span>
    <RouterLink to="/sessions" class="link">我的竞赛房</RouterLink>
    <span class="sep">·</span>
    <span class="muted">当前为单人练习（成绩不进竞赛房榜）</span>
  </section>
</template>

<style scoped>
.hint-bar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.375rem;
  padding: 0.5rem 0.75rem;
  margin-bottom: 1rem;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 0.5rem;
  font-size: 0.8125rem;
  color: #475569;
}

.org-name {
  font-weight: 600;
  color: #334155;
}

.sep {
  color: #cbd5e1;
}

.link {
  color: #2563eb;
  text-decoration: none;
}

.link:hover {
  text-decoration: underline;
}

.muted {
  color: #94a3b8;
}

.text {
  color: #64748b;
}
</style>
