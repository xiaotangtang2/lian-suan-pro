<script setup>
import { ArrowRight, Check, Van, TrendCharts, Timer, Switch, Lock } from '@element-plus/icons-vue'
import { useRouter } from 'vue-router'
import { trackEvent } from '../utils/analytics.js'

const router = useRouter()
const tools = [
  ['logistics-quote', Van, '物流成本报价', '成本、损耗、税费、利润率与阶梯运费一次算清。'],
  ['irr', TrendCharts, '真实 IRR', '看清分期背后的真实年化资金成本。'],
  ['workdays', Timer, '工时工作日', '班次工时、加班与排除周末的工作日统计。'],
  ['unit-converter', Switch, '物流单位换算', '重量、体积、CBM 和材积快捷换算。'],
]
function go(path, event) { trackEvent(event); router.push(path === '/login' ? { path: '/login', query: { entry: 'landing' } } : path) }
function scrollToTools() { trackEvent('free_start_click'); document.querySelector('#free-tools')?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }
</script>

<template>
  <div class="landing">
    <header class="landing-nav">
      <router-link to="/" class="landing-brand"><img src="/favicon.png" alt="链算 Pro" />链算 Pro</router-link>
      <nav aria-label="账户操作"><el-button text @click="go('/login', 'login_click')">登录</el-button><el-button type="primary" @click="scrollToTools">免费开始</el-button></nav>
    </header>
    <main>
      <section class="landing-hero">
        <div class="hero-chip"><span></span> 为物流供应链而生的计算工具</div><p class="eyebrow">LOGISTICS BUSINESS TOOLKIT</p>
        <h1>物流报价算得准，<em>每单利润看得清。</em></h1>
        <p class="landing-lead">把复杂的报价、工时和资金成本，整理成一份清晰、可复用的经营答案。基础功能免费，数据优先保存在你的浏览器。</p>
        <div class="landing-cta"><el-button type="primary" size="large" :icon="ArrowRight" @click="go('/tools/logistics-quote', 'hero_quote_click')">免费试算物流报价</el-button><el-button size="large" @click="go('/register', 'hero_register_click')">创建免费账户</el-button></div>
        <div class="trust-line"><span>无需安装</span><span>本地优先</span><span>手机电脑都能用</span></div>
      </section>
      <section id="free-tools" class="landing-section tools-section">
        <div class="section-heading"><div><p class="eyebrow">常用工具</p><h2>先算一笔，再决定要不要注册。</h2></div><p>用一个简单的结果，替代反复猜测。</p></div>
        <div class="tool-grid"><button v-for="tool in tools" :key="tool[0]" class="tool-preview" @click="go('/tools/' + tool[0], 'tool_preview_click')"><el-icon><component :is="tool[1]" /></el-icon><h3>{{ tool[2] }}</h3><p>{{ tool[3] }}</p><span>立即试算 <ArrowRight /></span></button></div>
      </section>
      <section class="landing-section benefits"><div class="benefits-copy"><p class="eyebrow">PRO 会员</p><h2>算一单免费；批量报价、导出报价单和长期复用，交给 Pro</h2><p class="muted">月度与年度会员功能完全一致；年度会员约省 18%，折合 ¥23.75/月。</p></div><ul><li><Check /> Excel 批量导出</li><li><Check /> 保存自定义公式</li><li><Check /> AI 自然语言计算</li><li><Check /> 工作日 2 小时内人工审核</li></ul><el-button type="primary" @click="go('/upgrade', 'landing_upgrade_click')"><Lock /> 查看会员方案</el-button></section>
      <section class="landing-section faq"><div class="section-heading"><div><p class="eyebrow">常见问题</p><h2>把关键信息说清楚。</h2></div></div><el-collapse><el-collapse-item title="我的计算数据会上传吗？" name="1">基础计算记录、模板和主题偏好优先保存在当前浏览器。AI 计算仅在你主动提交问题时发送到 AI 服务。</el-collapse-item><el-collapse-item title="付款后多久开通？" name="2">完成支付后提交开通申请，管理员会在工作日 2 小时内核对到账；通过后自动开通会员。</el-collapse-item><el-collapse-item title="会员到期后会怎样？" name="3">高级功能会自动重新锁定。提前续费会从当前到期日继续顺延。</el-collapse-item></el-collapse></section>
    </main>
    <footer>链算 Pro · <router-link to="/contact">联系我们</router-link> · <router-link to="/privacy">隐私说明</router-link></footer>
  </div>
</template>

<style scoped>
.landing{min-height:100vh;overflow:hidden;background:radial-gradient(circle at 88% 5%,rgba(15,148,136,.14),transparent 24%),radial-gradient(circle at 10% 10%,rgba(23,105,213,.1),transparent 30%),var(--surface)}.landing-nav{height:76px;max-width:1160px;margin:auto;padding:0 24px;display:flex;align-items:center;justify-content:space-between}.landing-nav nav{display:flex;align-items:center;gap:6px}.landing-brand{display:flex;align-items:center;gap:10px;font-weight:800;color:var(--text);text-decoration:none;font-size:17px}.landing-brand img{width:36px;height:36px;border-radius:11px;box-shadow:0 8px 18px rgba(23,105,213,.18)}
.landing-hero{max-width:920px;margin:auto;padding:84px 24px 88px;text-align:center}.hero-chip{display:inline-flex;gap:8px;align-items:center;border:1px solid #cbdcf7;background:rgba(255,255,255,.78);padding:7px 12px;border-radius:999px;color:#31547e;font-size:13px;font-weight:700}.hero-chip span{width:7px;height:7px;border-radius:50%;background:var(--accent);box-shadow:0 0 0 4px rgba(15,148,136,.12)}.eyebrow{margin:18px 0 10px;color:var(--brand);font-weight:800;font-size:12px;letter-spacing:.14em}.landing-hero h1{margin:0;font-size:clamp(42px,6.5vw,72px);line-height:1.06;letter-spacing:-.065em}.landing-hero em{font-style:normal;color:var(--brand)}.landing-lead{max-width:680px;margin:22px auto 0;color:var(--muted);font-size:17px;line-height:1.85}.landing-cta{display:flex;justify-content:center;gap:12px;margin:30px 0}.trust-line{display:flex;justify-content:center;gap:20px;color:var(--muted);font-size:13px}.trust-line span::before{content:'✓';margin-right:6px;color:var(--accent);font-weight:800}
.landing-section{max-width:1160px;margin:auto;padding:54px 24px}.tools-section{padding-top:38px}.section-heading{display:flex;align-items:end;justify-content:space-between;gap:24px;margin-bottom:24px}.section-heading .eyebrow{margin:0 0 9px}.section-heading h2,.benefits h2{margin:0;font-size:32px;letter-spacing:-.04em}.section-heading>p{max-width:290px;margin:0;color:var(--muted);font-size:14px;line-height:1.7}.tool-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:16px}.tool-preview{position:relative;display:flex;min-height:238px;flex-direction:column;align-items:flex-start;border:1px solid var(--line);border-radius:20px;padding:24px;background:var(--card);box-shadow:0 12px 24px rgba(25,47,89,.035);color:var(--text);text-align:left;cursor:pointer;transition:border-color .2s ease,box-shadow .2s ease,transform .2s ease}.tool-preview:hover{border-color:#a8c5f4;box-shadow:0 18px 34px rgba(25,47,89,.11);transform:translateY(-4px)}.tool-preview .el-icon{display:grid;place-items:center;width:46px;height:46px;border-radius:14px;background:var(--brand-soft);color:var(--brand);font-size:22px}.tool-preview h3{margin:22px 0 8px;font-size:18px}.tool-preview p{margin:0;color:var(--muted);font-size:14px;line-height:1.7}.tool-preview span{display:flex;align-items:center;gap:3px;margin-top:auto;color:var(--brand);font-size:13px;font-weight:800}.tool-preview span :deep(svg){width:16px}
.benefits{display:grid;grid-template-columns:1.15fr .95fr auto;gap:30px;align-items:center;margin-top:30px;padding:38px;border:1px solid #cbdcf7;border-radius:24px;background:linear-gradient(118deg,#eff6ff 0%,#f7fcfb 100%)}.benefits .eyebrow{margin:0 0 10px}.benefits h2{font-size:28px}.muted{margin:12px 0 0;color:var(--muted);font-size:14px;line-height:1.7}.benefits ul{display:grid;grid-template-columns:1fr 1fr;gap:11px 16px;list-style:none;margin:0;padding:0}.benefits li{display:flex;align-items:center;gap:7px;font-size:14px;white-space:nowrap}.benefits li :deep(svg){width:16px;color:var(--accent)}
.faq{max-width:940px;padding-top:76px;padding-bottom:72px}.faq :deep(.el-collapse){border-color:var(--line);border-radius:18px;overflow:hidden;background:var(--card);box-shadow:0 12px 26px rgba(25,47,89,.04)}.faq :deep(.el-collapse-item__header){min-height:64px;padding:0 22px;background:var(--card);font-size:15px;font-weight:700}.faq :deep(.el-collapse-item__wrap){padding:0 22px;background:var(--card)}.faq :deep(.el-collapse-item__content){padding-bottom:19px;color:var(--muted);line-height:1.8}footer{text-align:center;padding:34px;color:var(--muted);font-size:13px;border-top:1px solid var(--line)}footer a{color:var(--brand);text-decoration:none;font-weight:700}
@media(max-width:820px){.tool-grid{grid-template-columns:repeat(2,1fr)}.benefits{grid-template-columns:1fr}.benefits ul{max-width:480px}}@media(max-width:600px){.landing-nav{height:68px;padding:0 18px}.landing-brand{font-size:16px}.landing-hero{padding:56px 18px 64px}.landing-hero h1{font-size:42px}.landing-lead{font-size:15px}.landing-cta{flex-direction:column}.landing-cta .el-button{width:100%;margin:0}.trust-line{gap:10px;flex-wrap:wrap;font-size:12px}.landing-section{padding:42px 18px}.section-heading{align-items:flex-start;flex-direction:column;gap:10px}.section-heading h2,.benefits h2{font-size:27px}.tool-grid{grid-template-columns:1fr}.tool-preview{min-height:210px}.benefits{margin:0 18px;padding:28px}.benefits ul{grid-template-columns:1fr}.faq{padding-top:56px}}
</style>
