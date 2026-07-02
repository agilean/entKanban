<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';
import UserMenu from '../components/layout/UserMenu.vue';
import { useAuthStore } from '../stores/authStore';
import {
  fetchMyPersonalPoints,
  fetchPersonalLeaderboard,
  type PersonalLeaderboardEntry,
  type PersonalPointsSummary,
} from '../utils/personalApi';

const auth = useAuthStore();

const entries = ref<PersonalLeaderboardEntry[]>([]);
const mySummary = ref<PersonalPointsSummary | null>(null);
const loading = ref(false);
const error = ref<string | null>(null);

const myRank = computed(() =>
  entries.value.find((entry) => entry.userId === auth.user?.id) ?? null,
);

async function loadData(): Promise<void> {
  loading.value = true;
  error.value = null;
  try {
    entries.value = await fetchPersonalLeaderboard(50);
    if (auth.isLoggedIn) {
      mySummary.value = await fetchMyPersonalPoints();
    } else {
      mySummary.value = null;
    }
  } catch {
    error.value = '加载失败，请稍后重试';
  } finally {
    loading.value = false;
  }
}

function login(): void {
  auth.login('personal');
}

onMounted(async () => {
  if (!auth.initialized) {
    void auth.initialize();
  }
  await loadData();
});
</script>

<template>
  <div class="page">
    <header class="header">
      <div class="brand">
        <RouterLink to="/" class="back">← 首页</RouterLink>
        <h1>个人排行榜</h1>
        <p>综合游戏排名与浪费发现，累计个人积分</p>
      </div>
      <UserMenu />
    </header>

    <main class="main">
      <aside class="sidebar">
        <section class="panel rules">
          <h2>积分规则</h2>
          <ul>
            <li><strong>完成游戏</strong>：按当次组织内排名获得 10–100 分</li>
            <li><strong>提交浪费观察</strong>：登录后提交 +5 分</li>
            <li><strong>浪费被顶</strong>：+1 分 / 次</li>
            <li><strong>浪费被评</strong>：+2 分 / 次</li>
          </ul>
          <p class="hint">游戏排名：第 1 名 100 分，第 2 名 80 分，第 3 名 60 分，4–10 名 40 分，11–20 名 20 分，其余 10 分。</p>
        </section>

        <section v-if="auth.isLoggedIn && mySummary" class="panel accent">
          <h2>我的积分</h2>
          <p class="my-total">{{ mySummary.totalPoints }} 分</p>
          <p class="my-meta">游戏 {{ mySummary.gamePoints }} · 浪费 {{ mySummary.wastePoints }}</p>
          <p v-if="myRank" class="my-meta">当前排名第 {{ myRank.rank }} 名</p>
        </section>

        <section v-else class="panel subtle">
          <p class="hint">
            <button type="button" class="link-btn" @click="login">飞书登录</button>
            后参与积分排名
          </p>
        </section>
      </aside>

      <section class="content panel">
        <h2>内网成员积分榜</h2>
        <p v-if="error" class="error">{{ error }}</p>
        <div v-if="loading && !entries.length" class="muted">加载中…</div>
        <table v-else-if="entries.length" class="table">
          <thead>
            <tr>
              <th>排名</th>
              <th>成员</th>
              <th>总积分</th>
              <th>游戏</th>
              <th>浪费</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="entry in entries"
              :key="entry.userId"
              :class="{ me: entry.userId === auth.user?.id }"
            >
              <td><span class="rank" :class="{ top: entry.rank <= 3 }">{{ entry.rank }}</span></td>
              <td>
                <div class="user-cell">
                  <img v-if="entry.avatarUrl" :src="entry.avatarUrl" alt="" class="avatar" />
                  <strong>{{ entry.userName }}</strong>
                </div>
              </td>
              <td class="points">{{ entry.totalPoints }}</td>
              <td>{{ entry.gamePoints }}</td>
              <td>{{ entry.wastePoints }}</td>
            </tr>
          </tbody>
        </table>
        <p v-else class="muted">还没有积分记录，完成游戏或发现浪费即可上榜。</p>
      </section>
    </main>
  </div>
</template>

<style scoped>
.page {
  min-height: 100vh;
  background: #f8fafc;
}

.header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  padding: 1.25rem 2rem;
  background: #fff;
  border-bottom: 1px solid #e2e8f0;
}

.back {
  display: inline-block;
  margin-bottom: 0.5rem;
  font-size: 0.875rem;
  color: #64748b;
  text-decoration: none;
}

.brand h1 {
  margin: 0;
  font-size: 1.5rem;
}

.brand p {
  margin: 0.25rem 0 0;
  font-size: 0.875rem;
  color: #64748b;
}

.main {
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: 1.25rem;
  max-width: 960px;
  margin: 0 auto;
  padding: 1.5rem;
}

.panel {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 0.75rem;
  padding: 1.25rem;
  margin-bottom: 1rem;
}

.panel h2 {
  margin: 0 0 0.75rem;
  font-size: 1rem;
}

.panel.accent {
  background: #eff6ff;
  border-color: #bfdbfe;
}

.panel.subtle {
  background: #f8fafc;
}

.rules ul {
  margin: 0;
  padding-left: 1.125rem;
  font-size: 0.8125rem;
  line-height: 1.7;
  color: #475569;
}

.hint {
  margin: 0.75rem 0 0;
  font-size: 0.8125rem;
  color: #64748b;
  line-height: 1.5;
}

.my-total {
  margin: 0;
  font-size: 2rem;
  font-weight: 700;
  color: #1d4ed8;
}

.my-meta {
  margin: 0.25rem 0 0;
  font-size: 0.875rem;
  color: #475569;
}

.table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
}

.table th,
.table td {
  padding: 0.625rem 0.5rem;
  text-align: left;
  border-bottom: 1px solid #f1f5f9;
}

.table tr.me {
  background: #eff6ff;
}

.rank {
  display: inline-flex;
  width: 1.75rem;
  height: 1.75rem;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: #f1f5f9;
  font-weight: 700;
  font-size: 0.8125rem;
}

.rank.top {
  background: #dbeafe;
  color: #1d4ed8;
}

.user-cell {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.avatar {
  width: 1.75rem;
  height: 1.75rem;
  border-radius: 999px;
  object-fit: cover;
}

.points {
  font-weight: 700;
  color: #1d4ed8;
}

.muted {
  color: #94a3b8;
}

.error {
  color: #dc2626;
  font-size: 0.875rem;
}

.link-btn {
  border: none;
  background: none;
  color: #2563eb;
  cursor: pointer;
  font: inherit;
  text-decoration: underline;
}

@media (max-width: 768px) {
  .main {
    grid-template-columns: 1fr;
  }
}
</style>
