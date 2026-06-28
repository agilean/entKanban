<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';
import AppLayout from '../layouts/AppLayout.vue';
import { useAuthStore } from '../stores/authStore';
import { fetchMyPlaySessions, type PlaySession } from '../utils/playSessionApi';

const auth = useAuthStore();
const sessions = ref<PlaySession[]>([]);
const loading = ref(true);

function statusLabel(status: string): string {
  switch (status) {
    case 'active':
      return '进行中';
    case 'closed':
      return '已结束';
    default:
      return '等待开始';
  }
}

onMounted(async () => {
  if (!auth.initialized) {
    await auth.initialize();
  }
  sessions.value = await fetchMyPlaySessions();
  loading.value = false;
});
</script>

<template>
  <AppLayout>
    <div class="page">
      <header class="header">
        <div>
          <h2>我的竞赛房</h2>
          <p class="subtitle">创建房间，邀请同事各自完成挑战并比较成绩。</p>
        </div>
        <RouterLink to="/sessions/new" class="btn primary">创建竞赛房</RouterLink>
      </header>

      <p v-if="!auth.isLoggedIn" class="hint">请先登录后查看竞赛房。</p>
      <p v-else-if="loading" class="hint">加载中…</p>
      <p v-else-if="sessions.length === 0" class="empty">还没有竞赛房，点击右上角创建。</p>

      <ul v-else class="list">
        <li v-for="session in sessions" :key="session.id">
          <RouterLink :to="`/sessions/${session.id}`" class="card">
            <div>
              <strong>{{ session.title }}</strong>
              <span class="meta">{{ session.gameType }} · {{ statusLabel(session.status) }}</span>
            </div>
            <span class="arrow">→</span>
          </RouterLink>
        </li>
      </ul>
    </div>
  </AppLayout>
</template>

<style scoped>
.page {
  max-width: 40rem;
  margin: 0 auto;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: 1rem;
}

.header h2 {
  margin: 0;
}

.subtitle {
  margin: 0.25rem 0 0;
  color: #64748b;
  font-size: 0.875rem;
}

.list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 0.5rem;
}

.card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background: #fff;
  border-radius: 0.75rem;
  text-decoration: none;
  color: inherit;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.08);
}

.meta {
  display: block;
  font-size: 0.75rem;
  color: #64748b;
  margin-top: 0.25rem;
}

.arrow {
  color: #94a3b8;
}

.empty,
.hint {
  color: #64748b;
  text-align: center;
  padding: 2rem;
}

.btn {
  border: 1px solid #cbd5e1;
  background: #fff;
  color: #334155;
  border-radius: 0.5rem;
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
  text-decoration: none;
}

.btn.primary {
  background: #2563eb;
  border-color: #2563eb;
  color: #fff;
}
</style>
