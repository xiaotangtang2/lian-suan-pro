import { createRouter, createWebHistory } from 'vue-router'
import { useAuth } from '../stores/auth.js'

const routes = [
  { path: '/', name: 'Landing', component: () => import('../views/LandingPage.vue'), meta: { title: '链算 Pro · 物流商业计算工具', description: '物流报价、真实 IRR、工作日和单位换算等免费商业计算工具。' } },
  { path: '/tools/:slug', name: 'Tool', component: () => import('../views/ToolPage.vue'), meta: { title: '免费物流计算工具 · 链算 Pro' } },
  { path: '/privacy', name: 'Privacy', component: () => import('../views/PrivacyPage.vue'), meta: { title: '隐私与会员说明 · 链算 Pro' } },
  {
    path: '/contact',
    name: 'Contact',
    component: () => import('../views/ContactPage.vue'),
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/LoginPage.vue'),
    meta: { guest: true, robots: 'noindex,nofollow' },
  },
  {
    path: '/register',
    name: 'Register',
    component: () => import('../views/RegisterPage.vue'),
    meta: { guest: true, robots: 'noindex,nofollow' },
  },
  {
    path: '/upgrade',
    name: 'Upgrade',
    component: () => import('../views/UpgradePage.vue'),
    meta: { requiresAuth: true, robots: 'noindex,nofollow' },
  },
  {
    path: '/admin',
    name: 'Admin',
    component: () => import('../views/AdminPage.vue'),
    meta: { requiresAuth: true, robots: 'noindex,nofollow' },
  },
  {
    path: '/workspace',
    name: 'Home',
    component: () => import('../views/HomePage.vue'),
    meta: { requiresAuth: true, robots: 'noindex,nofollow' },
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach((to, from, next) => {
  const { isLoggedIn, isLoading } = useAuth()
  if (isLoading.value) return next()
  if (to.meta.requiresAuth && !isLoggedIn.value) return next('/login')
  document.title = to.meta.title || '链算 Pro · 商业计算器'
  const description = document.querySelector('meta[name="description"]')
  if (description && to.meta.description) description.setAttribute('content', to.meta.description)
  const robots = document.querySelector('meta[name="robots"]')
  if (robots) robots.setAttribute('content', to.meta.robots || 'index,follow')
  next()
})

export default router
