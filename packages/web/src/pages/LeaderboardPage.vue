<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';
import AppLayout from '../layouts/AppLayout.vue';
import { useAuthStore } from '../stores/authStore';
import { fetchGlobalLeaderboard, fetchOrgLeaderboard, type LeaderboardEntry } from '../utils/leaderboardApi';

type TabId = 'global' | 'org';

const auth = useAuthStore();
const activeTab = ref<TabId>('global');
const entries = ref<LeaderboardEntry[]>([]);
const orgName = ref<string | null>(null);
const loading = ref(false);
const error = ref<string | null>(null);

async function loadLeaderboard(): Promise<void> {
  loading.value = true;
  error.value = null;
  try {
    if (activeTab.value === 'global') {
      entries.value = await fetchGlobalLeaderboard();
      orgName.value = null;
      return;
    }
    if (!auth.isLoggedIn || !auth.hasOrg) {
      entries.value = [];
      orgName.value = null;
      return;
    }
    const result = await fetchOrgLeaderboard();
    entries.value = result.entries;
    orgName.value = result.org?.name ?? null;
  } catch {
    error.value = '加载排行榜失败';
  } finally {
    loading.value = false;
  }
}

function switchTab(tab: TabId): void {
  activeTab.value = tab;
  void loadLeaderboard();
}

function formatDate(value: string): string {
  return new Date(value).toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

onMounted(async () => {
  if (!auth.initialized) {
    await auth.initialize();
  }
  await loadLeaderboard();
});
</script>

<template>
  <AppLayout>
    <div class="page">
      <header class="page-header">
        <div>
          <h2>排行榜</h2>
          <p class="subtitle">按 21 天累计净利润排序，每次完成挑战都会记录一条成绩。</p>
        </div>
        <RouterLink to="/" class="link">返回游戏</RouterLink>
      </header>

      <div class="tabs">
        <button type="button" class="tab" :class="{ active: activeTab === 'global' }" @click="switchTab('global')">
          全局排行榜
        </button>
        <button type="button" class="tab" :class="{ active: activeTab === 'org' }" @click="switchTab('org')">
          组织排行榜
        </button>
      </div>

      <p v-if="activeTab === 'org' && !auth.isLoggedIn" class="hint">
        请先
        <button type="button" class="inline-btn" @click="auth.login()">飞书登录</button>
        后查看组织排行榜。
      </p>
      <p v-else-if="activeTab === 'org' && auth.isLoggedIn && !auth.hasOrg" class="hint">
        你尚未加入组织，可前往
        <RouterLink to="/org">组织管理</RouterLink>
        创建组织或接受邀请。
      </p>
      <p v-else-if="activeTab === 'org' && orgName" class="hint">当前组织：{{ orgName }}</p>

      <p v-if="error" class="error">{{ error }}</p>
      <p v-else-if="loading" class="hint">加载中…</p>

      <div v-else-if="entries.length === 0" class="empty">暂无成绩记录。</div>

      <table v-else class="table">
        <thead>
          <tr>
            <th>排名</th>
            <th>玩家</th>
            <th v-if="activeTab === 'global'">组织</th>
            <th>净利润</th>
            <th>部署数</th>
            <th>完成时间</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="entry in entries" :key="`${entry.userId}-${entry.completedAt}-${entry.rank}`">
            <td>{{ entry.rank }}</td>
            <td>
              <div class="player">
                <img v-if="entry.avatarUrl" :src="entry.avatarUrl" alt="" class="avatar" />
                <span>{{ entry.userName }}</span>
              </div>
            </td>
            <td v-if="activeTab === 'global'">{{ entry.orgName ?? '—' }}</td>
            <td :class="{ positive: entry.score >= 0, negative: entry.score < 0 }">
              {{ entry.score >= 0 ? '+' : '' }}{{ entry.score.toLocaleString() }}
            </td>
            <td>{{ entry.deployedCount }}</td>
            <td>{{ formatDate(entry.completedAt) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </AppLayout>
</template>

<style scoped>
.page {
  max-width: 960px;
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

.tabs {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.tab {
  border: 1px solid #cbd5e1;
  background: #fff;
  border-radius: 0.5rem;
  padding: 0.5rem 0.875rem;
  cursor: pointer;
  color: #475569;
}

.tab.active {
  background: #2563eb;
  border-color: #2563eb;
  color: #fff;
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
}

.empty {
  padding: 2rem;
  text-align: center;
  color: #94a3b8;
  background: #fff;
  border-radius: 0.75rem;
}

.table {
  width: 100%;
  border-collapse: collapse;
  background: #fff;
  border-radius: 0.75rem;
  overflow: hidden;
}

th,
td {
  padding: 0.75rem 1rem;
  text-align: left;
  border-bottom: 1px solid #f1f5f9;
  font-size: 0.875rem;
}

th {
  background: #f8fafc;
  color: #64748b;
  font-weight: 600;
}

.player {
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

.positive {
  color: #15803d;
  font-weight: 600;
}

.negative {
  color: #b91c1c;
  font-weight: 600;
}
</style>
