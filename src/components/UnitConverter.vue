<script setup>
import { computed, ref } from 'vue'
import ResultBox from './ResultBox.vue'
import { convertUnits, formatUnitValue, unitConfigs, unitLabels } from '../lib/calculations.js'
const type=ref('volume'),value=ref(1),from=ref('m3')
const results=computed(()=>convertUnits(type.value, value.value, from.value).map(({unit,value})=>({unit:unitLabels[unit]||unit,value})))
const formatValue=formatUnitValue
const changeType=()=>{from.value=Object.keys(unitConfigs[type.value])[0]}
</script>
<template><div><div class="section-heading"><div><span>07 · CONVERTER</span><h2>物流单位换算</h2><p>体积、重量、材积，国际件和本地单都接得住。</p></div></div><div class="two-column compact"><div><el-form label-position="top"><el-form-item label="换算类型"><el-segmented v-model="type" :options="[{label:'体积',value:'volume'},{label:'重量',value:'weight'},{label:'材积',value:'cargo'}]" @change="changeType"/></el-form-item><el-form-item label="输入数值"><el-input-number v-model="value" :min="0" :precision="6"/></el-form-item><el-form-item label="原始单位"><el-select v-model="from"><el-option v-for="(_,u) in unitConfigs[type]" :key="u" :label="unitLabels[u]||u" :value="u"/></el-select></el-form-item></el-form></div><div class="result-panel"><ResultBox v-for="r in results" :key="r.unit" :label="r.unit" :value="formatValue(r.value)"/></div></div></div></template>
