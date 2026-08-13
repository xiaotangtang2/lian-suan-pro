<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft, Lock } from '@element-plus/icons-vue'
import LogisticsCalculator from '../components/LogisticsCalculator.vue'
import IrrCalculator from '../components/IrrCalculator.vue'
import WorkdayCalculator from '../components/WorkdayCalculator.vue'
import UnitConverter from '../components/UnitConverter.vue'
import { trackEvent } from '../utils/analytics.js'
const route=useRoute(),router=useRouter()
const data={'logistics-quote':['物流成本报价计算器','输入采购、运费、损耗、税率与目标利润，得到可执行的建议报价。',LogisticsCalculator],irr:['真实 IRR 分期计算器','用真实现金流计算月度 IRR、名义年利率与实际年化利率。',IrrCalculator],workdays:['工时与工作日计算器','计算实际工作时长、加班时长以及排除周末后的工作日。',WorkdayCalculator],'unit-converter':['物流单位换算','重量、体积、CBM 和材积换算，适配物流日常业务。',UnitConverter]}
const tool=computed(()=>data[route.params.slug]||data['logistics-quote'])
function login(){trackEvent('tool_register_click',{tool:route.params.slug});router.push('/register')}
</script>
<template><div class="public-tool"><header><router-link to="/"><ArrowLeft/> 返回首页</router-link><el-button type="primary" @click="login">登录后保存数据</el-button></header><main><p>免费工具</p><h1>{{ tool[0] }}</h1><div class="tool-desc">{{ tool[1] }}</div><section class="public-tool-card"><component :is="tool[2]"/></section><aside><Lock/> 登录后可保存计算历史、同步会员权益，并解锁高级功能。<el-button link type="primary" @click="login">创建免费账户</el-button></aside></main></div></template>
<style scoped>.public-tool{min-height:100vh;background:#f3f5f9}.dark .public-tool{background:#0e1219}.public-tool header{height:64px;display:flex;align-items:center;justify-content:space-between;padding:0 max(20px,calc((100% - 1120px)/2));background:var(--card);border-bottom:1px solid var(--line)}.public-tool header a{display:flex;align-items:center;gap:5px;text-decoration:none;color:var(--muted)}.public-tool main{max-width:1120px;margin:auto;padding:48px 20px}.public-tool main>p{color:var(--brand);font-weight:700;font-size:12px;letter-spacing:.12em}.public-tool h1{font-size:34px;margin:8px 0}.tool-desc{color:var(--muted);margin-bottom:28px}.public-tool-card{background:var(--card);border:1px solid var(--line);border-radius:18px;padding:28px}.public-tool aside{margin-top:16px;display:flex;align-items:center;gap:8px;background:var(--brand-soft);padding:14px;border-radius:12px;color:var(--muted);font-size:13px}@media(max-width:600px){.public-tool main{padding:30px 12px}.public-tool-card{padding:18px 12px}.public-tool aside{align-items:flex-start;flex-wrap:wrap}}</style>
