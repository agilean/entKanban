<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../../stores/authStore';

const auth = useAuthStore();
const router = useRouter();
const open = ref(false);
const menuRef = ref<HTMLElement | null>(null);

const displayName = computed(() => auth.user?.name ?? '用户');

function toggle(): void {
  open.value = !open.value;
}

function close(): void {
  open.value = false;
}

function navigate(path: string): void {
  close();
  router.push(path);
}

async function handleLogout(): Promise<void> {
  close();
  await auth.logout();
  router.push('/');
}

function onDocumentClick(event: MouseEvent): void {
  if (!menuRef.value?.contains(event.target as Node)) {
    close();
  }
}

onMounted(() => {
  document.addEventListener('click', onDocumentClick);
});

onUnmounted(() => {
  document.removeEventListener('click', onDocumentClick);
});
</script>

<template>
  <div v-if="auth.isLoggedIn && auth.user" ref="menuRef" class="user-menu">
    <button type="button" class="trigger" @click.stop="toggle">
      <img v-if="auth.user.avatarUrl" :src="auth.user.avatarUrl" alt="" class="avatar" />
      <span class="name">{{ displayName }}</span>
      <span class="chevron" :class="{ open }">▾</span>
    </button>
    <div v-if="open" class="dropdown">
      <div class="dropdown-header">
        <strong>{{ displayName }}</strong>
        <span v-if="auth.org" class="org">{{ auth.org.name }}</span>
      </div>
      <button type="button" class="menu-item" @click="navigate('/')">首页</button>
      <button type="button" class="menu-item" @click="navigate('/waste')">浪费排行榜</button>
      <button type="button" class="menu-item" @click="navigate('/game')">精益游戏屋</button>
      <button type="button" class="menu-item" @click="navigate('/sessions')">我的竞赛房</button>
      <button type="button" class="menu-item" @click="navigate('/leaderboard')">排行榜</button>
      <button type="button" class="menu-item" @click="navigate('/org')">我的组织</button>
      <button type="button" class="menu-item danger" @click="handleLogout">退出登录</button>
    </div>
  </div>
  <div v-else ref="menuRef" class="user-menu">
    <button type="button" class="trigger guest" @click.stop="toggle">
      <span class="name">导航</span>
      <span class="chevron" :class="{ open }">▾</span>
    </button>
    <div v-if="open" class="dropdown">
      <button type="button" class="menu-item" @click="navigate('/')">首页</button>
      <button type="button" class="menu-item" @click="navigate('/waste')">浪费排行榜</button>
      <button type="button" class="menu-item" @click="navigate('/game')">精益游戏屋</button>
      <button type="button" class="menu-item" @click="navigate('/knowledge')">精益知识库</button>
      <button type="button" class="menu-item primary" @click="auth.login()">飞书登录</button>
    </div>
  </div>
</template>

<style scoped>
.user-menu {
  position: relative;
}

.trigger {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  border: 1px solid #e2e8f0;
  background: #fff;
  border-radius: 999px;
  padding: 0.25rem 0.75rem 0.25rem 0.25rem;
  cursor: pointer;
}

.avatar {
  width: 1.75rem;
  height: 1.75rem;
  border-radius: 999px;
  object-fit: cover;
}

.name {
  font-size: 0.875rem;
  color: #334155;
  max-width: 8rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chevron {
  font-size: 0.75rem;
  color: #94a3b8;
  transition: transform 0.15s ease;
}

.chevron.open {
  transform: rotate(180deg);
}

.dropdown {
  position: absolute;
  right: 0;
  top: calc(100% + 0.5rem);
  min-width: 12rem;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 0.5rem;
  box-shadow: 0 10px 25px rgba(15, 23, 42, 0.12);
  z-index: 50;
  padding: 0.25rem;
}

.dropdown-header {
  padding: 0.625rem 0.75rem;
  border-bottom: 1px solid #f1f5f9;
  margin-bottom: 0.25rem;
}

.dropdown-header strong {
  display: block;
  font-size: 0.875rem;
}

.org {
  font-size: 0.75rem;
  color: #64748b;
}

.menu-item {
  display: block;
  width: 100%;
  text-align: left;
  border: none;
  background: transparent;
  padding: 0.5rem 0.75rem;
  font-size: 0.875rem;
  color: #334155;
  border-radius: 0.375rem;
  cursor: pointer;
}

.menu-item:hover {
  background: #f8fafc;
}

.menu-item.danger {
  color: #b91c1c;
}

.menu-item.primary {
  color: #2563eb;
  font-weight: 600;
}

.trigger.guest {
  padding: 0.5rem 0.75rem;
}

.login-btn {
  border: none;
  background: #2563eb;
  color: #fff;
  border-radius: 0.5rem;
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
  cursor: pointer;
}
</style>
