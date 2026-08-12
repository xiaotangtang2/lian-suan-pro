<script setup>
import { computed, ref } from 'vue'
import ResultBox from './ResultBox.vue'
import { money } from '../utils/storage'
import { calculateMonthlyIrr } from '../lib/calculations.js'
const form=ref({principal:10000,payment:950,periods:12})
const monthlyIrr=computed(()=>calculateMonthlyIrr(Number(form.value.principal), Number(form.value.payment), Number(form.value.periods)))
const totalRepayment=computed(()=>Number(form.value.payment)*Number(form.value.periods))
const belowPrincipal=computed(()=>Number(form.value.principal)>0 && Number(form.value.payment)>0 && Number(form.value.periods)>=1 && totalRepayment.value < Number(form.value.principal))
const nominal=computed(()=>monthlyIrr.value===null?null:monthlyIrr.value*12*100), effective=computed(()=>monthlyIrr.value===null?null:((1+monthlyIrr.value)**12-1)*100)
</script>
<template><div><div class="section-heading"><div><span>04 · FINANCE</span><h2>真实 IRR 分期计算</h2><p>用现金流反推真实资金成本，别再被“月费率”撩花眼。</p></div></div><div class="two-column compact"><el-form label-position="top" class="form-grid"><el-form-item label="借款本金（元）"><el-input-number v-model="form.principal" :min="1" :precision="2"/></el-form-item><el-form-item label="每期还款（元）"><el-input-number v-model="form.payment" :min="0" :precision="2"/></el-form-item><el-form-item label="还款期数（月）"><el-input-number v-model="form.periods" :min="1" :max="600"/></el-form-item></el-form><div class="result-panel"><ResultBox label="还款总额" :value="`¥ ${money(totalRepayment)}`"/><template v-if="monthlyIrr !== null"><ResultBox label="月度 IRR" :value="`${(monthlyIrr*100).toFixed(4)}%`"/><ResultBox label="名义年利率" :value="`${nominal.toFixed(2)}%`"/><ResultBox label="实际年化利率" :value="`${effective.toFixed(2)}%`" featured/></template><el-alert v-else-if="belowPrincipal" title="还款总额低于本金" description="当前还款总额低于借款本金，不构成有效贷款，无法计算 IRR。" type="warning" :closable="false" show-icon/><el-alert v-else title="当前现金流无法计算 IRR" description="请检查本金、每期还款和期数，确保存在有效的正负现金流。" type="warning" :closable="false" show-icon/><p class="formula-note">实际年化按复利计算：(1 + 月度 IRR)¹² - 1。结果仅供经营决策参考。</p></div></div></div></template>
