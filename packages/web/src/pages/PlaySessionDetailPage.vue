<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useRoute, useRouter, RouterLink } from 'vue-router';
import AppLayout from '../layouts/AppLayout.vue';
import SessionLeaderboard from '../components/session/SessionLeaderboard.vue';
import SessionProgressBar from '../components/session/SessionProgressBar.vue';
import { useAuthStore } from '../stores/authStore';
import { useGameStore } from '../stores/gameStore';
import {
  createPlaySessionInvitation,
  fetchPlaySessionWithStatus,
  fetchPlaySessionLeaderboard,
  startPlaySession,
  type PlaySession,
  type PlaySessionParticipant,
  type SessionLeaderboardEntry,
} from '../utils/playSessionApi';

type DetailRouteState = {
  playSession?: PlaySession;
  participants?: PlaySessionParticipant[];
};

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
const game = useGameStore();

const playSession = ref<PlaySession | null>(null);
const participants = ref<PlaySessionParticipant[]>([]);
const leaderboard = ref<SessionLeaderboardEntry[]>([]);
const loading = ref(true);
const loadError = ref<string | null>(null);
const inviting = ref(false);
const starting = ref(false);
const playing = ref(false);
const inviteUrl = ref<string | null>(null);
const copied = ref(false);
let pollTimer: ReturnType<typeof setInterval> | null = null;

const sessionId = computed(() => String(route.params.id ?? ''));
const isHost = computed(
  () => playSession.value && auth.user && playSession.value.hostUserId === auth.user.id,
);
const myParticipant = computed(() =>
  participants.value.find((p) => p.userId === auth.user?.id) ?? null,
);
const canStartPlay = computed(
  () => playSession.value?.status === 'active' && myParticipant.value?.status !== 'completed',
);

function applyRouteState(state: DetailRouteState | null): boolean {
  if (!state?.playSession || state.playSession.id !== sessionId.value) {
    return false;
  }
  playSession.value = state.playSession;
  if (state.participants) {
    participants.value = state.participants;
  }
  loading.value = false;
  return true;
}

async function loadLeaderboard(): Promise<void> {
  leaderboard.value = await fetchPlaySessionLeaderboard(sessionId.value);
}

async function loadSession(silent = false): Promise<boolean> {
  const result = await fetchPlaySessionWithStatus(sessionId.value);
  if (!result.data) {
    if (!silent) {
      loadError.value =
        result.status === 401
          ? '请先登录后查看竞赛房'
          : result.error ?? '竞赛房不存在或无法访问';
      loading.value = false;
    }
    return false;
  }
  playSession.value = result.data.playSession;
  participants.value = result.data.participants;
  loadError.value = null;
  if (!silent) {
    loading.value = false;
  }
  return true;
}

async function load(): Promise<void> {
  const ok = await loadSession();
  if (ok) {
    void loadLeaderboard();
  }
}

async function refresh(): Promise<void> {
  const ok = await loadSession(true);
  if (ok) {
    void loadLeaderboard();
  }
}

async function handleStartSession(): Promise<void> {
  if (!playSession.value) {
    return;
  }
  starting.value = true;
  const updated = await startPlaySession(playSession.value.id);
  starting.value = false;
  if (updated) {
    playSession.value = updated;
    await refresh();
  }
}

async function handleInvite(): Promise<void> {
  if (!playSession.value) {
    return;
  }
  inviting.value = true;
  const invitation = await createPlaySessionInvitation(playSession.value.id);
  inviting.value = false;
  inviteUrl.value = invitation?.inviteUrl ?? null;
}

async function handleStartPlay(): Promise<void> {
  if (!playSession.value) {
    return;
  }
  playing.value = true;
  const ok = await game.startNewGameInPlaySession(playSession.value.id);
  playing.value = false;
  if (ok) {
    router.push('/game');
  }
}

async function copyInvite(): Promise<void> {
  if (!inviteUrl.value) {
    return;
  }
  await navigator.clipboard.writeText(inviteUrl.value);
  copied.value = true;
  window.setTimeout(() => {
    copied.value = false;
  }, 2000);
}

onMounted(async () => {
  if (!auth.initialized) {
    await auth.initialize();
  }

  const routeState = history.state as DetailRouteState | null;
  const hasInstantData = applyRouteState(routeState);

  if (hasInstantData) {
    void loadLeaderboard();
    void refresh();
  } else {
    await load();
  }

  pollTimer = window.setInterval(() => {
    void refresh();
  }, 30000);
});

onUnmounted(() => {
  if (pollTimer) {
    window.clearInterval(pollTimer);
  }
});
</script>

<template>
  <AppLayout>
    <div class="page">
      <p v-if="loading" class="hint">加载中…</p>
      <p v-else-if="loadError" class="error">{{ loadError }}</p>
      <p v-else-if="!playSession" class="error">竞赛房不存在</p>

      <template v-else>
        <header class="header">
          <div>
            <h2>{{ playSession.title }}</h2>
            <p class="subtitle">
              {{ playSession.gameType }} ·
              {{ playSession.status === 'lobby' ? '等待开始' : playSession.status === 'active' ? '进行中' : '已结束' }}
            </p>
          </div>
          <RouterLink to="/sessions" class="link">返回列表</RouterLink>
        </header>

        <section v-if="isHost && playSession.status === 'lobby'" class="card">
          <p>你是房主，开启竞赛后成员可以各自开始游戏。</p>
          <button type="button" class="btn primary" :disabled="starting" @click="handleStartSession">
            {{ starting ? '开启中…' : '开启竞赛' }}
          </button>
        </section>

        <section v-if="isHost" class="card">
          <h3>邀请成员</h3>
          <button type="button" class="btn" :disabled="inviting" @click="handleInvite">
            {{ inviting ? '生成中…' : '生成邀请链接' }}
          </button>
          <div v-if="inviteUrl" class="invite-row">
            <code>{{ inviteUrl }}</code>
            <button type="button" class="btn" @click="copyInvite">{{ copied ? '已复制' : '复制' }}</button>
          </div>
        </section>

        <section v-if="canStartPlay" class="card highlight">
          <h3>开始你的挑战</h3>
          <p class="hint">每人独立游玩一局，完成后成绩计入本房间排行榜。</p>
          <button type="button" class="btn primary" :disabled="playing" @click="handleStartPlay">
            {{ playing ? '准备中…' : '开始游戏' }}
          </button>
        </section>

        <section class="card">
          <h3>进度</h3>
          <SessionProgressBar :participants="participants" :game-type="playSession.gameType" />
        </section>

        <section class="card">
          <h3>房间排行榜</h3>
          <SessionLeaderboard :entries="leaderboard" show-status />
        </section>
      </template>
    </div>
  </AppLayout>
</template>

<style scoped>
.page {
  max-width: 56rem;
  margin: 0 auto;
  display: grid;
  gap: 1rem;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.header h2 {
  margin: 0;
}

.subtitle {
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
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.08);
}

.card.highlight {
  border: 1px solid #bfdbfe;
  background: #eff6ff;
}

.card h3 {
  margin: 0 0 0.75rem;
}

.hint {
  color: #64748b;
  font-size: 0.875rem;
}

.error {
  color: #b91c1c;
}

.invite-row {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.75rem;
  flex-wrap: wrap;
  align-items: center;
}

code {
  flex: 1;
  background: #f8fafc;
  padding: 0.5rem;
  border-radius: 0.375rem;
  font-size: 0.75rem;
  word-break: break-all;
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

@media (max-width: 768px) {
  .page {
    gap: 0.75rem;
  }

  .header {
    flex-direction: column;
    gap: 0.5rem;
  }

  .card {
    padding: 1rem;
  }

  .invite-row {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
