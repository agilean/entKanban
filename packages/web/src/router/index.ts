import { createRouter, createWebHistory } from 'vue-router';
import HomePage from '../pages/HomePage.vue';
import GamePage from '../pages/GamePage.vue';
import KnowledgeBasePage from '../pages/KnowledgeBasePage.vue';
import WasteBoardPage from '../pages/WasteBoardPage.vue';
import { useAuthStore } from '../stores/authStore';

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomePage,
      meta: { title: '首页' },
    },
    {
      path: '/knowledge',
      name: 'knowledge',
      component: KnowledgeBasePage,
      meta: { title: '精益知识库' },
    },
    {
      path: '/waste',
      name: 'waste',
      component: WasteBoardPage,
      meta: { title: '浪费排行榜' },
    },
    {
      path: '/game',
      name: 'game',
      component: GamePage,
      meta: { title: '精益游戏屋' },
    },
    {
      path: '/leaderboard',
      name: 'leaderboard',
      component: () => import('../pages/LeaderboardPage.vue'),
      meta: { title: '排行榜' },
    },
    {
      path: '/org',
      name: 'org',
      component: () => import('../pages/OrgPage.vue'),
      meta: { title: '组织' },
    },
    {
      path: '/sessions',
      name: 'sessions',
      component: () => import('../pages/PlaySessionListPage.vue'),
      meta: { title: '竞赛房' },
    },
    {
      path: '/sessions/new',
      name: 'session-new',
      component: () => import('../pages/CreatePlaySessionPage.vue'),
      meta: { title: '创建竞赛房' },
    },
    {
      path: '/sessions/invite/:token',
      name: 'session-invite',
      component: () => import('../pages/SessionInvitePage.vue'),
      meta: { title: '竞赛房邀请' },
    },
    {
      path: '/sessions/:id',
      name: 'session-detail',
      component: () => import('../pages/PlaySessionDetailPage.vue'),
      meta: { title: '竞赛房' },
    },
    {
      path: '/invite/:token',
      name: 'invite',
      component: () => import('../pages/InvitePage.vue'),
      meta: { title: '组织邀请' },
    },
    {
      path: '/evacuation',
      name: 'evacuation',
      component: () => import('../pages/EvacuationSimPage.vue'),
      meta: { title: '疏散模拟' },
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/',
    },
  ],
});

router.beforeEach((to) => {
  if (to.meta.devOnly && !import.meta.env.DEV) {
    return '/';
  }
  const auth = useAuthStore();
  if (!auth.initialized && !auth.loading) {
    void auth.initialize();
  }
});
