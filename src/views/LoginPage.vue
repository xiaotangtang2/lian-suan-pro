<script setup>
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '../stores/auth.js'
import { User, Lock } from '@element-plus/icons-vue'

const router = useRouter()
const { login } = useAuth()
const form = reactive({ email: '', password: '' })
const error = ref('')
const loading = ref(false)

async function onSubmit() {
  error.value = ''
  if (!form.email.trim() || !form.password) {
    error.value = '请填写邮箱和密码'
    return
  }

  loading.value = true
  const result = await login(form.email.trim(), form.password)
  loading.value = false
  if (!result.ok) {
    error.value = result.error
    return
  }
  router.replace('/workspace')
}
</script>

<template>
  <div class="auth-page">
    <div class="auth-card">
      <div class="auth-header">
        <div class="brand-mark-large">链</div>
        <h1>链算 Pro</h1>
        <p>使用邮箱登录，继续使用你的商业计算工具</p>
      </div>

      <el-form label-position="top" @submit.prevent="onSubmit">
        <el-form-item label="邮箱">
          <el-input
            v-model="form.email"
            placeholder="your@email.com"
            :prefix-icon="User"
            size="large"
            autocomplete="email"
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
            autocomplete="current-password"
            show-password
            @keyup.enter="onSubmit"
          />
        </el-form-item>

        <el-alert v-if="error" :title="error" type="error" show-icon :closable="false" style="margin-bottom:16px" />

        <el-button type="primary" size="large" :loading="loading" class="auth-btn" @click="onSubmit">
          {{ loading ? '登录中...' : '登 录' }}
        </el-button>
      </el-form>

      <p class="auth-switch">
        还没有账号？<router-link to="/register">立即注册</router-link>
      </p>
    </div>
  </div>
</template>

<style scoped>
.auth-page {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 24px;
  background: radial-gradient(circle at 82% 0, rgba(23,105,213,.12), transparent 31%), radial-gradient(circle at 8% 8%, rgba(15,148,136,.07), transparent 24%), var(--surface);
}
.dark .auth-page { background: radial-gradient(circle at 80% 0, rgba(79,196,168,.08), transparent 35%), #0e1219; }

.auth-card {
  width: 100%;
  max-width: 400px;
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: 22px;
  padding: 40px 36px;
  box-shadow: 0 20px 48px rgba(25,47,89,.12);
}

.auth-header { text-align: center; margin-bottom: 28px; }
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
