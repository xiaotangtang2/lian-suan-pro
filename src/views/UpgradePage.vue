<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeft, Check } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { supabase } from '../lib/supabase.js'
import { useAuth } from '../stores/auth.js'
import { trackEvent } from '../utils/analytics.js'

const router = useRouter()
const { state, isMember, refreshMembership } = useAuth()

// 会员方案页默认展示月付，用户仍可主动切换为年度优惠套餐。
const selectedPlan = ref('month')
const memberBenefits = ['全部 8 个计算模块', 'Excel 批量导出', '自定义公式模板', 'AI 自然语言计算']
const plans = [
  { id: 'month', name: '月度会员', amount: 29, price: '¥29', period: '/月', desc: '按月付费，灵活使用' },
  { id: 'year', name: '年度会员', amount: 285, price: '¥285', period: '/年', desc: '折合 ¥23.75/月 · 比月付省 ¥63', tag: '约省 18%' },
]
const activePlan = computed(() => plans.find(p => p.id === selectedPlan.value))
const memberExpiryText = computed(() => {
  const value = state.currentUser?.member_expires_at
  if (!value) return '长期有效'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '有效期未知' : date.toLocaleString('zh-CN', { hour12: false })
})
const auditHint = computed(() => pendingOrder.value
  ? `已于 ${new Date(pendingOrder.value.created_at).toLocaleString('zh-CN', { hour12: false })} 提交，管理员会在工作日 2 小时内核验到账。`
  : '完成支付后提交开通申请，无需上传订单截图或填写订单号；管理员会在工作日 2 小时内核验到账。')

const qrTab = ref('wechat')
const qrLoaded = ref(false)
watch(qrTab, () => { qrLoaded.value = false })
// 订单号仅用于系统内部去重与管理员核对，不再要求用户查看、备注或填写。
const internalOrderNo = () => `LC${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 6).toUpperCase()}`

const pendingOrder = ref(null)
const latestRejectedOrder = ref(null)
const submitting = ref(false)
let statusTimer = null

async function loadMyOrders() {
  if (!state.currentUser?.id) return
  const { data } = await supabase
    .from('membership_orders')
    .select('*')
    .eq('user_id', state.currentUser.id)
    .order('created_at', { ascending: false })
    .limit(5)
  pendingOrder.value = (data || []).find(o => o.status === 'pending') || null
  latestRejectedOrder.value = (data || []).find(o => o.status === 'rejected') || null
}

async function submitPayment() {
  if (!state.currentUser?.id) { ElMessage.warning('请先登录后提交开通申请'); router.push({ path: '/login', query: { entry: 'landing' } }); return }
  if (pendingOrder.value) { ElMessage.warning('已有待开通订单，请等待管理员确认'); return }
  submitting.value = true
  try {
    const { data, error } = await supabase
      .from('membership_orders')
      .insert({
        user_id: state.currentUser.id,
        email: state.currentUser.email,
        order_no: internalOrderNo(),
        plan_id: activePlan.value.id,
        plan_name: activePlan.value.name,
        amount: activePlan.value.amount,
        pay_method: qrTab.value,
        status: 'pending',
      })
      .select()
      .single()
    if (error) throw error
    pendingOrder.value = data
    latestRejectedOrder.value = null
    trackEvent('payment_application_submitted', { plan: activePlan.value.id, pay_method: qrTab.value })
    notifyAdmin(data)
    ElMessage.success('开通申请已提交，管理员核对到账后会自动开通')
  } catch (e) {
    ElMessage.error('提交失败：' + (e.message || '请稍后重试'))
  } finally {
    submitting.value = false
  }
}

async function notifyAdmin(order) {
  try {
    await supabase.functions.invoke('notify-admin', { body: { order } })
  } catch (e) {
    console.warn('新订单微信提醒发送失败', e?.message || e)
  }
}

function onStatusVisible() {
  if (document.visibilityState === 'visible') refreshMembership()
}

onMounted(() => {
  loadMyOrders()
  refreshMembership()
  window.addEventListener('focus', refreshMembership)
  document.addEventListener('visibilitychange', onStatusVisible)
  statusTimer = setInterval(refreshMembership, 15000)
})

onBeforeUnmount(() => {
  window.removeEventListener('focus', refreshMembership)
  document.removeEventListener('visibilitychange', onStatusVisible)
  if (statusTimer) clearInterval(statusTimer)
})
</script>

<template>
  <div class="upgrade-page">
    <header class="up-topbar">
      <el-button :icon="ArrowLeft" text @click="router.push(state.currentUser ? '/workspace' : '/')">返回工作台</el-button>
<span class="up-user">{{ state.currentUser?.email || '未登录' }}</span><el-tag v-if="isMember" type="warning" effect="plain" style="margin-left:8px">PRO 会员</el-tag>
    </header>

    <section class="up-hero">
      <h1>升级 PRO 会员</h1>
      <p>同一会员等级、相同完整权益，仅付费周期不同</p>
    </section>

    <!-- 套餐选择 -->
    <section class="pricing-grid">
      <div
        v-for="plan in plans" :key="plan.id"
        class="pricing-card"
        :class="{ active: selectedPlan === plan.id }"
        @click="selectedPlan = plan.id"
      >
        <span v-if="plan.tag" class="plan-tag">{{ plan.tag }}</span>
        <div class="plan-price">{{ plan.price }}<small>{{ plan.period }}</small></div>
        <h3>{{ plan.name }}</h3>
        <p class="plan-desc">{{ plan.desc }}</p>
        <ul class="plan-features">
          <li v-for="f in memberBenefits" :key="f">
            <el-icon :size="14"><Check /></el-icon>{{ f }}
          </li>
        </ul>
      </div>
    </section>

    <!-- 支付方式 -->
    <section class="pay-section">
      <h2>选择支付方式</h2>
      <div class="pay-tabs">
        <button :class="{ active: qrTab === 'wechat' }" @click="qrTab = 'wechat'">微信支付</button>
        <button :class="{ active: qrTab === 'alipay' }" @click="qrTab = 'alipay'">支付宝</button>
      </div>

      <div class="pay-card">
        <div class="pay-qr-area">
          <div class="qr-wrapper">
            <!-- 真实收款码：把二维码图片放到 public/qr-wechat.png 和 public/qr-alipay.png -->
            <img
              :src="qrTab === 'wechat' ? '/qr-wechat.png' : '/qr-alipay.png'"
              :alt="qrTab === 'wechat' ? '微信收款码' : '支付宝收款码'"
              class="qr-img"
              @load="qrLoaded = true"
              @error="qrLoaded = false"
            />
            <!-- 图片没放时的占位提示 -->
            <div v-show="!qrLoaded" class="qr-placeholder">
              <span class="qr-icon">{{ qrTab === 'wechat' ? '💚' : '💙' }}</span>
              <span class="qr-text">{{ qrTab === 'wechat' ? '微信收款码' : '支付宝收款码' }}</span>
              <span class="qr-hint">把收款码截图放到<br>public/qr-wechat.png<br>public/qr-alipay.png</span>
            </div>
          </div>
        </div>

        <div class="pay-info">
          <div class="pay-amount">
            <span>应付金额</span>
            <strong>{{ activePlan.price }}</strong>
          </div>
          <el-divider />
          <p class="pay-note">
            完成扫码支付后，点击下方按钮提交开通申请。无需订单截图和订单号，管理员核对真实到账后才会开通。
          </p>
          <el-alert v-if="latestRejectedOrder && !pendingOrder" :title="'上次申请已驳回：' + (latestRejectedOrder.rejection_reason || '凭证或到账信息不符')" type="error" :closable="false" show-icon style="margin-top:16px" />
          <el-alert v-if="pendingOrder" title="开通申请已提交，等待管理员确认收款" :description="auditHint" type="info" :closable="false" show-icon style="margin-top:16px" />
          <el-alert v-if="!state.currentUser" title="请先登录，再提交开通申请" type="info" :closable="false" show-icon style="margin-top:16px" />
          <p v-if="state.currentUser && !pendingOrder" class="audit-hint">{{ auditHint }}</p>
          <el-button type="primary" size="large" style="width:100%;margin-top:16px" :loading="submitting" :disabled="!!pendingOrder" @click="submitPayment">
            {{ !state.currentUser ? "登录后提交开通申请" : pendingOrder ? "申请已提交，等待确认" : (isMember ? "提交续费申请" : "我已完成支付，提交开通申请") }}
          </el-button>
          <div v-if="isMember" class="member-done"><el-icon :size="16"><Check /></el-icon><span>PRO 会员有效期至 {{ memberExpiryText }}，续费将在当前到期日后顺延</span></div>
        </div>
      </div>
    </section>

<footer class="up-footer">链算 Pro · 工作日 2 小时内人工核验到账后自动开通 · 如有疑问请联系客服</footer>
  </div>
</template>

<style scoped>
.upgrade-page {
  min-height: 100vh;
  background: radial-gradient(circle at 80% 0, rgba(23,107,91,.08), transparent 35%), #f3f5f9;
}
.dark .upgrade-page { background: radial-gradient(circle at 80% 0, rgba(79,196,168,.08), transparent 35%), #0e1219; }

.up-topbar {
  height: 64px; padding: 0 24px;
  display: flex; align-items: center; justify-content: space-between;
  border-bottom: 1px solid var(--line);
  background: color-mix(in srgb, var(--card) 90%, transparent);
  backdrop-filter: blur(16px); position: sticky; top: 0; z-index: 10;
}
.up-user { font-size: 13px; color: var(--muted); }

.up-hero {
  text-align: center; padding: 60px 24px 40px;
}
.up-hero h1 { font-size: 36px; margin: 0 0 8px; letter-spacing: -.04em; }
.up-hero p { color: var(--muted); font-size: 15px; margin: 0; }

.pricing-grid {
  display: grid; grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20px; max-width: 700px; margin: 0 auto; padding: 0 24px;
}

.pricing-card {
  position: relative;
  background: var(--card); border: 2px solid var(--line);
  border-radius: 18px; padding: 32px 24px;
  cursor: pointer; transition: all .25s;
}
.pricing-card:hover { border-color: var(--brand); transform: translateY(-2px); }
.pricing-card.active {
  border-color: var(--brand);
  background: color-mix(in srgb, var(--brand-soft) 60%, var(--card));
}

.plan-tag {
  position: absolute; top: -1px; right: 20px;
  background: var(--brand); color: white;
  font-size: 11px; font-weight: 700; padding: 4px 12px;
  border-radius: 0 0 8px 8px;
}

.plan-price { font-size: 38px; font-weight: 800; letter-spacing: -.03em; }
.plan-price small { font-size: 16px; color: var(--muted); font-weight: 400; }
.pricing-card h3 { font-size: 18px; margin: 12px 0 4px; }
.plan-desc { color: var(--muted); font-size: 13px; margin: 0 0 16px; }

.plan-features { list-style: none; padding: 0; margin: 0; }
.plan-features li {
  display: flex; align-items: center; gap: 8px;
  padding: 7px 0; font-size: 14px; color: var(--muted);
}
.plan-features li .el-icon { color: var(--brand); flex-shrink: 0; }

.pay-section { max-width: 700px; margin: 48px auto 0; padding: 0 24px 64px; }
.pay-section h2 { font-size: 22px; margin: 0 0 16px; }

.pay-tabs { display: flex; gap: 8px; margin-bottom: 20px; }
.pay-tabs button {
  padding: 10px 24px; border: 1px solid var(--line);
  background: var(--card); color: var(--muted);
  border-radius: 10px; cursor: pointer; font-size: 14px;
  transition: all .2s;
}
.pay-tabs button.active {
  color: var(--brand); border-color: var(--brand);
  background: var(--brand-soft); font-weight: 600;
}

.pay-card {
  background: var(--card); border: 1px solid var(--line);
  border-radius: 18px; padding: 32px;
  display: grid; grid-template-columns: 1fr 1fr; gap: 32px;
}

.pay-qr-area {
  display: grid; place-items: center;
  min-height: 240px;
}

.qr-placeholder {
  display: flex; flex-direction: column; align-items: center; gap: 10px;
  width: 200px; height: 200px;
  border: 2px dashed var(--line); border-radius: 16px;
  justify-content: center; color: var(--muted);
}
.qr-icon { font-size: 48px; }
.qr-text { font-size: 14px; font-weight: 600; }
.qr-hint { font-size: 11px; text-align: center; line-height: 1.6; }

.pay-info { display: flex; flex-direction: column; justify-content: center; }

.pay-amount {
  display: flex; align-items: center; gap: 12px; padding: 12px 0;
}
.pay-amount span { color: var(--muted); font-size: 14px; }
.pay-amount strong { font-size: 36px; color: var(--brand); }

.pay-note { font-size: 13px; color: var(--muted); line-height: 1.7; margin: 0; }
.audit-hint { margin: 16px 0 0; color: var(--muted); font-size: 13px; line-height: 1.7; }
.member-done {
  display: flex; align-items: center; gap: 8px;
  margin-top: 16px; padding: 14px 16px;
  background: var(--brand-soft); border: 1px solid var(--brand);
  border-radius: 12px; color: var(--brand); font-weight: 600; font-size: 14px;
}

.qr-wrapper {
  position: relative; width: 200px; height: 200px;
}
.qr-img {
  position: absolute; inset: 0;
  width: 100%; height: 100%;
  object-fit: contain; border-radius: 16px;
  z-index: 2;
}
.qr-placeholder { z-index: 1; }

.up-footer { text-align: center; padding: 24px; color: var(--muted); font-size: 12px; }

@media (max-width: 768px) {
  .pricing-grid { grid-template-columns: 1fr; }
  .pay-card { grid-template-columns: 1fr; }
  .up-hero h1 { font-size: 28px; }
}
</style>
