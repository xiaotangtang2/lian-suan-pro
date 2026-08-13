<script setup>
import { defineAsyncComponent, ref, onMounted, onBeforeUnmount } from 'vue'
import { Moon, Sunny, Lock, Operation, Van, Timer, TrendCharts, DocumentCopy, Files, Switch, MagicStick, SwitchButton, List } from '@element-plus/icons-vue'
const BasicCalculator = defineAsyncComponent(() => import('../components/BasicCalculator.vue'))
const LogisticsCalculator = defineAsyncComponent(() => import('../components/LogisticsCalculator.vue'))
const WorkdayCalculator = defineAsyncComponent(() => import('../components/WorkdayCalculator.vue'))
const IrrCalculator = defineAsyncComponent(() => import('../components/IrrCalculator.vue'))
const BatchCalculator = defineAsyncComponent(() => import('../components/BatchCalculator.vue'))
const FormulaTemplates = defineAsyncComponent(() => import('../components/FormulaTemplates.vue'))
const UnitConverter = defineAsyncComponent(() => import('../components/UnitConverter.vue'))
const AiCalculator = defineAsyncComponent(() => import('../components/AiCalculator.vue'))
import { useAuth } from '../stores/auth.js'
import { useTheme } from '../stores/theme.js'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'

const router = useRouter()
const { dark } = useTheme()
const { state, isMember, isAdmin, logout, refreshMembership } = useAuth()

let refreshTimer = null
const moduleMotionEnabled = ref(false)
const moduleMotionSupported = typeof window !== 'undefined' && 'DeviceOrientationEvent' in window
async function syncMembership() {
  await refreshMembership()
}
function onVisibilityChange() {
  if (document.visibilityState === 'visible') syncMembership()
}

onMounted(() => {
  syncMembership()
  window.addEventListener('focus', syncMembership)
  document.addEventListener('visibilitychange', onVisibilityChange)
  refreshTimer = setInterval(syncMembership, 30000)
})

onBeforeUnmount(() => {
  window.removeEventListener('focus', syncMembership)
  document.removeEventListener('visibilitychange', onVisibilityChange)
  if (refreshTimer) clearInterval(refreshTimer)
  window.removeEventListener('deviceorientation', onModuleOrientation)
})

const active = ref('quote')
const moduleMotionKey = ref(0)
const modules = [
  ['basic', '基础计算', Operation], ['quote', '物流报价', Van], ['work', '工时工作日', Timer],
  ['irr', '真实 IRR', TrendCharts], ['batch', '批量计算', Files, true], ['formula', '公式模板', DocumentCopy, true],
  ['unit', '单位换算', Switch], ['ai', 'AI 计算', MagicStick]
]

function openModule(id) {
  active.value = id
  // 即使重复点击当前模块，也重新挂载内容并触发完整入场动效。
  moduleMotionKey.value += 1
}

function updateNavTilt(button, clientX, clientY, strength = 1) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  const rect = button.getBoundingClientRect()
  const x = (clientX - rect.left) / rect.width - 0.5
  const y = (clientY - rect.top) / rect.height - 0.5
  button.style.setProperty('--nav-tilt-x', `${-y * 12 * strength}deg`)
  button.style.setProperty('--nav-tilt-y', `${x * 15 * strength}deg`)
  button.style.setProperty('--nav-glow-x', `${(x + 0.5) * 100}%`)
  button.style.setProperty('--nav-glow-y', `${(y + 0.5) * 100}%`)
}
function startNavTilt(event) {
  const button = event.currentTarget
  if (event.pointerType === 'touch') button.setPointerCapture(event.pointerId)
  button.classList.add('nav-tilting')
  updateNavTilt(button, event.clientX, event.clientY, event.pointerType === 'touch' ? 0.85 : 1)
}
function moveNavTilt(event) {
  const button = event.currentTarget
  if (event.pointerType === 'touch' && !button.hasPointerCapture(event.pointerId)) return
  button.classList.add('nav-tilting')
  updateNavTilt(button, event.clientX, event.clientY, event.pointerType === 'touch' ? 0.85 : 1)
}
function resetNavTilt(event) {
  const button = event.currentTarget
  if (event.pointerId !== undefined && button.hasPointerCapture?.(event.pointerId)) button.releasePointerCapture(event.pointerId)
  button.classList.remove('nav-tilting')
  button.style.setProperty('--nav-tilt-x', '0deg')
  button.style.setProperty('--nav-tilt-y', '0deg')
}
function onModuleOrientation(event) {
  if (!moduleMotionEnabled.value || event.gamma == null || event.beta == null) return
  const tiltY = Math.max(-10, Math.min(10, event.gamma * 0.38))
  const tiltX = Math.max(-7, Math.min(7, (event.beta - 45) * -0.2))
  document.querySelectorAll('.module-nav button').forEach((button) => {
    button.classList.add('nav-motion')
    button.style.setProperty('--nav-tilt-x', `${tiltX}deg`)
    button.style.setProperty('--nav-tilt-y', `${tiltY}deg`)
  })
}
async function enableModuleMotion() {
  if (!moduleMotionSupported) return ElMessage.info('当前设备不支持方向感应')
  try {
    if (typeof DeviceOrientationEvent.requestPermission === 'function') {
      const permission = await DeviceOrientationEvent.requestPermission()
      if (permission !== 'granted') throw new Error('denied')
    }
    moduleMotionEnabled.value = true
    window.addEventListener('deviceorientation', onModuleOrientation, { passive: true })
    ElMessage.success('模块卡片体感倾斜已开启')
  } catch {
    ElMessage.warning('未获得方向感应权限，仍可使用触摸倾斜')
  }
}

async function onLogout() {
  try {
    await ElMessageBox.confirm('确定要退出登录吗？', '退出确认', {
      confirmButtonText: '退出',
      cancelButtonText: '取消',
      type: 'warning',
    })
    await logout()
    router.replace('/login')
  } catch { /* user cancelled */ }
}
</script>

<template>
  <div class="app-shell">
    <header class="topbar">
      <div class="brand"><div class="brand-mark">链</div><div><strong>链算 Pro</strong><span>物流商业计算工作台</span></div></div>
      <div class="header-actions">
        <span class="user-email">{{ state.currentUser?.email || state.currentUser?.phone || '已登录用户' }}</span>
        <el-tag v-if="isMember" type="warning" effect="plain">PRO 会员</el-tag>
        <el-button v-else type="primary" size="small" @click="router.push('/upgrade')">升级会员</el-button>
        <el-tooltip content="切换明暗主题" placement="bottom">
          <el-button circle :icon="dark ? Sunny : Moon" aria-label="切换主题" @click="dark = !dark" />
        </el-tooltip>
        <el-tooltip v-if="isAdmin" content="管理订单" placement="bottom">
          <el-button circle :icon="List" aria-label="管理订单" @click="router.push('/admin')" />
        </el-tooltip>
        <el-tooltip content="退出登录" placement="bottom">
          <el-button circle :icon="SwitchButton" aria-label="退出登录" @click="onLogout" />
        </el-tooltip>
      </div>
    </header>
    <main>
      <section class="hero">
        <div><p class="eyebrow">LOCAL-FIRST BUSINESS TOOLKIT</p><h1>算得清，报得准，<em>利润不含糊。</em></h1><p>8 合 1 商业计算工作台。所有计算均在当前浏览器完成，数据不上传。</p></div>
        <div class="privacy-pill"><span></span>本地隐私计算</div>
      </section>
      <nav class="module-nav" aria-label="计算模块">
        <button v-for="item in modules" :key="item[0]" :class="{ active: active === item[0] }" @pointerenter="startNavTilt" @pointerdown="startNavTilt" @pointermove="moveNavTilt" @pointerup="resetNavTilt" @pointercancel="resetNavTilt" @pointerleave="resetNavTilt" @click="openModule(item[0])">
          <el-icon><component :is="item[2]" /></el-icon><span>{{ item[1] }}</span><Lock v-if="item[3] && !isMember" class="mini-lock" />
        </button>
      </nav>
      <div v-if="moduleMotionSupported" class="module-motion-row">
        <el-button size="small" round :type="moduleMotionEnabled ? 'success' : 'default'" @click="enableModuleMotion">{{ moduleMotionEnabled ? '体感倾斜已开启' : '开启模块卡片体感倾斜' }}</el-button>
      </div>
      <div class="tool-area">
        <section :key="moduleMotionKey" class="tool-card module-enter">
          <div class="module-enter__glow" aria-hidden="true"></div>
          <div class="module-enter__content">
            <BasicCalculator v-if="active === 'basic'" />
            <LogisticsCalculator v-else-if="active === 'quote'" />
            <WorkdayCalculator v-else-if="active === 'work'" />
            <IrrCalculator v-else-if="active === 'irr'" />
            <BatchCalculator v-else-if="active === 'batch'" :is-member="isMember" />
            <FormulaTemplates v-else-if="active === 'formula'" :is-member="isMember" />
            <UnitConverter v-else-if="active === 'unit'" />
            <AiCalculator v-else :is-member="isMember" />
          </div>
        </section>
        <!-- 广告位：有广告主后取消注释即可启用 -->
        <!-- <aside class="ad-sidebar"><AdBanner placement="sidebar" /></aside> -->
      </div>
    </main>
    <!-- <AdBanner placement="footer" class="footer-ad" /> -->
    <footer>链算 Pro · <router-link to="/contact" class="contact-link">联系我们</router-link> · 数据仅存储在你的浏览器中 · v1.0</footer>
  </div>
</template>

<style scoped>
.user-email {
  font-size: 12px;
  color: var(--muted);
  max-width: 140px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.contact-link { color: var(--brand); text-decoration: none; font-weight: 600; }
.module-motion-row { display: none; justify-content: flex-end; margin: -6px 0 14px; }
.module-nav { perspective: 1000px; }
.module-nav button { --nav-tilt-x: 0deg; --nav-tilt-y: 0deg; --nav-glow-x: 50%; --nav-glow-y: 50%; overflow: hidden; transform-style: preserve-3d; transform-origin: center; touch-action: pan-y; will-change: transform; }
.module-nav button::after { content: ''; position: absolute; inset: 0; pointer-events: none; opacity: 0; background: radial-gradient(circle at var(--nav-glow-x) var(--nav-glow-y), rgba(79,196,168,.3), transparent 48%); transition: opacity .18s; }
.module-nav button > * { position: relative; z-index: 1; transform: translateZ(12px); }
.module-nav button.nav-tilting { transform: translateY(-6px) scale(1.025) rotateX(var(--nav-tilt-x)) rotateY(var(--nav-tilt-y)); box-shadow: 0 18px 30px rgba(23,107,91,.2); transition: transform .07s linear, box-shadow .18s ease; }
.module-nav button.nav-tilting::after { opacity: 1; }
.module-nav button.nav-motion { transform: translateY(-2px) rotateX(var(--nav-tilt-x)) rotateY(var(--nav-tilt-y)); }
@media (pointer: coarse) { .module-motion-row { display: flex; } .module-nav button.nav-tilting { transform: translateY(-5px) scale(1.018) rotateX(var(--nav-tilt-x)) rotateY(var(--nav-tilt-y)); } }
</style>
