<script setup lang="ts">
import { RouterLink } from 'vue-router';
import UserMenu from '../components/layout/UserMenu.vue';

const topics = [
  {
    title: '七大浪费',
    summary: '过量生产、等待、搬运、过度加工、库存、动作、缺陷——识别浪费是改善的起点。',
    tags: ['基础', '现场观察'],
  },
  {
    title: '价值流图 VSM',
    summary: '从客户请求到交付的全流程可视化，区分增值与非增值活动，找到改善杠杆点。',
    tags: ['工具', '流程分析'],
  },
  {
    title: '看板与拉动',
    summary: '以实际需求信号驱动生产，限制在制品，让工作在系统中顺畅流动。',
    tags: ['工具', '流动'],
  },
  {
    title: '单件流与小批量',
    summary: '缩短交付周期、降低在制品库存，快速暴露问题并加速学习循环。',
    tags: ['实践', '流动'],
  },
  {
    title: '5S 与目视管理',
    summary: '整理、整顿、清扫、清洁、素养——让异常一眼可见，维持改善成果。',
    tags: ['基础', '现场'],
  },
  {
    title: '持续改善 PDCA',
    summary: '计划、执行、检查、行动——小步快跑，用数据验证假设，形成组织学习。',
    tags: ['方法论', '管理'],
  },
];
</script>

<template>
  <div class="page">
    <header class="header">
      <div class="brand">
        <RouterLink to="/" class="back">← 首页</RouterLink>
        <h1>精益知识库</h1>
        <p>核心概念与常用工具速览</p>
      </div>
      <UserMenu />
    </header>

    <main class="main">
      <section class="intro">
        <p>
          这里汇集了精益生产的核心知识框架。建议结合「浪费排行榜」的现场观察与「精益游戏屋」的模拟体验，加深理解。
        </p>
      </section>

      <div class="topics">
        <article v-for="topic in topics" :key="topic.title" class="topic-card">
          <h2>{{ topic.title }}</h2>
          <p>{{ topic.summary }}</p>
          <div class="tags">
            <span v-for="tag in topic.tags" :key="tag" class="tag">{{ tag }}</span>
          </div>
        </article>
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
  color: #2563eb;
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
  max-width: 880px;
  margin: 0 auto;
  padding: 2rem 1.5rem 3rem;
}

.intro {
  margin-bottom: 1.5rem;
  padding: 1rem 1.25rem;
  background: #eff6ff;
  border-radius: 0.75rem;
  border: 1px solid #bfdbfe;
  color: #1e40af;
  font-size: 0.9375rem;
  line-height: 1.6;
}

.intro p {
  margin: 0;
}

.topics {
  display: grid;
  gap: 1rem;
}

.topic-card {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 0.75rem;
  padding: 1.25rem 1.5rem;
}

.topic-card h2 {
  margin: 0 0 0.5rem;
  font-size: 1.0625rem;
  color: #0f172a;
}

.topic-card p {
  margin: 0;
  font-size: 0.9375rem;
  line-height: 1.65;
  color: #475569;
}

.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
  margin-top: 0.75rem;
}

.tag {
  font-size: 0.75rem;
  padding: 0.125rem 0.5rem;
  border-radius: 999px;
  background: #f1f5f9;
  color: #64748b;
}
</style>
