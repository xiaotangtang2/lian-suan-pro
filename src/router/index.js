import { createRouter, createWebHistory } from 'vue-router'
import { useAuth } from '../stores/auth.js'
import seoPages from '../../seo-pages.json'

const siteOrigin = 'https://lian-suan-pro.pages.dev'
const publicTools = new Set(['logistics-quote', 'irr', 'workdays', 'unit-converter'])

function updateSeo(to) {
  const seo = seoPages.find(page => page.path === to.path)
  const title = seo?.title || to.meta.title || '链算 Pro · 商业计算器'
  const descriptionText = seo?.description || '链算 Pro 物流商业计算工具'
  const canonicalUrl = `${siteOrigin}${seo?.path || to.path}`
  document.title = title
  const setMeta = (selector, value) => document.querySelector(selector)?.setAttribute('content', value)
  setMeta('meta[name="description"]', descriptionText)
  setMeta('meta[name="keywords"]', seo?.keywords?.join(',') || '')
  setMeta('meta[name="robots"]', to.meta.robots || 'index,follow')
  setMeta('meta[property="og:title"]', title)
  setMeta('meta[property="og:description"]', descriptionText)
  setMeta('meta[property="og:url"]', canonicalUrl)
  setMeta('meta[name="twitter:title"]', title)
  setMeta('meta[name="twitter:description"]', descriptionText)
  document.querySelector('link[rel="canonical"]')?.setAttribute('href', canonicalUrl)

  let jsonLd = document.querySelector('#seo-json-ld')
  if (!jsonLd) {
    jsonLd = document.createElement('script')
    jsonLd.id = 'seo-json-ld'
    jsonLd.type = 'application/ld+json'
    document.head.appendChild(jsonLd)
  }
  jsonLd.textContent = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': to.path.startsWith('/tools/') ? 'WebApplication' : 'WebPage',
    name: seo?.heading || title,
    url: canonicalUrl,
    description: descriptionText,
    inLanguage: 'zh-CN',
    ...(to.path.startsWith('/tools/') ? {
      applicationCategory: 'BusinessApplication', operatingSystem: 'Any',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'CNY' },
    } : {}),
  })
}

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
    meta: { robots: 'noindex,nofollow' },
  },
  {
    path: '/admin',
    name: 'Admin',
    component: () => import('../views/AdminPage.vue'),
    meta: { requiresAuth: true, requiresAdmin: true, robots: 'noindex,nofollow' },
  },
  {
    path: '/workspace',
    name: 'Home',
    component: () => import('../views/HomePage.vue'),
    meta: { requiresAuth: true, robots: 'noindex,nofollow' },
  },
  { path: '/:pathMatch(.*)*', redirect: '/' },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach((to, from, next) => {
  const { isLoggedIn, isAdmin, isLoading } = useAuth()
  if (isLoading.value) return next()
  if (to.name === 'Tool' && !publicTools.has(String(to.params.slug))) return next('/tools/logistics-quote')
  // 首页是智能入口：登录用户直接回工作台，访客进入免费体验页。
  if ((to.name === 'Landing' || to.name === 'Tool') && isLoggedIn.value) return next('/workspace')
  if (to.meta.guest && isLoggedIn.value) return next('/workspace')
  // 登录页只允许由免费体验页主动进入，防止退出或受限路由自动弹出登录页。
  if (to.name === 'Login') {
    if (isLoggedIn.value) return next('/workspace')
    if (from.name !== 'Landing' && to.query.entry !== 'landing') return next('/')
  }
  // 未登录访问工作台、支付页或管理页，统一回免费体验页。
  if (to.meta.requiresAuth && !isLoggedIn.value) return next('/')
  if (to.meta.requiresAdmin && !isAdmin.value) return next('/workspace')
  updateSeo(to)
  next()
})

export default router
