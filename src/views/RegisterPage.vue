<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '../stores/auth.js'
import { User, Lock } from '@element-plus/icons-vue'

const router = useRouter()
const { register } = useAuth()

const form = reactive({ email: '', password: '', confirm: '' })
const error = ref('')
const loading = ref(false)

async function onSubmit() {
  error.value = ''
  if (!form.email || !form.password || !form.confirm) { error.value = '请填写完整信息'; return }
  if (form.password.length < 6) { error.value = '密码至少6位'; return }
  if (form.password !== form.confirm) { error.value = '两次密码不一致'; return }
  loading.value = true
  await new Promise(r => setTimeout(r, 400))
  const result = await register(form.email.trim(), form.password)
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
        <h1>创建账号</h1>
        <p>注册后即可免费使用全部计算工具</p>
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
            placeholder="至少6位密码"
            :prefix-icon="Lock"
            size="large"
            show-password
          />
        </el-form-item>
        <el-form-item label="确认密码">
          <el-input
            v-model="form.confirm"
            type="password"
            placeholder="再次输入密码"
            :prefix-icon="Lock"
            size="large"
            show-password
            @keyup.enter="onSubmit"
          />
        </el-form-item>

        <el-alert v-if="error" :title="error" type="error" show-icon :closable="false" style="margin-bottom:16px" />

        <el-button type="primary" size="large" :loading="loading" class="auth-btn" @click="onSubmit">
          {{ loading ? '注册中...' : '注 册' }}
        </el-button>

        <p class="auth-switch">
          已有账号？<router-link to="/login">返回登录</router-link>
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