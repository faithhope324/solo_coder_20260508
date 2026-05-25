import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    redirect: '/clients'
  },
  {
    path: '/clients',
    name: 'Clients',
    component: () => import('../views/Clients.vue')
  },
  {
    path: '/auth-records',
    name: 'AuthRecords',
    component: () => import('../views/AuthRecords.vue')
  },
  {
    path: '/simulate',
    name: 'Simulate',
    component: () => import('../views/Simulate.vue')
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
