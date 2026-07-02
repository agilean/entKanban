<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';
import AppLayout from '../layouts/AppLayout.vue';
import { useAuthStore } from '../stores/authStore';
import { fetchMyOrg, type OrgMember } from '../utils/orgApi';

const auth = useAuthStore();
const members = ref<OrgMember[]>([]);
const loading = ref(false);

async function loadOrg(): Promise<void> {
  loading.value = true;
  const details = await fetchMyOrg();
  if (details?.org) {
    auth.setOrg(details.org);
    members.value = details.members;
  } else {
    members.value = [];
  }
  loading.value = false;
}

onMounted(async () => {
  if (!auth.initialized) {
    await auth.initialize();
  }
  await loadOrg();
});
</script>

<template>
  <AppLayout>
    <div class="page">
      <header class="page-header">
        <div>
          <h2>组织成员</h2>
          <p class="subtitle">内网单组织模式，飞书登录后自动加入「{{ auth.org?.name ?? '精益学习平台' }}」。</p>
        </div>
        <RouterLink to="/" class="link">返回首页</RouterLink>
      </header>

      <p v-if="!auth.isLoggedIn" class="card hint">
        请先
        <button type="button" class="inline-btn" @click="auth.login()">飞书登录</button>
        查看组织成员。
      </p>

      <section v-else class="card">
        <h3>{{ auth.org?.name ?? '精益学习平台' }}</h3>
        <p class="hint">共 {{ members.length }} 名成员</p>
        <div v-if="loading" class="hint">加载中…</div>
        <ul v-else class="members">
          <li v-for="member in members" :key="member.id">
            <img v-if="member.avatarUrl" :src="member.avatarUrl" alt="" class="avatar" />
            <span>{{ member.name }}</span>
            <span class="role">{{ member.role === 'admin' ? '管理员' : '成员' }}</span>
          </li>
        </ul>
      </section>
    </div>
  </AppLayout>
</template>

<style scoped>
.page {
  max-width: 40rem;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: 1rem;
}

.page-header h2 {
  margin: 0;
}

.subtitle {
  margin: 0.25rem 0 0;
  color: #64748b;
  font-size: 0.875rem;
}

.link {
  color: #2563eb;
  text-decoration: none;
  font-size: 0.875rem;
}

.card {
  background: #fff;
  border-radius: 0.75rem;
  padding: 1.25rem;
  margin-bottom: 1rem;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.08);
}

.card h3 {
  margin: 0 0 0.5rem;
}

.hint {
  color: #64748b;
  font-size: 0.875rem;
}

.inline-btn {
  border: none;
  background: none;
  color: #2563eb;
  cursor: pointer;
  padding: 0;
  font: inherit;
}

.members {
  list-style: none;
  margin: 0.75rem 0 0;
  padding: 0;
}

.members li {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.375rem 0;
  border-bottom: 1px solid #f8fafc;
}

.avatar {
  width: 1.5rem;
  height: 1.5rem;
  border-radius: 999px;
  object-fit: cover;
}

.role {
  margin-left: auto;
  font-size: 0.75rem;
  color: #64748b;
}
</style>
