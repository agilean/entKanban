<script setup lang="ts">
import { RouterLink } from 'vue-router';
import UserMenu from '../components/layout/UserMenu.vue';
import { HUB_GAMES } from '../utils/gameHub';
</script>

<template>
  <div class="hub">
    <header class="header">
      <div class="brand">
        <RouterLink to="/" class="home-link">← 返回首页</RouterLink>
        <h1>精益游戏屋</h1>
        <p>选择一款模拟游戏，在体验中理解精益思想</p>
      </div>
      <UserMenu />
    </header>

    <main class="main">
      <section class="hero">
        <h2>选择游戏</h2>
        <p>更多玩法持续更新中，欢迎体验现有玩法。</p>
      </section>

      <div class="cards">
        <component
          :is="game.external ? 'a' : RouterLink"
          v-for="game in HUB_GAMES"
          :key="game.id"
          v-bind="game.external ? { href: game.available ? game.route : '#' } : { to: game.available ? game.route : '#' }"
          class="card"
          :class="{ 'card--disabled': !game.available }"
          :style="{ '--accent': game.accent }"
          @click="!game.available && $event.preventDefault()"
        >
          <span class="card-icon" aria-hidden="true">{{ game.icon }}</span>
          <h3>{{ game.title }}</h3>
          <p>{{ game.description }}</p>
          <span v-if="game.available" class="card-cta">开始游戏 →</span>
          <span v-else class="card-cta muted">{{ game.comingSoonLabel ?? '即将上线' }}</span>
        </component>
      </div>
    </main>
  </div>
</template>

<style scoped>
.hub {
  min-height: 100vh;
  background: linear-gradient(160deg, #f0fdf4 0%, #ecfdf5 40%, #f8fafc 100%);
}

.header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  padding: 1.25rem 2rem;
  border-bottom: 1px solid rgba(148, 163, 184, 0.25);
  background: rgba(255, 255, 255, 0.75);
  backdrop-filter: blur(8px);
}

.brand h1 {
  margin: 0.5rem 0 0;
  font-size: 1.5rem;
  color: #0f172a;
}

.brand p {
  margin: 0.25rem 0 0;
  font-size: 0.875rem;
  color: #64748b;
}

.home-link {
  font-size: 0.875rem;
  color: #64748b;
  text-decoration: none;
}

.home-link:hover {
  color: #059669;
}

.main {
  max-width: 880px;
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

.card:hover:not(.card--disabled) {
  transform: translateY(-2px);
  border-color: var(--accent);
  box-shadow: 0 12px 32px rgba(15, 23, 42, 0.08);
}

.card--disabled {
  cursor: not-allowed;
  opacity: 0.65;
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

.card-cta.muted {
  color: #94a3b8;
}
</style>
