<script setup>
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import ResultBox from './ResultBox.vue'
const text=ref('运费320，税率6%，包装费18，利润16%，求报价'), result=ref(null), loading=ref(false)
const calculate=async()=>{loading.value=true;try{result.value=await requestAiCalculation(text.value)}catch(e){ElMessage.info(e.message)}finally{loading.value=false}}
// AI 接口预留：上线时将此函数替换为你自己的服务端代理请求，切勿在前端放 API Key。
async function requestAiCalculation(){throw new Error('AI 服务尚未配置，请在 requestAiCalculation 中接入安全的服务端代理')}
</script>
<template><div><div class="section-heading"><div><span>08 · AI LAB</span><h2>AI 自然语言计算 <el-tag>接口预留</el-tag></h2><p>把业务问题直接说出来；当前版本不包含密钥，也不会发送数据。</p></div></div><div class="ai-box"><el-input v-model="text" type="textarea" :rows="5"/><el-button type="primary" :loading="loading" @click="calculate">解析并计算</el-button><ResultBox v-if="result" label="AI 计算结果" :value="result" featured/><el-alert title="安全提示" description="生产环境请通过你自己的后端代理调用 AI 服务，不要将任何 API 密钥写入浏览器代码。" type="info" :closable="false" show-icon/></div></div></template>
