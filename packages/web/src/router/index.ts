import { createRouter, createWebHistory } from 'vue-router';
import GamePage from '../pages/GamePage.vue';
import { useAuthStore } from '../stores/authStore';

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'game',
      component: GamePage,
      meta: { title: '游戏' },
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
      meta: { devOnly: true, title: '疏散模拟' },
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/',
    },
  ],
});

router.beforeEach(async (to) => {
  if (to.meta.devOnly && !import.meta.env.DEV) {
    return '/';
  }
  const auth = useAuthStore();
  if (!auth.initialized) {
    await auth.initialize();
  }
});
