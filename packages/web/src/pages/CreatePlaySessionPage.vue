<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter, RouterLink } from 'vue-router';
import AppLayout from '../layouts/AppLayout.vue';
import { useAuthStore } from '../stores/authStore';
import { createPlaySession } from '../utils/playSessionApi';
import { listAvailableGameTypes } from '../utils/gameTypes';

const router = useRouter();
const auth = useAuthStore();

const title = ref('');
const gameType = ref('kanban');
const creating = ref(false);
const error = ref<string | null>(null);

const gameTypes = listAvailableGameTypes();
const selectedGame = computed(() => gameTypes.find((g) => g.id === gameType.value));

onMounted(async () => {
  if (!auth.initialized) {
    await auth.initialize();
  }
});

async function handleCreate(): Promise<void> {
  if (!auth.hasOrg || !auth.org) {
    error.value = '请先创建或加入组织';
    return;
  }
  if (!title.value.trim()) {
    error.value = '请输入房间名称';
    return;
  }
  creating.value = true;
  error.value = null;
  const result = await createPlaySession({
    title: title.value.trim(),
    gameType: gameType.value,
    orgId: auth.org.id,
  });
  creating.value = false;
  if (!result.playSession) {
    error.value = result.error ?? '创建失败';
    return;
  }
  router.push(`/sessions/${result.playSession.id}`);
}
</script>

<template>
  <AppLayout>
    <div class="page">
      <h2>创建竞赛房</h2>

      <p v-if="!auth.isLoggedIn" class="card hint">
        请先
        <button type="button" class="inline-btn" @click="auth.login()">飞书登录</button>
        后再创建竞赛房。
      </p>

      <section v-else-if="!auth.hasOrg" class="card">
        <h3>需要先加入组织</h3>
        <p class="hint">
          竞赛房在组织内开设。请先
          <RouterLink to="/org">创建组织</RouterLink>
          成为管理员并邀请同事，或接受他人的组织邀请。
        </p>
        <RouterLink to="/org" class="btn primary">去创建组织</RouterLink>
      </section>

      <template v-else>
        <p class="subtitle">在组织「{{ auth.org?.name }}」内开设竞赛房，邀请同事异步比拼。</p>
        <p v-if="error" class="error">{{ error }}</p>
        <div class="form">
          <label>
            选择游戏
            <select v-model="gameType" class="select">
              <option v-for="game in gameTypes" :key="game.id" :value="game.id">
                {{ game.name }}
              </option>
            </select>
            <span v-if="selectedGame" class="field-hint">{{ selectedGame.description }}</span>
          </label>
          <label>
            房间名称
            <input v-model="title" type="text" placeholder="例如：周五 EntKanban 挑战赛" />
          </label>
          <button type="button" class="btn primary" :disabled="creating" @click="handleCreate">
            {{ creating ? '创建中…' : '创建竞赛房' }}
          </button>
        </div>
      </template>
    </div>
  </AppLayout>
</template>

<style scoped>
.page {
  max-width: 32rem;
  margin: 0 auto;
}

.subtitle {
  color: #64748b;
  font-size: 0.875rem;
  margin-bottom: 1rem;
}

.card {
  background: #fff;
  border-radius: 0.75rem;
  padding: 1.25rem;
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

input,
.select {
  border: 1px solid #cbd5e1;
  border-radius: 0.5rem;
  padding: 0.5rem 0.75rem;
  background: #fff;
}

.field-hint {
  font-size: 0.75rem;
  color: #94a3b8;
}

.error {
  color: #b91c1c;
  margin-bottom: 0.5rem;
}

.btn {
  border: 1px solid #cbd5e1;
  background: #fff;
  border-radius: 0.5rem;
  padding: 0.5rem 1rem;
  cursor: pointer;
  text-decoration: none;
  display: inline-block;
  font-size: 0.875rem;
  color: #334155;
}

.btn.primary {
  background: #2563eb;
  border-color: #2563eb;
  color: #fff;
}
</style>
