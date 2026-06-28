<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import AppLayout from '../layouts/AppLayout.vue';
import { useAuthStore } from '../stores/authStore';
import {
  acceptPlaySessionInvitation,
  fetchPlaySessionInvitationPreview,
} from '../utils/playSessionApi';

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();

const preview = ref<Awaited<ReturnType<typeof fetchPlaySessionInvitationPreview>>>(null);
const loading = ref(true);
const accepting = ref(false);
const message = ref<string | null>(null);
const error = ref<string | null>(null);

const token = String(route.params.token ?? '');

async function handleAccept(): Promise<void> {
  if (!auth.isLoggedIn) {
    auth.login(`playsession:${token}`);
    return;
  }
  accepting.value = true;
  error.value = null;
  const session = await acceptPlaySessionInvitation(token);
  accepting.value = false;
  if (!session) {
    error.value = '无法接受邀请';
    return;
  }
  message.value = `已加入「${session.title}」`;
  router.push(`/sessions/${session.id}`);
}

onMounted(async () => {
  if (!auth.initialized) {
    await auth.initialize();
  }
  preview.value = await fetchPlaySessionInvitationPreview(token);
  loading.value = false;
  if (auth.isLoggedIn && preview.value && !preview.value.expired && preview.value.status === 'pending') {
    await handleAccept();
  }
});
</script>

<template>
  <AppLayout>
    <div class="page">
      <h2>竞赛房邀请</h2>
      <p v-if="loading" class="hint">加载中…</p>
      <p v-else-if="!preview" class="error">邀请无效</p>
      <div v-else class="card">
        <p class="title">{{ preview.playSessionTitle }}</p>
        <p class="hint">游戏：{{ preview.gameType }}</p>
        <p v-if="preview.expired" class="error">邀请已过期</p>
        <p v-if="message" class="success">{{ message }}</p>
        <p v-if="error" class="error">{{ error }}</p>
        <button
          v-if="!preview.expired && !message"
          type="button"
          class="btn primary"
          :disabled="accepting"
          @click="handleAccept"
        >
          {{ auth.isLoggedIn ? (accepting ? '加入中…' : '加入竞赛房') : '飞书登录并加入' }}
        </button>
      </div>
    </div>
  </AppLayout>
</template>

<style scoped>
.page {
  max-width: 28rem;
  margin: 0 auto;
}

.card {
  background: #fff;
  padding: 1.25rem;
  border-radius: 0.75rem;
}

.title {
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

.btn {
  margin-top: 1rem;
  border: none;
  background: #2563eb;
  color: #fff;
  border-radius: 0.5rem;
  padding: 0.5rem 1rem;
  cursor: pointer;
}
</style>
