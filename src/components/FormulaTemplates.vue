<script setup>
import { computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { loadLocal, saveLocal } from '../utils/storage'
const props=defineProps({isMember:Boolean}); const emit=defineEmits([])
const router=useRouter()
const templates=ref(loadLocal('lc-formulas',[{name:'含税报价',formula:'(cost + freight) * (1 + tax / 100)',params:'cost,freight,tax'}]))
const current=reactive({name:'',formula:'',params:''}), selected=ref(0), values=reactive({})
const params=computed(()=>templates.value[selected.value]?.params.split(',').map(x=>x.trim()).filter(Boolean)||[])
const result=computed(()=>{try{const t=templates.value[selected.value];if(!t)return '—';if(!/^[\w\d+\-*/().\s]+$/.test(t.formula))return '公式非法';return Function(...params.value,`"use strict";return (${t.formula})`)(...params.value.map(p=>Number(values[p]||0))).toFixed(4)}catch{return '公式有误'}})
const save=()=>{if(!props.isMember){ElMessage.warning('保存模板为会员功能');return}if(!current.name||!current.formula||!current.params)return ElMessage.warning('请填写完整');templates.value.push({...current});saveLocal('lc-formulas',templates.value);Object.assign(current,{name:'',formula:'',params:''});ElMessage.success('模板已保存')}
</script>
<template><div><div class="section-heading"><div><span>06 · FORMULA</span><h2>自定义公式模板 <el-tag type="warning">PRO</el-tag></h2><p>沉淀你的生意算法，下次填参数就出结果。</p></div></div><div class="two-column"><div><h3>新建模板</h3><el-form label-position="top"><el-form-item label="模板名称"><el-input v-model="current.name" placeholder="例如：含税报价"/></el-form-item><el-form-item label="参数（英文逗号分隔）"><el-input v-model="current.params" placeholder="cost,freight,tax"/></el-form-item><el-form-item label="计算公式"><el-input v-model="current.formula" placeholder="(cost + freight) * (1 + tax / 100)"/></el-form-item><el-button type="primary" :disabled="!isMember" @click="save">保存模板</el-button><el-button v-if="!isMember" @click="router.push('/upgrade')">升级会员</el-button></el-form></div><div class="result-panel"><el-select v-model="selected" style="width:100%"><el-option v-for="(t,i) in templates" :key="i" :label="t.name" :value="i"/></el-select><el-form label-position="top" class="formula-params"><el-form-item v-for="p in params" :key="p" :label="p"><el-input-number v-model="values[p]"/></el-form-item></el-form><div class="big-result"><span>计算结果</span><strong>{{ result }}</strong></div></div></div></div></template>
