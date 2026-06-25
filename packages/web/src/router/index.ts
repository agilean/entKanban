import { createRouter, createWebHistory } from 'vue-router';
import GamePage from '../pages/GamePage.vue';

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

router.beforeEach((to) => {
  if (to.meta.devOnly && !import.meta.env.DEV) {
    return '/';
  }
});
