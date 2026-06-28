<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import AppLayout from '../layouts/AppLayout.vue';
import { createPlaySession } from '../utils/playSessionApi';

const router = useRouter();
const title = ref('');
const creating = ref(false);
const error = ref<string | null>(null);

async function handleCreate(): Promise<void> {
  if (!title.value.trim()) {
    error.value = '请输入房间名称';
    return;
  }
  creating.value = true;
  error.value = null;
  const session = await createPlaySession({ title: title.value.trim(), gameType: 'kanban' });
  creating.value = false;
  if (!session) {
    error.value = '创建失败';
    return;
  }
  router.push(`/sessions/${session.id}`);
}
</script>

<template>
  <AppLayout>
    <div class="page">
      <h2>创建竞赛房</h2>
      <p class="subtitle">当前支持 getKanban 21 天挑战（异步竞赛）。</p>
      <p v-if="error" class="error">{{ error }}</p>
      <div class="form">
        <label>
          房间名称
          <input v-model="title" type="text" placeholder="例如：周五 Kanban 挑战赛" />
        </label>
        <button type="button" class="btn primary" :disabled="creating" @click="handleCreate">
          {{ creating ? '创建中…' : '创建' }}
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

.subtitle {
  color: #64748b;
  font-size: 0.875rem;
  margin-bottom: 1rem;
}

.form {
  display: grid;
  gap: 0.75rem;
  background: #fff;
  padding: 1.25rem;
  border-radius: 0.75rem;
}

label {
  display: grid;
  gap: 0.375rem;
  font-size: 0.875rem;
}

input {
  border: 1px solid #cbd5e1;
  border-radius: 0.5rem;
  padding: 0.5rem 0.75rem;
}

.error {
  color: #b91c1c;
}

.btn {
  border: 1px solid #cbd5e1;
  background: #fff;
  border-radius: 0.5rem;
  padding: 0.5rem 1rem;
  cursor: pointer;
}

.btn.primary {
  background: #2563eb;
  border-color: #2563eb;
  color: #fff;
}
</style>
