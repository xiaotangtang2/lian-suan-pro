<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeft, Check, CopyDocument } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { supabase } from '../lib/supabase.js'
import { useAuth } from '../stores/auth.js'

const router = useRouter()
const { state, isMember, refreshMembership } = useAuth()

const selectedPlan = ref('year')
const plans = [
  { id: 'month', name: '月度会员', price: '¥29', period: '/月', desc: '适合短期项目使用', features: ['全部 8 个计算模块', 'Excel 批量导出', '公式模板库'] },
  { id: 'quarter', name: '季度会员', price: '¥69', period: '/季', desc: '折合 ¥23/月 · 热门选择', features: ['全部月度功能', '优先客服响应', '月度数据报告'], tag: '推荐' },
  { id: 'year', name: '年度会员', price: '¥199', period: '/年', desc: '折合 ¥16.6/月 · 最划算', features: ['全部季度功能', '专属功能内测', '一对一技术支持'] },
]
const activePlan = computed(() => plans.find(p => p.id === selectedPlan.value))

const qrTab = ref('wechat')
const orderNo = ref('LC' + Date.now().toString(36).toUpperCase())

const pendingOrder = ref(null)
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
  const pending = (data || []).find(o => o.status === 'pending')
  if (pending) pendingOrder.value = pending
}

function copyOrderId() {
  navigator.clipboard.writeText(orderNo.value)
  ElMessage.success('订单号已复制')
}

async function submitPayment() {
  if (!state.currentUser?.id) { ElMessage.warning('请先登录'); return }
  if (pendingOrder.value) { ElMessage.warning('已有待开通订单，请等待管理员确认'); return }
  submitting.value = true
  try {
    const { data, error } = await supabase
      .from('membership_orders')
      .insert({
        user_id: state.currentUser.id,
        email: state.currentUser.email,
        order_no: orderNo.value,
        plan_id: activePlan.value.id,
        plan_name: activePlan.value.name,
        amount: Number(activePlan.value.price.replace('¥', '')),
        pay_method: qrTab.value,
        status: 'pending',
      })
      .select()
      .single()
    if (error) throw error
    pendingOrder.value = data
    notifyAdmin(data)
    ElMessage.success('开通申请已提交，管理员确认后会自动解锁')
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
      <el-button :icon="ArrowLeft" text @click="router.push('/')">返回工作台</el-button>
<span class="up-user">{{ state.currentUser?.email || state.currentUser?.phone || '已登录用户' }}</span><el-tag v-if="isMember" type="warning" effect="plain" style="margin-left:8px">PRO 会员</el-tag>
    </header>

    <section class="up-hero">
      <h1>升级 PRO 会员</h1>
      <p>解锁全部 8 个商业计算模块，效率翻倍</p>
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
          <li v-for="f in plan.features" :key="f">
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
              @error="(e) => e.target.style.display = 'none'"
            />
            <!-- 图片没放时的占位提示 -->
            <div class="qr-placeholder">
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
          <div class="pay-order">
            <span>订单号</span>
            <code>{{ orderNo }}</code>
            <el-button :icon="CopyDocument" text size="small" @click="copyOrderId">复制</el-button>
          </div>
          <el-divider />
          <p class="pay-note">
            付款时请在<strong>备注里填写订单号</strong>，付款后点下方按钮提交开通申请，管理员确认后会自动解锁。
          </p>
          <el-alert v-if="pendingOrder" :title="'订单 ' + pendingOrder.order_no + ' 已提交，等待管理员确认收款'" type="info" :closable="false" show-icon style="margin-top:16px" />
          <el-button v-if="!isMember" type="primary" size="large" style="width:100%;margin-top:16px" :loading="submitting" :disabled="!!pendingOrder" @click="submitPayment">
            {{ pendingOrder ? "开通申请已提交，等待确认" : "我已付款，申请开通" }}
          </el-button>
          <div v-else class="member-done"><el-icon :size="16"><Check /></el-icon> 已是 PRO 会员，全部功能已解锁</div>
        </div>
      </div>
    </section>

<footer class="up-footer">链算 Pro · 会员由管理员确认收款后自动开通 · 如有疑问请联系客服</footer>
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
  display: grid; grid-template-columns: repeat(3, 1fr);
  gap: 20px; max-width: 960px; margin: 0 auto; padding: 0 24px;
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

.pay-amount, .pay-order {
  display: flex; align-items: center; gap: 12px; padding: 12px 0;
}
.pay-amount span, .pay-order span { color: var(--muted); font-size: 14px; }
.pay-amount strong { font-size: 36px; color: var(--brand); }
.pay-order code { font-size: 14px; background: var(--brand-soft); padding: 4px 10px; border-radius: 6px; }

.pay-note { font-size: 13px; color: var(--muted); line-height: 1.7; margin: 0; }
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
