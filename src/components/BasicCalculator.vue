<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { Delete, CopyDocument } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { copyText, loadLocal, saveLocal } from '../utils/storage'

const expression = ref('')
const result = ref('0')
const history = ref(loadLocal('lc-calc-history', []))
const keys = ['C','(',')','⌫','7','8','9','÷','4','5','6','×','1','2','3','−','0','.','%','+']
// 仅允许数字和运算符，再由 Function 计算；用户内容不会接触网络或应用上下文。
const evaluate = raw => {
  let safe = raw.replaceAll('×','*').replaceAll('÷','/').replaceAll('−','-')
  // 加减百分比按常见商业计算器语义处理：100+10%=110；乘除仍按 10%=0.1。
  safe = safe.replace(/(\d+(?:\.\d+)?)([+-])(\d+(?:\.\d+)?)%/g, '($1$2($1*$3/100))')
  safe = safe.replace(/(\d+(?:\.\d+)?)%/g, '($1/100)')
  if (!/^[\d+\-*/().\s]+$/.test(safe)) throw new Error('invalid')
  const value = Function(`"use strict";return (${safe})`)()
  if (!Number.isFinite(value)) throw new Error('invalid')
  return Number(value.toFixed(10))
}
const press = key => {
  if (key === 'C') { expression.value=''; result.value='0' }
  else if (key === '⌫') expression.value = expression.value.slice(0,-1)
  else expression.value += key
}
const calculate = () => { try { const value=evaluate(expression.value); result.value=String(value); history.value.unshift({ expression:expression.value, result:value, time:new Date().toLocaleString() }); history.value=history.value.slice(0,30); saveLocal('lc-calc-history',history.value) } catch { ElMessage.error('表达式格式不正确') } }
const onKey = e => { if (/^[\d.+\-*/()%]$/.test(e.key)) press(e.key); else if(e.key==='Enter') calculate(); else if(e.key==='Backspace') press('⌫'); else if(e.key==='Escape') press('C') }
const display = computed(() => expression.value || '输入算式')
onMounted(()=>window.addEventListener('keydown',onKey)); onUnmounted(()=>window.removeEventListener('keydown',onKey))
</script>
<template><div><div class="section-heading"><div><span>01 · BASIC</span><h2>基础计算器</h2><p>支持键盘、百分比与链式折扣，例如 1000×90%×95%</p></div></div><div class="calculator-layout"><div class="calculator"><div class="calc-screen"><span>{{ display }}</span><strong>{{ result }}</strong></div><div class="keypad"><el-button v-for="key in keys" :key="key" :class="{operator:'÷×−+'.includes(key)}" @click="press(key)"><Delete v-if="key==='⌫'" /> <template v-else>{{ key }}</template></el-button><el-button class="equals" @click="calculate">=</el-button></div></div><aside class="history"><div class="aside-title"><strong>计算历史</strong><el-button text @click="history=[];saveLocal('lc-calc-history',[])">清空</el-button></div><el-empty v-if="!history.length" description="暂无记录" :image-size="72"/><div v-for="(item,i) in history" :key="i" class="history-item"><div><span>{{ item.expression }}</span><strong>= {{ item.result }}</strong></div><el-button text :icon="CopyDocument" @click="copyText(item.result);ElMessage.success('已复制')"/></div></aside></div></div></template>
