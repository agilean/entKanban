<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import AppLayout from '../layouts/AppLayout.vue';
import { useAuthStore } from '../stores/authStore';
import {
  acceptInvitation,
  fetchInvitationPreview,
  type InvitationPreview,
} from '../utils/orgApi';

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();

const preview = ref<InvitationPreview | null>(null);
const loading = ref(true);
const actionError = ref<string | null>(null);
const actionMessage = ref<string | null>(null);
const accepting = ref(false);

const token = computed(() => String(route.params.token ?? ''));

async function loadPreview(): Promise<void> {
  loading.value = true;
  actionError.value = null;
  preview.value = await fetchInvitationPreview(token.value);
  loading.value = false;
}

async function handleAccept(): Promise<void> {
  if (!auth.isLoggedIn) {
    auth.login(`invite:${token.value}`);
    return;
  }
  accepting.value = true;
  actionError.value = null;
  const result = await acceptInvitation(token.value);
  accepting.value = false;
  if (!result) {
    actionError.value = '无法接受邀请，可能你已属于其他组织或邀请已失效。';
    return;
  }
  await auth.refresh();
  actionMessage.value = `已成功加入组织「${result.org.name}」。`;
}

onMounted(async () => {
  if (!auth.initialized) {
    await auth.initialize();
  }
  await loadPreview();
  if (auth.isLoggedIn && preview.value && !preview.value.expired && preview.value.status === 'pending') {
    if (!auth.hasOrg) {
      await handleAccept();
    }
  }
});
</script>

<template>
  <AppLayout>
    <div class="page">
      <h2>组织邀请</h2>

      <p v-if="loading" class="hint">加载邀请信息…</p>
      <p v-else-if="!preview" class="error">邀请链接无效或已不存在。</p>

      <div v-else class="card">
        <p class="org-name">{{ preview.orgName }}</p>
        <p v-if="preview.expired || preview.status !== 'pending'" class="hint">
          该邀请已{{ preview.status === 'accepted' ? '被使用' : '过期' }}。
        </p>
        <p v-else class="hint">有效期至 {{ new Date(preview.expiresAt).toLocaleString('zh-CN') }}</p>

        <p v-if="actionMessage" class="success">{{ actionMessage }}</p>
        <p v-if="actionError" class="error">{{ actionError }}</p>

        <div v-if="!actionMessage" class="actions">
          <button
            v-if="!preview.expired && preview.status === 'pending'"
            type="button"
            class="btn primary"
            :disabled="accepting"
            @click="handleAccept"
          >
            {{ auth.isLoggedIn ? (accepting ? '加入中…' : '接受邀请') : '飞书登录并加入' }}
          </button>
          <button type="button" class="btn" @click="router.push('/game')">返回游戏</button>
        </div>
        <div v-else class="actions">
          <button type="button" class="btn primary" @click="router.push('/org')">查看组织</button>
          <button type="button" class="btn" @click="router.push('/game')">返回游戏</button>
        </div>
      </div>
    </div>
  </AppLayout>
</template>

<style scoped>
.page {
  max-width: 32rem;
  margin: 0 auto;
}

.page h2 {
  margin: 0 0 1rem;
}

.card {
  background: #fff;
  border-radius: 0.75rem;
  padding: 1.5rem;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.08);
}

.org-name {
  margin: 0 0 0.5rem;
  font-size: 1.25rem;
  font-weight: 700;
}

.hint {
  color: #64748b;
  font-size: 0.875rem;
}

.error {
  color: #b91c1c;
}

.success {
  color: #15803d;
}

.actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 1rem;
  flex-wrap: wrap;
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

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
