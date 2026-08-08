<script setup>
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Promotion } from '@element-plus/icons-vue'
import { supabase } from '../lib/supabase.js'

const text = ref('')
const result = ref('')
const loading = ref(false)
const placeholderExamples = [
  '运费320元，税率6%，包装费18元，利润16%，求最终报价',
  '1000箱货，每箱15kg，运费每公斤8元，求总运费',
  '年收入80万，成本45万，费用12万，求净利润和利润率',
]

async function calculate() {
  if (!text.value.trim()) return
  loading.value = true
  result.value = ''
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { ElMessage.warning('请先登录'); return }

    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-proxy`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ prompt: text.value }),
      }
    )
    const data = await res.json()
    if (data.error) { ElMessage.error(data.error); return }
    result.value = data.result
  } catch (e) {
    ElMessage.error('请求失败：' + (e.message || '网络错误'))
  } finally {
    loading.value = false
  }
}

function useExample(i) { text.value = placeholderExamples[i] }
</script>

<template>
  <div>
    <div class="section-heading">
      <div>
        <span>08 · AI LAB</span>
        <h2>AI 自然语言计算 <el-tag type="success">GPT-4o-mini</el-tag></h2>
        <p>用自然语言描述你的业务计算问题，AI 自动解析并给出结果。</p>
      </div>
    </div>

    <div class="ai-box">
      <el-input
        v-model="text"
        type="textarea"
        :rows="4"
        placeholder="例如：运费320元，税率6%，包装费18元，利润16%，求最终报价"
      />

      <div class="ai-examples">
        <span class="ai-examples-label">试试这些：</span>
        <el-tag
          v-for="(ex, i) in placeholderExamples"
          :key="i"
          class="ai-example-tag"
          @click="useExample(i)"
        >
          {{ ex.length > 30 ? ex.slice(0, 30) + '...' : ex }}
        </el-tag>
      </div>

      <el-button type="primary" size="large" :loading="loading" :icon="Promotion" @click="calculate">
        {{ loading ? 'AI 计算中...' : '开始计算' }}
      </el-button>

      <div v-if="result" class="ai-result">
        <div class="ai-result-label">AI 计算结果</div>
        <div class="ai-result-content">{{ result }}</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ai-box {
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-width: 700px;
}
.ai-examples {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}
.ai-examples-label {
  font-size: 12px;
  color: var(--muted);
}
.ai-example-tag {
  cursor: pointer;
  transition: all .2s;
}
.ai-example-tag:hover {
  opacity: .75;
}

.ai-result {
  background: color-mix(in srgb, var(--brand-soft) 60%, var(--card));
  border: 1px solid var(--brand);
  border-radius: 14px;
  padding: 20px;
  margin-top: 8px;
}
.ai-result-label {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: .12em;
  color: var(--brand);
  margin-bottom: 10px;
  text-transform: uppercase;
}
.ai-result-content {
  font-size: 15px;
  line-height: 1.8;
  white-space: pre-wrap;
  color: var(--card-text, inherit);
}
</style>