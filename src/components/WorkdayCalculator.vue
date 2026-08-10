<script setup>
import { computed, ref } from 'vue'
import ResultBox from './ResultBox.vue'
import { calculateWorkHours, countWorkdays } from '../lib/calculations.js'
const work=ref({start:'09:00',end:'18:30',breakMin:60,standard:8})
const dates=ref({start:'2026-08-01',end:'2026-08-31'})
const workResult=computed(()=>calculateWorkHours(work.value))
const dateResult=computed(()=>countWorkdays(dates.value.start, dates.value.end))
</script>
<template><div><div class="section-heading"><div><span>03 · TIME</span><h2>工时与工作日</h2><p>工作时间与日期区间，两本账一次算明白。</p></div></div><div class="split-cards"><section class="inner-card"><h3>工时计算</h3><el-form label-position="top" class="form-grid"><el-form-item label="上班时间"><el-time-select v-model="work.start" start="00:00" step="00:15" end="23:45"/></el-form-item><el-form-item label="下班时间"><el-time-select v-model="work.end" start="00:00" step="00:15" end="23:45"/></el-form-item><el-form-item label="午休（分钟）"><el-input-number v-model="work.breakMin" :min="0"/></el-form-item><el-form-item label="标准工时（小时）"><el-input-number v-model="work.standard" :min="0"/></el-form-item></el-form><div class="result-grid"><ResultBox label="实际工作时长" :value="`${workResult.hours.toFixed(2)} 小时`" featured/><ResultBox label="加班时长" :value="`${workResult.overtime.toFixed(2)} 小时`"/></div></section><section class="inner-card"><h3>工作日计算</h3><el-form label-position="top" class="form-grid"><el-form-item label="开始日期"><el-date-picker v-model="dates.start" type="date" value-format="YYYY-MM-DD"/></el-form-item><el-form-item label="结束日期"><el-date-picker v-model="dates.end" type="date" value-format="YYYY-MM-DD"/></el-form-item></el-form><div class="result-grid"><ResultBox label="自然日总数" :value="`${dateResult.total} 天`"/><ResultBox label="纯工作日" :value="`${dateResult.weekdays} 天`" featured/></div><p class="formula-note">当前规则仅排除周六、周日，不含法定节假日调休。</p></section></div></div></template>
