<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeft, Refresh, Check, View, Close } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { supabase } from '../lib/supabase.js'
import { useAuth } from '../stores/auth.js'

const router = useRouter()
const { state, isAdmin, refreshMembership } = useAuth()

const orders = ref([])
const loading = ref(false)
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
    await loadOrders()
  } catch (e) {
    if (e !== 'cancel') ElMessage.error('操作失败：' + (e.message || '请稍后重试'))
  }
}

onMounted(async () => {
  await refreshMembership()
  loadOrders()
  timer = setInterval(loadOrders, 15000)
})

onBeforeUnmount(() => {
  if (timer) clearInterval(timer)
})
</script>

<template>
  <div class="admin-page">
    <header class="admin-topbar">
      <el-button :icon="ArrowLeft" text @click="router.push('/')">返回工作台</el-button>
      <span class="admin-user">{{ state.currentUser?.email || state.currentUser?.phone || '已登录用户' }}</span>
    </header>

    <main class="admin-main">
      <div class="admin-head">
        <div>
          <p class="admin-kicker">ORDER CONSOLE</p>
          <h1>会员订单管理</h1>
          <p>确认收款后，客户页面会自动解锁并显示 PRO 会员标记。</p>
        </div>
        <el-button :icon="Refresh" :loading="loading" @click="loadOrders">刷新</el-button>
      </div>

      <el-alert
        v-if="!isAdmin"
        title="当前账号不是管理员，无法查看订单"
        type="error"
        :closable="false"
        show-icon
      />

      <div v-else class="admin-table">
        <el-table :data="orders" v-loading="loading" stripe empty-text="暂时没有订单">
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

.admin-table { background: var(--card); border: 1px solid var(--line); border-radius: 14px; padding: 16px; }
.done-text { color: var(--muted); font-size: 13px; }

@media (max-width: 600px) {
  .admin-main { padding: 24px 12px 48px; }
  .admin-head { flex-direction: column; align-items: stretch; }
}
</style>
