import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  { path: '/', redirect: '/pages/messages/index' },
  { path: '/pages/messages/index', component: () => import('@/pages/messages/index.vue') },
  { path: '/pages/agents/index', component: () => import('@/pages/agents/index.vue') },
  { path: '/pages/bridge/index', component: () => import('@/pages/bridge/index.vue') },
  {
    path: '/pages/bridge/import-local',
    component: () => import('@/pages/bridge/import-local.vue'),
  },
  {
    path: '/pages/bridge/import-openclaw',
    component: () => import('@/pages/bridge/import-openclaw.vue'),
  },
  { path: '/pages/chat/landing', component: () => import('@/pages/chat/landing.vue') },
  { path: '/pages/chat/index', component: () => import('@/pages/chat/index.vue') },
  { path: '/pages/chat/history', component: () => import('@/pages/chat/history.vue') },
  { path: '/pages/chat/bot-config', component: () => import('@/pages/chat/bot-config.vue') },
  { path: '/:pathMatch(.*)*', redirect: '/pages/messages/index' },
]

export const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior: () => ({ top: 0 }),
})
