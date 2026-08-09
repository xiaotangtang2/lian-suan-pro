<script setup>
import { computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { loadLocal, saveLocal } from '../utils/storage'
const props=defineProps({isMember:Boolean}); const emit=defineEmits([])
const router=useRouter()
const templates=ref(loadLocal('lc-formulas',[{name:'鍚◣鎶ヤ环',formula:'(cost + freight) * (1 + tax / 100)',params:'cost,freight,tax'}]))
const current=reactive({name:'',formula:'',params:''}), selected=ref(0), values=reactive({})
const params=computed(()=>templates.value[selected.value]?.params.split(',').map(x=>x.trim()).filter(Boolean)||[])
const result=computed(()=>{try{const t=templates.value[selected.value];if(!t)return '鈥?;if(!/^[\w\d+\-*/().\s]+$/.test(t.formula))return '鍏紡闈炴硶';return Function(...params.value,`"use strict";return (${t.formula})`)(...params.value.map(p=>Number(values[p]||0))).toFixed(4)}catch{return '鍏紡鏈夎'}})
const save=()=>{if(!props.isMember){ElMessage.warning('淇濆瓨妯℃澘涓轰細鍛樺姛鑳?);return}if(!current.name||!current.formula||!current.params)return ElMessage.warning('璇峰～鍐欏畬鏁?);templates.value.push({...current});saveLocal('lc-formulas',templates.value);Object.assign(current,{name:'',formula:'',params:''});ElMessage.success('妯℃澘宸蹭繚瀛?)}
</script>
<template><div><div class="section-heading"><div><span>06 路 FORMULA</span><h2>鑷畾涔夊叕寮忔ā鏉?<el-tag v-if="!isMember" type="warning">PRO</el-tag></h2><p>娌夋穩浣犵殑鐢熸剰绠楁硶锛屼笅娆″～鍙傛暟灏卞嚭缁撴灉銆?/p></div></div><div class="two-column"><div><h3>鏂板缓妯℃澘</h3><el-form label-position="top"><el-form-item label="妯℃澘鍚嶇О"><el-input v-model="current.name" placeholder="渚嬪锛氬惈绋庢姤浠?/></el-form-item><el-form-item label="鍙傛暟锛堣嫳鏂囬€楀彿鍒嗛殧锛?><el-input v-model="current.params" placeholder="cost,freight,tax"/></el-form-item><el-form-item label="璁＄畻鍏紡"><el-input v-model="current.formula" placeholder="(cost + freight) * (1 + tax / 100)"/></el-form-item><el-button type="primary" :disabled="!isMember" @click="save">淇濆瓨妯℃澘</el-button><el-button v-if="!isMember" @click="router.push('/upgrade')">鍗囩骇浼氬憳</el-button></el-form></div><div class="result-panel"><el-select v-model="selected" style="width:100%"><el-option v-for="(t,i) in templates" :key="i" :label="t.name" :value="i"/></el-select><el-form label-position="top" class="formula-params"><el-form-item v-for="p in params" :key="p" :label="p"><el-input-number v-model="values[p]"/></el-form-item></el-form><div class="big-result"><span>璁＄畻缁撴灉</span><strong>{{ result }}</strong></div></div></div></div></template>
