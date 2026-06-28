<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';
import AppLayout from '../layouts/AppLayout.vue';
import { useAuthStore } from '../stores/authStore';
import {
  createInvitation,
  createOrg,
  fetchMyOrg,
  type CreatedInvitation,
  type OrgMember,
} from '../utils/orgApi';

const auth = useAuthStore();

const orgNameInput = ref('');
const creating = ref(false);
const inviting = ref(false);
const members = ref<OrgMember[]>([]);
const latestInvite = ref<CreatedInvitation | null>(null);
const error = ref<string | null>(null);
const copied = ref(false);

async function loadOrg(): Promise<void> {
  const details = await fetchMyOrg();
  if (!details?.org) {
    members.value = [];
    return;
  }
  auth.setOrg(details.org);
  await auth.refresh();
  members.value = details.members;
}

async function handleCreateOrg(): Promise<void> {
  if (!orgNameInput.value.trim()) {
    error.value = '请输入组织名称';
    return;
  }
  creating.value = true;
  error.value = null;
  const result = await createOrg(orgNameInput.value.trim());
  creating.value = false;
  if (!result) {
    error.value = '创建组织失败，可能你已属于其他组织。';
    return;
  }
  auth.setOrg(result.org);
  if (auth.user) {
    auth.user.role = 'admin';
  }
  orgNameInput.value = '';
  await loadOrg();
}

async function handleCreateInvite(): Promise<void> {
  if (!auth.org) {
    return;
  }
  inviting.value = true;
  error.value = null;
  latestInvite.value = await createInvitation(auth.org.id);
  inviting.value = false;
  if (!latestInvite.value) {
    error.value = '生成邀请链接失败，仅组织管理员可邀请成员。';
  }
}

async function copyInviteLink(): Promise<void> {
  if (!latestInvite.value) {
    return;
  }
  await navigator.clipboard.writeText(latestInvite.value.inviteUrl);
  copied.value = true;
  window.setTimeout(() => {
    copied.value = false;
  }, 2000);
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
          <h2>组织管理</h2>
          <p class="subtitle">创建组织、邀请成员，并在组织排行榜中一起竞技。</p>
        </div>
        <RouterLink to="/" class="link">返回游戏</RouterLink>
      </header>

      <p v-if="!auth.isLoggedIn" class="card hint">
        请先
        <button type="button" class="inline-btn" @click="auth.login()">飞书登录</button>
        后再管理组织。
      </p>

      <template v-else>
        <p v-if="error" class="error">{{ error }}</p>

        <section v-if="!auth.hasOrg" class="card">
          <h3>创建组织</h3>
          <p class="hint">每位用户只能属于一个组织。创建后你将成为管理员。</p>
          <div class="form-row">
            <input v-model="orgNameInput" type="text" placeholder="组织名称" class="input" />
            <button type="button" class="btn primary" :disabled="creating" @click="handleCreateOrg">
              {{ creating ? '创建中…' : '创建' }}
            </button>
          </div>
        </section>

        <section v-else class="card">
          <h3>{{ auth.org?.name }}</h3>
          <p class="hint">你的角色：{{ auth.isOrgAdmin ? '管理员' : '成员' }}</p>

          <div v-if="auth.isOrgAdmin" class="invite-block">
            <h4>邀请成员</h4>
            <p class="hint">生成邀请链接，发送给同事即可加入组织。</p>
            <button type="button" class="btn primary" :disabled="inviting" @click="handleCreateInvite">
              {{ inviting ? '生成中…' : '生成邀请链接' }}
            </button>
            <div v-if="latestInvite" class="invite-link">
              <code>{{ latestInvite.inviteUrl }}</code>
              <button type="button" class="btn" @click="copyInviteLink">
                {{ copied ? '已复制' : '复制链接' }}
              </button>
            </div>
          </div>

          <div class="members">
            <h4>成员 ({{ members.length }})</h4>
            <ul>
              <li v-for="member in members" :key="member.id">
                <img v-if="member.avatarUrl" :src="member.avatarUrl" alt="" class="avatar" />
                <span>{{ member.name }}</span>
                <span class="role">{{ member.role === 'admin' ? '管理员' : '成员' }}</span>
              </li>
            </ul>
          </div>
        </section>
      </template>
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

.card h3,
.card h4 {
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

.error {
  color: #b91c1c;
  margin-bottom: 1rem;
}

.form-row {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.75rem;
}

.input {
  flex: 1;
  border: 1px solid #cbd5e1;
  border-radius: 0.5rem;
  padding: 0.5rem 0.75rem;
}

.btn {
  border: 1px solid #cbd5e1;
  background: #fff;
  color: #334155;
  border-radius: 0.5rem;
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
  cursor: pointer;
}

.btn.primary {
  background: #2563eb;
  border-color: #2563eb;
  color: #fff;
}

.invite-block {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #f1f5f9;
}

.invite-link {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  margin-top: 0.75rem;
  flex-wrap: wrap;
}

code {
  flex: 1;
  min-width: 12rem;
  background: #f8fafc;
  padding: 0.5rem 0.75rem;
  border-radius: 0.375rem;
  font-size: 0.75rem;
  word-break: break-all;
}

.members {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #f1f5f9;
}

.members ul {
  list-style: none;
  margin: 0.5rem 0 0;
  padding: 0;
}

.members li {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.375rem 0;
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

@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
  }

  .form-row {
    flex-direction: column;
  }

  .invite-link {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
