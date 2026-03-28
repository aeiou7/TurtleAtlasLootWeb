import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('@/pages/HomePage.vue'),
    },
    {
      path: '/search',
      name: 'search',
      component: () => import('@/pages/SearchPage.vue'),
    },
    {
      path: '/:category',
      name: 'category',
      component: () => import('@/pages/CategoryPage.vue'),
      props: true,
    },
    {
      path: '/:category/:pageKey',
      name: 'lootTable',
      component: () => import('@/pages/LootTablePage.vue'),
      props: true,
    },
  ],
})

export default router
