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
import { ElMessageBox } from 'element-plus'

const router = useRouter()
const { dark } = useTheme()
const { state, isMember, isAdmin, logout, refreshMembership } = useAuth()

let refreshTimer = null
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
        <button v-for="item in modules" :key="item[0]" :class="{ active: active === item[0] }" @click="openModule(item[0])">
          <el-icon><component :is="item[2]" /></el-icon><span>{{ item[1] }}</span><Lock v-if="item[3] && !isMember" class="mini-lock" />
        </button>
      </nav>
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
</style>
