<script setup lang="ts">
import { computed } from 'vue';
import { getGameType } from '@kanban-game/engine';
import type { PlaySessionParticipant } from '../../utils/playSessionApi';

const props = defineProps<{
  participants: PlaySessionParticipant[];
  gameType?: string;
}>();

const maxDay = computed(() => getGameType(props.gameType ?? 'kanban')?.maxDay ?? 21);

function statusLabel(status: string): string {
  switch (status) {
    case 'completed':
      return '已完成';
    case 'playing':
      return '进行中';
    default:
      return '未开始';
  }
}

function progressPercent(participant: PlaySessionParticipant): number {
  if (participant.status === 'completed') {
    return 100;
  }
  if (!participant.currentDay) {
    return 0;
  }
  return Math.min(100, Math.round((participant.currentDay / maxDay.value) * 100));
}
</script>

<template>
  <div class="progress-list">
    <div v-for="participant in participants" :key="participant.userId" class="row">
      <div class="meta">
        <img v-if="participant.avatarUrl" :src="participant.avatarUrl" alt="" class="avatar" />
        <div>
          <div class="name">{{ participant.userName ?? '玩家' }}</div>
          <div class="status">{{ statusLabel(participant.status) }}</div>
        </div>
        <div class="score">
          <template v-if="participant.status === 'completed'">
            {{ participant.score?.toLocaleString() }}
          </template>
          <template v-else-if="participant.currentDay">
            Day {{ participant.currentDay }}/{{ maxDay }}
          </template>
        </div>
      </div>
      <div class="bar-track">
        <div class="bar-fill" :style="{ width: `${progressPercent(participant)}%` }" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.progress-list {
  display: grid;
  gap: 0.75rem;
}

.row {
  background: #f8fafc;
  border-radius: 0.5rem;
  padding: 0.75rem;
}

.meta {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.avatar {
  width: 2rem;
  height: 2rem;
  border-radius: 999px;
  object-fit: cover;
}

.name {
  font-size: 0.875rem;
  font-weight: 600;
}

.status {
  font-size: 0.75rem;
  color: #64748b;
}

.score {
  margin-left: auto;
  font-size: 0.875rem;
  font-weight: 600;
  color: #1e293b;
}

.bar-track {
  height: 0.5rem;
  background: #e2e8f0;
  border-radius: 999px;
  overflow: hidden;
}

.bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #3b82f6, #2563eb);
  border-radius: 999px;
  transition: width 0.3s ease;
}
</style>
