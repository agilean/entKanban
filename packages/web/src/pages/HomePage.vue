<script setup lang="ts">
import { RouterLink } from 'vue-router';
import UserMenu from '../components/layout/UserMenu.vue';

const sections = [
  {
    title: '精益知识库',
    description: '系统学习精益思想、工具与实践方法，建立共同的改善语言。',
    path: '/knowledge',
    icon: '📚',
    accent: '#2563eb',
  },
  {
    title: '浪费排行榜',
    description: '发现身边的浪费，匿名分享花名即可。登录后可顶、评论、加入战队一起解决。',
    path: '/waste',
    icon: '🏆',
    accent: '#d97706',
  },
  {
    title: '精益游戏屋',
    description: 'EntKanban 看板模拟与疏散演练，在体验中理解流动、拉动与限制 WIP。',
    path: '/game',
    icon: '🎮',
    accent: '#059669',
  },
];
</script>

<template>
  <div class="home">
    <header class="header">
      <div class="brand">
        <h1>精益学习平台</h1>
        <p>知识 · 观察 · 实践，三位一体推进持续改善</p>
      </div>
      <UserMenu />
    </header>

    <main class="main">
      <section class="hero">
        <h2>选择一个板块开始</h2>
        <p>从理论到观察，再到模拟演练，完整走通精益改善闭环。</p>
      </section>

      <div class="cards">
        <RouterLink
          v-for="section in sections"
          :key="section.path"
          :to="section.path"
          class="card"
          :style="{ '--accent': section.accent }"
        >
          <span class="card-icon" aria-hidden="true">{{ section.icon }}</span>
          <h3>{{ section.title }}</h3>
          <p>{{ section.description }}</p>
          <span class="card-cta">进入 →</span>
        </RouterLink>
      </div>
    </main>
  </div>
</template>

<style scoped>
.home {
  min-height: 100vh;
  background: linear-gradient(160deg, #f8fafc 0%, #eef2ff 45%, #f0fdf4 100%);
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.25rem 2rem;
  border-bottom: 1px solid rgba(148, 163, 184, 0.25);
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(8px);
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
  max-width: 960px;
  margin: 0 auto;
  padding: 3rem 1.5rem 4rem;
}

.hero {
  text-align: center;
  margin-bottom: 2.5rem;
}

.hero h2 {
  margin: 0 0 0.5rem;
  font-size: 1.75rem;
  color: #0f172a;
}

.hero p {
  margin: 0;
  color: #64748b;
}

.cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 1.25rem;
}

.card {
  display: flex;
  flex-direction: column;
  padding: 1.5rem;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 1rem;
  text-decoration: none;
  color: inherit;
  cursor: pointer;
  transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease;
  box-shadow: 0 4px 16px rgba(15, 23, 42, 0.04);
}

.card:hover {
  transform: translateY(-2px);
  border-color: var(--accent);
  box-shadow: 0 12px 32px rgba(15, 23, 42, 0.08);
}

.card-icon {
  font-size: 2rem;
  margin-bottom: 0.75rem;
}

.card h3 {
  margin: 0 0 0.5rem;
  font-size: 1.125rem;
  color: #0f172a;
}

.card p {
  margin: 0;
  flex: 1;
  font-size: 0.875rem;
  line-height: 1.6;
  color: #64748b;
}

.card-cta {
  margin-top: 1rem;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--accent);
}
</style>
