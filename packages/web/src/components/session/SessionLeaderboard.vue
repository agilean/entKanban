<script setup lang="ts">
import type { SessionLeaderboardEntry } from '../../utils/playSessionApi';

defineProps<{
  entries: SessionLeaderboardEntry[];
  showStatus?: boolean;
}>();

function formatDate(value: string | null): string {
  if (!value) {
    return '—';
  }
  return new Date(value).toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}
</script>

<template>
  <table class="table">
    <thead>
      <tr>
        <th>排名</th>
        <th>玩家</th>
        <th v-if="showStatus">状态</th>
        <th>净利润</th>
        <th>部署数</th>
        <th>完成时间</th>
      </tr>
    </thead>
    <tbody>
      <tr v-if="entries.length === 0">
        <td colspan="6" class="empty">暂无成绩</td>
      </tr>
      <tr v-for="entry in entries" :key="`${entry.userId}-${entry.rank}`">
        <td>{{ entry.rank }}</td>
        <td>
          <div class="player">
            <img v-if="entry.avatarUrl" :src="entry.avatarUrl" alt="" class="avatar" />
            <span>{{ entry.userName }}</span>
          </div>
        </td>
        <td v-if="showStatus">{{ entry.status }}</td>
        <td :class="{ positive: (entry.score ?? 0) >= 0, negative: (entry.score ?? 0) < 0 }">
          <template v-if="entry.score !== null">
            {{ entry.score >= 0 ? '+' : '' }}{{ entry.score.toLocaleString() }}
          </template>
          <template v-else>—</template>
        </td>
        <td>{{ entry.deployedCount ?? '—' }}</td>
        <td>{{ formatDate(entry.completedAt) }}</td>
      </tr>
    </tbody>
  </table>
</template>

<style scoped>
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

.empty {
  text-align: center;
  color: #94a3b8;
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
