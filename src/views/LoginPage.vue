<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '../stores/auth.js'
import { User, Lock, Loading } from '@element-plus/icons-vue'

const router = useRouter()
const { login } = useAuth()

const form = reactive({ email: '', password: '' })
const error = ref('')
const loading = ref(false)

async function onSubmit() {
  error.value = ''
  if (!form.email || !form.password) { error.value = '请填写完整信息'; return }
  loading.value = true
  // tiny delay so the loading spinner is visible
  await new Promise(r => setTimeout(r, 400))
  const result = await login(form.email.trim(), form.password)
  loading.value = false
  if (!result.ok) { error.value = result.error; return }
  router.replace('/')
}
</script>

<template>
  <div class="auth-page">
    <div class="auth-card">
      <div class="auth-header">
        <div class="brand-mark-large">链</div>
        <h1>链算 Pro</h1>
        <p>登录你的账号，解锁全部商业计算工具</p>
      </div>

      <el-form label-position="top" @submit.prevent="onSubmit">
        <el-form-item label="邮箱">
          <el-input
            v-model="form.email"
            placeholder="your@email.com"
            :prefix-icon="User"
            size="large"
            clearable
          />
        </el-form-item>
        <el-form-item label="密码">
          <el-input
            v-model="form.password"
            type="password"
            placeholder="输入密码"
            :prefix-icon="Lock"
            size="large"
            show-password
            @keyup.enter="onSubmit"
          />
        </el-form-item>

        <el-alert v-if="error" :title="error" type="error" show-icon :closable="false" style="margin-bottom:16px" />

        <el-button type="primary" size="large" :loading="loading" class="auth-btn" @click="onSubmit">
          {{ loading ? '登录中...' : '登 录' }}
        </el-button>

        <p class="auth-switch">
          还没有账号？<router-link to="/register">立即注册</router-link>
        </p>
      </el-form>
    </div>
  </div>
</template>

<style scoped>
.auth-page {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 24px;
  background: radial-gradient(circle at 80% 0, rgba(23,107,91,.1), transparent 35%), #f3f5f9;
}
.dark .auth-page { background: radial-gradient(circle at 80% 0, rgba(79,196,168,.08), transparent 35%), #0e1219; }

.auth-card {
  width: 100%;
  max-width: 400px;
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: 20px;
  padding: 40px 36px;
  box-shadow: var(--shadow);
}

.auth-header {
  text-align: center;
  margin-bottom: 32px;
}
.brand-mark-large {
  width: 56px; height: 56px;
  border-radius: 14px;
  background: var(--brand);
  color: white;
  display: grid;
  place-items: center;
  font-weight: 800;
  font-size: 24px;
  margin: 0 auto 14px;
}
.auth-header h1 { font-size: 28px; margin: 0 0 6px; letter-spacing: -.03em; }
.auth-header p { color: var(--muted); font-size: 13px; margin: 0; }

.auth-btn { width: 100%; height: 46px; font-size: 16px; }

.auth-switch { text-align: center; margin-top: 20px; font-size: 13px; color: var(--muted); }
.auth-switch a { color: var(--brand); text-decoration: none; font-weight: 600; }
.auth-switch a:hover { text-decoration: underline; }
</style>