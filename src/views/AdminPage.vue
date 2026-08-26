<script setup>
import { computed, ref, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeft, Refresh, Check, View, Close, UserFilled } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { supabase } from '../lib/supabase.js'
import { useAuth } from '../stores/auth.js'
import { trackEvent } from '../utils/analytics.js'
import { useOnlinePresence } from '../composables/useOnlinePresence.js'

const router = useRouter()
const { state, isAdmin, refreshMembership } = useAuth()
const { onlineCount, isConnected, connectionStatus } = useOnlinePresence()

const orders = ref([])
const loading = ref(false)
const visitorLoading = ref(false)
const todayVisitors = ref({ account_visitors: 0, anonymous_visitors: 0, total_visitors: 0 })
const aiLoading = ref(false)
const aiSaving = ref(false)
const aiLimitDirty = ref(false)
const aiStats = ref({ call_count: 0, estimated_tokens: 0, failed_count: 0 })
const aiSettings = ref({ daily_limit: 20, input_char_limit: 2000, output_token_limit: 700 })
const dailyAiLimit = ref(20)
const statusFilter = ref('pending')
const filteredOrders = computed(() => statusFilter.value === 'all' ? orders.value : orders.value.filter(order => order.status === statusFilter.value))
let timer = null

const statusMap = {
  pending: { text: '待确认', type: 'warning' },
  paid: { text: '已开通', type: 'success' },
  cancelled: { text: '已取消', type: 'info' },
  rejected: { text: '已驳回', type: 'danger' },
}

async function viewProof(order) {
  if (!order.proof_path) return ElMessage.warning('该订单没有付款凭证')
  const { data, error } = await supabase.storage.from('payment-proofs').createSignedUrl(order.proof_path, 300)
  if (error) return ElMessage.error('凭证加载失败：' + error.message)
  window.open(data.signedUrl, '_blank', 'noopener,noreferrer')
}

async function rejectOrder(order) {
  try {
    const { value } = await ElMessageBox.prompt('请填写驳回原因，用户将看到此说明。', '驳回付款申请', {
      confirmButtonText: '确认驳回', cancelButtonText: '取消', inputPlaceholder: '例如：未查到对应到账记录',
      inputValidator: value => !!value?.trim() || '必须填写驳回原因', type: 'warning',
    })
    const { error } = await supabase.rpc('reject_membership_order', { p_order_id: order.id, p_reason: value.trim() })
    if (error) throw error
    ElMessage.success('订单已驳回')
    trackEvent('payment_rejected', { plan: order.plan_id })
    await loadOrders()
  } catch (e) { if (e !== 'cancel') ElMessage.error('驳回失败：' + (e.message || '请稍后重试')) }
}

async function loadOrders() {
  if (!isAdmin.value) return
  loading.value = true
  try {
    const { data, error } = await supabase
      .from('membership_orders')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)
    if (error) throw error
    orders.value = data || []
  } catch (e) {
    ElMessage.error('加载订单失败：' + (e.message || '网络错误'))
  } finally {
    loading.value = false
  }
}

/** 后台 RPC 已在数据库内按账号/匿名访客去重，避免把明细数据全拉到浏览器。 */
async function loadTodayVisitors() {
  if (!isAdmin.value) return
  visitorLoading.value = true
  try {
    const { data, error } = await supabase.rpc('get_today_visitor_stats')
    if (error) throw error
    todayVisitors.value = Array.isArray(data) ? (data[0] || todayVisitors.value) : (data || todayVisitors.value)
  } catch (error) {
    // 迁移尚未执行或网络暂时不可用时，不影响订单管理。
    console.warn('读取今日访客统计失败', error.message)
  } finally {
    visitorLoading.value = false
  }
}

/** AI 用量由数据库聚合，只向管理员返回总数，不暴露用户的问题文本。 */
async function loadAiDashboard() {
  if (!isAdmin.value) return
  aiLoading.value = true
  try {
    const [statsResult, settingsResult] = await Promise.all([
      supabase.rpc('get_today_ai_stats'),
      supabase.rpc('get_ai_control_settings'),
    ])
    if (statsResult.error) throw statsResult.error
    if (settingsResult.error) throw settingsResult.error
    const stats = Array.isArray(statsResult.data) ? statsResult.data[0] : statsResult.data
    const settings = Array.isArray(settingsResult.data) ? settingsResult.data[0] : settingsResult.data
    if (stats) aiStats.value = stats
    if (settings) {
      aiSettings.value = settings
      // 管理员正在编辑时，不用定时刷新把输入框中的数值覆盖掉。
      if (!aiLimitDirty.value) dailyAiLimit.value = settings.daily_limit
    }
  } catch (error) {
    console.warn('读取 AI 用量统计失败', error.message)
  } finally {
    aiLoading.value = false
  }
}

async function saveDailyAiLimit() {
  const limit = Number(dailyAiLimit.value)
  if (!Number.isInteger(limit) || limit < 1 || limit > 1000) {
    ElMessage.warning('每日 AI 调用次数必须是 1 到 1000 的整数')
    return
  }
  aiSaving.value = true
  try {
    const { data, error } = await supabase.rpc('update_ai_daily_limit', { p_daily_limit: limit })
    if (error) throw error
    dailyAiLimit.value = data
    aiSettings.value = { ...aiSettings.value, daily_limit: data }
    aiLimitDirty.value = false
    ElMessage.success(`每日 AI 调用上限已设为 ${data} 次`)
  } catch (error) {
    ElMessage.error('保存 AI 调用上限失败：' + (error.message || '网络错误'))
  } finally {
    aiSaving.value = false
  }
}

function refreshDashboard() {
  loadOrders()
  loadTodayVisitors()
  loadAiDashboard()
}

async function confirmOrder(order) {
  try {
    await ElMessageBox.confirm(
      `确认已收到「${order.plan_name}」的款项，并开通该账号的会员吗？`,
      '确认收款',
      { confirmButtonText: '确认收款并开通', cancelButtonText: '取消', type: 'warning' }
    )
    const { data, error } = await supabase.rpc('confirm_membership_order', {
      p_order_id: order.id,
    })
    if (error) throw error
    if (data === false) throw new Error('开通失败，请稍后重试')
    ElMessage.success('已确认收款，会员已开通')
    trackEvent('payment_confirmed', { plan: order.plan_id })
    await loadOrders()
  } catch (e) {
    if (e !== 'cancel') ElMessage.error('操作失败：' + (e.message || '请稍后重试'))
  }
}

onMounted(async () => {
  await refreshMembership()
  refreshDashboard()
  timer = setInterval(refreshDashboard, 15000)
})

onBeforeUnmount(() => {
  if (timer) clearInterval(timer)
})
</script>

<template>
  <div class="admin-page">
    <header class="admin-topbar">
      <el-button :icon="ArrowLeft" text @click="router.push('/workspace')">返回工作台</el-button>
      <span class="admin-user">{{ state.currentUser?.email || '已登录用户' }}</span>
    </header>

    <main class="admin-main">
      <div class="admin-head">
        <div>
          <p class="admin-kicker">ORDER CONSOLE</p>
          <h1>会员订单管理</h1>
          <p>确认收款后，客户页面会自动解锁并显示 PRO 会员标记。</p>
        </div>
        <div class="admin-actions">
          <div class="online-stat" :class="{ 'is-offline': !isConnected }" :title="isConnected ? '按正在连接的网站标签页统计' : '实时通道连接中或暂不可用'">
            <el-icon><UserFilled /></el-icon>
            <span><b>{{ onlineCount }}</b> 人在线</span>
            <i class="online-dot" aria-hidden="true"></i>
          </div>
          <div class="visitor-stat" title="按中国时区统计；同一账号当天只计一次，未登录访客按浏览器去重">
            <span>今日到访 <b>{{ todayVisitors.total_visitors }}</b></span>
            <small>账号 {{ todayVisitors.account_visitors }} · 访客 {{ todayVisitors.anonymous_visitors }}</small>
          </div>
          <el-button :icon="Refresh" :loading="loading || visitorLoading" @click="refreshDashboard">刷新</el-button>
        </div>
      </div>

      <el-alert
        v-if="!isAdmin"
        title="当前账号不是管理员，无法查看订单"
        type="error"
        :closable="false"
        show-icon
      />

      <div v-else>
        <section class="ai-admin-panel" v-loading="aiLoading">
          <div class="ai-panel-head">
            <div>
              <p class="admin-kicker">AI COST CONTROL</p>
              <h2>AI 用量与额度</h2>
              <p>统计不保存用户输入内容；Token 为模型返回值或字符量预估值。</p>
            </div>
            <div class="ai-limit-setting">
              <span>每账号每日上限</span>
              <el-input-number v-model="dailyAiLimit" :min="1" :max="1000" :step="1" controls-position="right" @update:model-value="aiLimitDirty = true" />
              <span>次</span>
              <el-button type="primary" :loading="aiSaving" @click="saveDailyAiLimit">保存</el-button>
            </div>
          </div>
          <div class="ai-metrics">
            <div class="ai-metric"><span>今日调用量</span><b>{{ aiStats.call_count }}</b><small>次</small></div>
            <div class="ai-metric"><span>预估 / 实际 Token</span><b>{{ Number(aiStats.estimated_tokens).toLocaleString() }}</b><small>Token</small></div>
            <div class="ai-metric"><span>失败次数</span><b :class="{ 'metric-danger': Number(aiStats.failed_count) > 0 }">{{ aiStats.failed_count }}</b><small>次</small></div>
            <div class="ai-metric ai-rule"><span>固定保护</span><b>{{ aiSettings.input_char_limit }} 字 / {{ aiSettings.output_token_limit }} Token</b><small>单次输入 / 输出</small></div>
          </div>
        </section>

        <div class="admin-table">
        <div class="order-filters"><el-radio-group v-model="statusFilter"><el-radio-button label="pending">待审核</el-radio-button><el-radio-button label="paid">已通过</el-radio-button><el-radio-button label="rejected">已驳回</el-radio-button><el-radio-button label="all">全部</el-radio-button></el-radio-group><span>共 {{ filteredOrders.length }} 笔</span></div>
        <el-table :data="filteredOrders" v-loading="loading" stripe empty-text="暂时没有订单">
          <el-table-column prop="created_at" label="提交时间" min-width="170">
            <template #default="{ row }">{{ new Date(row.created_at).toLocaleString('zh-CN', { hour12: false }) }}</template>
          </el-table-column>
          <el-table-column prop="email" label="账号邮箱" min-width="190" />
          <el-table-column prop="plan_name" label="套餐" width="100" />
          <el-table-column prop="amount" label="金额" width="80">
            <template #default="{ row }">¥{{ Number(row.amount).toFixed(2) }}</template>
          </el-table-column>
          <el-table-column prop="pay_method" label="支付方式" width="100">
            <template #default="{ row }">{{ row.pay_method === 'wechat' ? '微信' : '支付宝' }}</template>
          </el-table-column>
          <el-table-column prop="order_no" label="订单号" min-width="130" />
          <el-table-column label="状态" width="90">
            <template #default="{ row }">
              <el-tag :type="statusMap[row.status]?.type || 'info'" size="small">{{ statusMap[row.status]?.text || row.status }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="凭证" width="90">
            <template #default="{ row }"><el-button v-if="row.proof_path" text type="primary" :icon="View" @click="viewProof(row)">查看</el-button><span v-else>-</span></template>
          </el-table-column>
          <el-table-column prop="rejection_reason" label="驳回原因" min-width="150" show-overflow-tooltip />
          <el-table-column label="操作" width="210" fixed="right">
            <template #default="{ row }">
              <el-button
                v-if="row.status === 'pending'"
                type="primary"
                size="small"
                :icon="Check"
                @click="confirmOrder(row)"
              >
                确认收款
              </el-button>
              <el-button v-if="row.status === 'pending'" type="danger" plain size="small" :icon="Close" @click="rejectOrder(row)">驳回</el-button>
              <span v-else class="done-text">已完成</span>
            </template>
          </el-table-column>
        </el-table>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
.admin-page {
  min-height: 100vh;
  background: #f3f5f9;
}
.dark .admin-page { background: #0e1219; }

.admin-topbar {
  height: 64px; padding: 0 24px;
  display: flex; align-items: center; justify-content: space-between;
  border-bottom: 1px solid var(--line);
  background: color-mix(in srgb, var(--card) 90%, transparent);
  backdrop-filter: blur(16px); position: sticky; top: 0; z-index: 10;
}
.admin-user { font-size: 13px; color: var(--muted); }

.admin-main { max-width: 1080px; margin: 0 auto; padding: 40px 24px 64px; }
.admin-head {
  display: flex; align-items: flex-end; justify-content: space-between;
  gap: 16px; margin-bottom: 24px;
}
.admin-kicker {
  font-size: 11px; font-weight: 700; letter-spacing: .16em;
  color: var(--brand); margin: 0 0 6px;
}
.admin-head h1 { font-size: 28px; margin: 0 0 6px; }
.admin-head p { color: var(--muted); font-size: 14px; margin: 0; }
.admin-actions { display: flex; align-items: center; gap: 10px; }
.online-stat {
  display: inline-flex; align-items: center; gap: 7px; min-height: 32px;
  padding: 0 11px; border: 1px solid color-mix(in srgb, var(--brand) 22%, var(--line));
  border-radius: 9px; color: var(--brand); background: color-mix(in srgb, var(--brand) 7%, var(--card));
  font-size: 13px; white-space: nowrap;
}
.online-stat b { font-size: 16px; font-variant-numeric: tabular-nums; }
.online-dot { width: 7px; height: 7px; border-radius: 50%; background: #22a06b; box-shadow: 0 0 0 3px rgb(34 160 107 / 14%); }
.online-stat.is-offline { color: var(--muted); background: var(--card); }
.online-stat.is-offline .online-dot { background: #9aa4b5; box-shadow: none; }
.visitor-stat { display: flex; flex-direction: column; gap: 1px; padding: 4px 11px; border: 1px solid var(--line); border-radius: 9px; background: var(--card); color: var(--text); font-size: 13px; white-space: nowrap; }
.visitor-stat b { color: var(--brand); font-size: 16px; font-variant-numeric: tabular-nums; }
.visitor-stat small { color: var(--muted); font-size: 11px; }

.ai-admin-panel { margin-bottom: 16px; padding: 20px; border: 1px solid var(--line); border-radius: 14px; background: var(--card); }
.ai-panel-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 18px; }
.ai-panel-head h2 { margin: 0 0 5px; font-size: 18px; }
.ai-panel-head p { margin: 0; color: var(--muted); font-size: 12px; }
.ai-limit-setting { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; color: var(--muted); font-size: 13px; white-space: nowrap; }
.ai-limit-setting :deep(.el-input-number) { width: 112px; }
.ai-metrics { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; margin-top: 18px; }
.ai-metric { display: flex; flex-direction: column; gap: 3px; min-width: 0; padding: 13px; border-radius: 10px; background: color-mix(in srgb, var(--brand-soft) 52%, var(--card)); }
.ai-metric span, .ai-metric small { color: var(--muted); font-size: 12px; }
.ai-metric b { color: var(--brand); font-size: 21px; line-height: 1.2; font-variant-numeric: tabular-nums; overflow-wrap: anywhere; }
.ai-metric .metric-danger { color: #d94b4b; }
.ai-metric.ai-rule b { font-size: 15px; }
.admin-table { background: var(--card); border: 1px solid var(--line); border-radius: 14px; padding: 16px; }
.order-filters{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:0 0 14px;color:var(--muted);font-size:13px}
.done-text { color: var(--muted); font-size: 13px; }

@media (max-width: 600px) {
  .admin-main { padding: 24px 12px 48px; }
  .admin-head { flex-direction: column; align-items: stretch; }
  .admin-actions { justify-content: space-between; flex-wrap: wrap; }
  .ai-panel-head { flex-direction: column; }
  .ai-metrics { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
</style>
