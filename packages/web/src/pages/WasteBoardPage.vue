<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';
import UserMenu from '../components/layout/UserMenu.vue';
import { useAuthStore } from '../stores/authStore';
import {
  commentWasteEntry,
  fetchWasteEntries,
  fetchWasteLeaderboard,
  joinWasteTeam,
  submitWasteEntry,
  upvoteWasteEntry,
  type WasteEntry,
  type WasteLeaderboardEntry,
} from '../utils/wasteApi';

const auth = useAuthStore();

const leaderboard = ref<WasteLeaderboardEntry[]>([]);
const allEntries = ref<WasteEntry[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);
const filterNickname = ref<string | null>(null);

const entries = computed(() => {
  if (!filterNickname.value) {
    return allEntries.value;
  }
  return allEntries.value.filter((entry) => entry.authorNickname === filterNickname.value);
});

const submitNickname = ref('');
const newDescription = ref('');
const submitting = ref(false);
const submitError = ref<string | null>(null);

const commentDrafts = ref<Record<string, string>>({});
const commentErrors = ref<Record<string, string>>({});
const commentLoading = ref<Record<string, boolean>>({});
const teamLoading = ref<Record<string, boolean>>({});

async function loadData(): Promise<void> {
  loading.value = true;
  error.value = null;
  try {
    const [board, list] = await Promise.all([fetchWasteLeaderboard(30), fetchWasteEntries(30)]);
    leaderboard.value = board;
    allEntries.value = list;
  } catch {
    error.value = '加载失败，请稍后重试';
  } finally {
    loading.value = false;
  }
}

function loginForWaste(): void {
  auth.login('waste');
}

async function handleSubmit(): Promise<void> {
  if (submitting.value) {
    return;
  }

  const nickname = submitNickname.value.trim();
  const description = newDescription.value.trim();
  if (nickname.length < 2) {
    submitError.value = '花名至少 2 个字';
    return;
  }
  if (description.length < 10) {
    submitError.value = '描述至少 10 个字';
    return;
  }

  submitting.value = true;
  submitError.value = null;
  try {
    const result = await submitWasteEntry(nickname, description);
    if (!result.ok) {
      submitError.value = result.error ?? '提交失败';
      return;
    }
    submitNickname.value = '';
    newDescription.value = '';
    void loadData();
  } finally {
    submitting.value = false;
  }
}

async function handleUpvote(entry: WasteEntry): Promise<void> {
  if (!auth.isLoggedIn) {
    loginForWaste();
    return;
  }
  if (entry.hasUpvoted) {
    return;
  }
  const result = await upvoteWasteEntry(entry.id);
  if ('error' in result) {
    return;
  }
  entry.hasUpvoted = true;
  entry.upvoteCount = result.upvoteCount;
  await loadData();
}

function commentLength(id: string): number {
  return commentDrafts.value[id]?.trim().length ?? 0;
}

async function handleComment(entry: WasteEntry): Promise<void> {
  if (!auth.isLoggedIn) {
    loginForWaste();
    return;
  }
  const content = commentDrafts.value[entry.id]?.trim() ?? '';
  if (content.length < 20) {
    commentErrors.value[entry.id] = '评论至少 20 个字';
    return;
  }
  if (commentLoading.value[entry.id]) {
    return;
  }
  commentLoading.value[entry.id] = true;
  commentErrors.value[entry.id] = '';
  try {
    const result = await commentWasteEntry(entry.id, content);
    if ('error' in result) {
      commentErrors.value[entry.id] = result.error;
      return;
    }
    commentDrafts.value[entry.id] = '';
    void loadData();
  } finally {
    commentLoading.value[entry.id] = false;
  }
}

async function handleJoinTeam(entry: WasteEntry): Promise<void> {
  if (!auth.isLoggedIn) {
    loginForWaste();
    return;
  }
  if (entry.hasJoinedTeam || teamLoading.value[entry.id]) {
    return;
  }
  teamLoading.value[entry.id] = true;
  try {
    const result = await joinWasteTeam(entry.id);
    if ('error' in result) {
      return;
    }
    void loadData();
  } finally {
    teamLoading.value[entry.id] = false;
  }
}

function formatDate(value: string): string {
  return new Date(value).toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function selectNickname(nickname: string): void {
  filterNickname.value = filterNickname.value === nickname ? null : nickname;
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
        <h1>浪费排行榜</h1>
        <p>匿名分享 · 登录后可顶、评论、加入战队一起解决</p>
      </div>
      <UserMenu />
    </header>

    <main class="main">
      <aside class="sidebar">
        <section class="panel">
          <h2>精益排行榜</h2>
          <p class="hint">按「被顶 ×1 + 被评 ×2」累计积分，只展示发表时的花名。</p>
          <div v-if="loading && !leaderboard.length" class="muted">加载中…</div>
          <ol v-else-if="leaderboard.length" class="rank-list">
            <li
              v-for="item in leaderboard"
              :key="item.nickname"
              class="rank-item clickable"
              :class="{ active: filterNickname === item.nickname }"
              @click="selectNickname(item.nickname)"
            >
              <span class="rank" :class="{ top: item.rank <= 3 }">{{ item.rank }}</span>
              <div class="rank-body">
                <strong>{{ item.nickname }}</strong>
                <span class="rank-meta">{{ item.score }} 分 · {{ item.submissionCount }} 条观察</span>
              </div>
            </li>
          </ol>
          <p v-else class="muted">还没有上榜记录，来做第一个分享者吧。</p>
          <button
            v-if="filterNickname"
            type="button"
            class="clear-filter"
            @click="filterNickname = null"
          >
            清除筛选：{{ filterNickname }}
          </button>
        </section>

        <section class="panel subtle">
          <h2>互动说明</h2>
          <ul class="rules">
            <li>发表浪费现象<strong>无需登录</strong>，填写花名即可</li>
            <li>
              <button type="button" class="link-btn" @click="loginForWaste">飞书登录</button>
              后可顶（+1）、评论（+2）
            </li>
            <li>登录后可加入<strong>改善战队</strong>，与同事一起推动解决</li>
          </ul>
        </section>
      </aside>

      <div class="content">
        <section v-if="filterNickname" class="panel filter-banner">
          正在查看 <strong>{{ filterNickname }}</strong> 的浪费观察
          <button type="button" class="link-btn" @click="filterNickname = null">查看全部</button>
        </section>

        <section class="panel">
          <h2>分享浪费现象</h2>
          <p class="hint">无需登录，填写花名和观察内容即可提交。</p>
          <input
            v-model="submitNickname"
            type="text"
            maxlength="20"
            placeholder="你的花名（2-20 字）"
            class="input"
          />
          <textarea
            v-model="newDescription"
            class="textarea"
            rows="4"
            maxlength="500"
            placeholder="描述你观察到的浪费现象，例如：审批环节等待超过 2 天，信息在三个系统间重复录入…（至少 10 字）"
          />
          <div class="form-footer">
            <span class="char-count">{{ newDescription.trim().length }} / 500</span>
            <button type="button" class="btn primary" :disabled="submitting" @click="handleSubmit">
              {{ submitting ? '提交中…' : '提交' }}
            </button>
          </div>
          <p v-if="submitError" class="error">{{ submitError }}</p>
        </section>

        <p v-if="error" class="error banner">{{ error }}</p>

        <section v-for="entry in entries" :key="entry.id" class="panel entry">
          <div class="entry-header">
            <span class="author">{{ entry.authorNickname }}</span>
            <time>{{ formatDate(entry.createdAt) }}</time>
          </div>
          <p class="entry-desc">{{ entry.description }}</p>
          <div class="entry-actions">
            <button
              type="button"
              class="action-btn"
              :class="{ active: entry.hasUpvoted }"
              :disabled="entry.hasUpvoted"
              @click="handleUpvote(entry)"
            >
              👍 顶 {{ entry.upvoteCount }}
            </button>
            <span class="action-meta">💬 {{ entry.commentCount }} 条评论</span>
            <button
              type="button"
              class="action-btn team"
              :class="{ active: entry.hasJoinedTeam }"
              :disabled="entry.hasJoinedTeam || teamLoading[entry.id]"
              @click="handleJoinTeam(entry)"
            >
              {{ entry.hasJoinedTeam ? '✓ 已加入战队' : teamLoading[entry.id] ? '加入中…' : '🤝 加入战队' }}
              <span v-if="entry.teamCount">({{ entry.teamCount }})</span>
            </button>
          </div>

          <div v-if="entry.teamMembers.length" class="team-box">
            <span class="team-label">改善战队：</span>
            <span v-for="member in entry.teamMembers" :key="member.userId" class="team-member">
              {{ member.name }}
            </span>
          </div>

          <ul v-if="entry.comments.length" class="comments">
            <li v-for="comment in entry.comments" :key="comment.id">
              <strong>{{ comment.authorName }}</strong>
              <span class="comment-time">{{ formatDate(comment.createdAt) }}</span>
              <p>{{ comment.content }}</p>
            </li>
          </ul>

          <div class="comment-form">
            <p v-if="!auth.isLoggedIn" class="hint inline">
              <button type="button" class="link-btn" @click="loginForWaste">登录</button>
              后可评论
            </p>
            <template v-else>
              <textarea
                v-model="commentDrafts[entry.id]"
                class="textarea small"
                rows="2"
                maxlength="1000"
                placeholder="写下你的看法或改善建议（至少 20 字）"
              />
              <div class="form-footer">
                <span
                  class="char-count"
                  :class="{ warn: commentLength(entry.id) > 0 && commentLength(entry.id) < 20 }"
                >
                  {{ commentLength(entry.id) }} / 20 字起
                </span>
                <button
                  type="button"
                  class="btn"
                  :disabled="commentLoading[entry.id]"
                  @click="handleComment(entry)"
                >
                  {{ commentLoading[entry.id] ? '发送中…' : '评论 +2' }}
                </button>
              </div>
              <p v-if="commentErrors[entry.id]" class="error">{{ commentErrors[entry.id] }}</p>
            </template>
          </div>
        </section>

        <p v-if="!loading && !entries.length" class="muted center">暂无分享，来记录第一个浪费现象吧。</p>
      </div>
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

.back:hover {
  color: #d97706;
}

.brand h1 {
  margin: 0;
  font-size: 1.5rem;
  color: #0f172a;
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
  max-width: 1080px;
  margin: 0 auto;
  padding: 1.5rem;
  align-items: start;
}

.panel {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 0.75rem;
  padding: 1.25rem;
  margin-bottom: 1rem;
}

.panel h2 {
  margin: 0 0 0.5rem;
  font-size: 1rem;
  color: #0f172a;
}

.panel.subtle {
  background: #f8fafc;
}

.hint {
  margin: 0 0 0.75rem;
  font-size: 0.8125rem;
  color: #64748b;
  line-height: 1.5;
}

.hint.inline {
  margin: 0;
}

.rules {
  margin: 0;
  padding-left: 1.125rem;
  font-size: 0.8125rem;
  color: #475569;
  line-height: 1.7;
}

.rules li {
  margin-bottom: 0.375rem;
}

.muted {
  font-size: 0.875rem;
  color: #94a3b8;
}

.center {
  text-align: center;
  padding: 2rem;
}

.rank-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.rank-item.clickable {
  cursor: pointer;
  border-radius: 0.5rem;
  padding: 0.5rem;
  margin: 0 -0.5rem;
}

.rank-item.clickable:hover {
  background: #fffbeb;
}

.rank-item.clickable.active {
  background: #fef3c7;
}

.clear-filter {
  margin-top: 0.75rem;
  width: 100%;
  border: 1px dashed #fcd34d;
  background: #fffbeb;
  color: #b45309;
  border-radius: 0.5rem;
  padding: 0.375rem 0.5rem;
  font-size: 0.8125rem;
  cursor: pointer;
}

.filter-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  background: #fffbeb;
  border-color: #fcd34d;
  font-size: 0.875rem;
}

.filter-banner strong {
  color: #b45309;
}

.rank-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 0;
  border-bottom: 1px solid #f1f5f9;
}

.rank-item:last-child {
  border-bottom: none;
}

.rank {
  width: 1.75rem;
  height: 1.75rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: #f1f5f9;
  font-size: 0.8125rem;
  font-weight: 700;
  color: #64748b;
  flex-shrink: 0;
}

.rank.top {
  background: #fef3c7;
  color: #b45309;
}

.rank-body strong {
  display: block;
  font-size: 0.9375rem;
}

.rank-meta {
  font-size: 0.75rem;
  color: #94a3b8;
}

.input,
.textarea {
  width: 100%;
  border: 1px solid #cbd5e1;
  border-radius: 0.5rem;
  padding: 0.625rem 0.75rem;
  font: inherit;
  font-size: 0.875rem;
  resize: vertical;
}

.input {
  margin-bottom: 0.625rem;
}

.textarea.small {
  min-height: 4rem;
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
  background: #d97706;
  border-color: #d97706;
  color: #fff;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.link-btn {
  border: none;
  background: none;
  color: #2563eb;
  cursor: pointer;
  font: inherit;
  padding: 0;
  text-decoration: underline;
}

.form-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 0.5rem;
}

.char-count {
  font-size: 0.75rem;
  color: #94a3b8;
}

.char-count.warn {
  color: #dc2626;
}

.error {
  margin: 0.5rem 0 0;
  font-size: 0.8125rem;
  color: #dc2626;
}

.error.banner {
  margin-bottom: 1rem;
}

.entry-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.author {
  font-weight: 600;
  color: #b45309;
}

.entry-header time {
  font-size: 0.75rem;
  color: #94a3b8;
}

.entry-desc {
  margin: 0 0 0.75rem;
  line-height: 1.65;
  color: #334155;
}

.entry-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}

.action-btn {
  border: 1px solid #e2e8f0;
  background: #f8fafc;
  border-radius: 999px;
  padding: 0.375rem 0.875rem;
  font-size: 0.8125rem;
  cursor: pointer;
}

.action-btn.active {
  background: #fef3c7;
  border-color: #fcd34d;
  color: #b45309;
}

.action-btn.team.active {
  background: #ecfdf5;
  border-color: #6ee7b7;
  color: #047857;
}

.action-meta {
  font-size: 0.8125rem;
  color: #94a3b8;
}

.team-box {
  margin-bottom: 0.75rem;
  padding: 0.625rem 0.75rem;
  background: #f0fdf4;
  border-radius: 0.5rem;
  font-size: 0.8125rem;
}

.team-label {
  color: #047857;
  font-weight: 600;
}

.team-member {
  display: inline-block;
  margin-left: 0.375rem;
  padding: 0.125rem 0.5rem;
  background: #fff;
  border-radius: 999px;
  color: #334155;
}

.comments {
  list-style: none;
  margin: 0 0 0.75rem;
  padding: 0;
  border-top: 1px solid #f1f5f9;
  padding-top: 0.75rem;
}

.comments li {
  margin-bottom: 0.75rem;
}

.comments li strong {
  font-size: 0.8125rem;
  color: #475569;
}

.comment-time {
  margin-left: 0.5rem;
  font-size: 0.75rem;
  color: #94a3b8;
}

.comments li p {
  margin: 0.25rem 0 0;
  font-size: 0.875rem;
  line-height: 1.55;
  color: #334155;
}

.comment-form {
  border-top: 1px solid #f1f5f9;
  padding-top: 0.75rem;
}

@media (max-width: 768px) {
  .main {
    grid-template-columns: 1fr;
  }
}
</style>
