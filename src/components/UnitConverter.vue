<script setup>
import { computed, ref } from 'vue'
import ResultBox from './ResultBox.vue'
const type=ref('volume'),value=ref(1),from=ref('m3')
const configs={volume:{m3:1,L:.001,cm3:.000001},weight:{kg:1,g:.001,t:1000,lb:.45359237},cargo:{m3:1,cbm:1,'材(台制)':0.003305785}}
const labels={m3:'立方米',L:'升',cm3:'立方厘米',kg:'千克',g:'克',t:'吨',lb:'磅',cbm:'CBM','材(台制)':'材（台制）'}
const results=computed(()=>Object.entries(configs[type.value]).map(([u,f])=>({unit:labels[u]||u,value:value.value*configs[type.value][from.value]/f})))
const formatValue=value=>Number(value.toFixed(8)).toLocaleString('zh-CN',{maximumFractionDigits:8})
const changeType=()=>{from.value=Object.keys(configs[type.value])[0]}
</script>
<template><div><div class="section-heading"><div><span>07 · CONVERTER</span><h2>物流单位换算</h2><p>体积、重量、材积，国际件和本地单都接得住。</p></div></div><div class="two-column compact"><div><el-form label-position="top"><el-form-item label="换算类型"><el-segmented v-model="type" :options="[{label:'体积',value:'volume'},{label:'重量',value:'weight'},{label:'材积',value:'cargo'}]" @change="changeType"/></el-form-item><el-form-item label="输入数值"><el-input-number v-model="value" :min="0" :precision="6"/></el-form-item><el-form-item label="原始单位"><el-select v-model="from"><el-option v-for="(_,u) in configs[type]" :key="u" :label="labels[u]||u" :value="u"/></el-select></el-form-item></el-form></div><div class="result-panel"><ResultBox v-for="r in results" :key="r.unit" :label="r.unit" :value="formatValue(r.value)"/></div></div></div></template>
