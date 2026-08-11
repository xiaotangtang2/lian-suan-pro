<script setup>
import { ref, reactive, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '../stores/auth.js'
import { ElMessage } from 'element-plus'
import { User, Lock, Iphone, ChromeFilled, Connection, ChatDotRound } from '@element-plus/icons-vue'

const router = useRouter()
const { login, loginWithAccount, sendPhoneOtp, loginWithPhone, loginWithOAuth } = useAuth()

const mode = ref('email')
const form = reactive({ email: '', password: '' })
const phoneForm = reactive({ phone: '', code: '' })
const accountForm = reactive({ account: '', password: '' })
const error = ref('')
const loading = ref(false)
const sending = ref(false)
const countdown = ref(0)
let countdownTimer = null

function normalizePhone(value) {
  const digits = value.replace(/\D/g, '')
  return digits.startsWith('86') ? '+' + digits : '+86' + digits
}

function startCountdown() {
  countdown.value = 60
  countdownTimer = setInterval(() => {
    countdown.value -= 1
    if (countdown.value <= 0) clearInterval(countdownTimer)
  }, 1000)
}

onBeforeUnmount(() => {
  if (countdownTimer) clearInterval(countdownTimer)
})

async function onEmailSubmit() {
  error.value = ''
  if (!form.email.trim() || !form.password) { error.value = '请填写完整信息'; return }
  loading.value = true
  await new Promise(r => setTimeout(r, 400))
  const result = await login(form.email.trim(), form.password)
  loading.value = false
  if (!result.ok) { error.value = result.error; return }
  router.replace('/')
}

async function onAccountSubmit() {
  error.value = ''
  if (!accountForm.account.trim() || !accountForm.password) { error.value = '请填写账号和密码'; return }
  loading.value = true
  await new Promise(r => setTimeout(r, 400))
  const result = await loginWithAccount(accountForm.account.trim(), accountForm.password)
  loading.value = false
  if (!result.ok) { error.value = result.error; return }
  router.replace('/')
}

async function sendCode() {
  error.value = ''
  if (!/^1\d{10}$/.test(phoneForm.phone)) { error.value = '请输入正确的11位手机号'; return }
  sending.value = true
  const result = await sendPhoneOtp(normalizePhone(phoneForm.phone))
  sending.value = false
  if (!result.ok) { error.value = result.error; return }
  ElMessage.success('验证码已发送')
  startCountdown()
}

async function onPhoneSubmit() {
  error.value = ''
  if (!/^1\d{10}$/.test(phoneForm.phone) || !phoneForm.code) {
    error.value = '请填写手机号和验证码'
    return
  }
  loading.value = true
  const result = await loginWithPhone(normalizePhone(phoneForm.phone), phoneForm.code.trim())
  loading.value = false
  if (!result.ok) { error.value = result.error; return }
  router.replace('/')
}

async function onOAuth(provider, label) {
  error.value = ''
  const result = await loginWithOAuth(provider)
  if (!result.ok) {
    error.value = `${label} 登录还没在后台开启：${result.error}`
  }
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

      <div class="login-tabs">
        <button :class="{ active: mode === 'email' }" @click="mode = 'email'">邮箱登录</button>
        <button :class="{ active: mode === 'account' }" @click="mode = 'account'">账号登录</button>
        <button :class="{ active: mode === 'phone' }" @click="mode = 'phone'">手机号登录</button>
      </div>

      <el-form v-if="mode === 'email'" label-position="top" @submit.prevent="onEmailSubmit">
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
            @keyup.enter="onEmailSubmit"
          />
        </el-form-item>

        <el-alert v-if="error && mode === 'email'" :title="error" type="error" show-icon :closable="false" style="margin-bottom:16px" />

        <el-button type="primary" size="large" :loading="loading" class="auth-btn" @click="onEmailSubmit">
          {{ loading ? '登录中...' : '登 录' }}
        </el-button>
      </el-form>

      <el-form v-else-if="mode === 'account'" label-position="top" @submit.prevent="onAccountSubmit">
        <el-form-item label="账号名 / 邮箱">
          <el-input
            v-model="accountForm.account"
            placeholder="输入账号名或邮箱"
            :prefix-icon="User"
            size="large"
            clearable
          />
        </el-form-item>
        <el-form-item label="密码">
          <el-input
            v-model="accountForm.password"
            type="password"
            placeholder="输入密码"
            :prefix-icon="Lock"
            size="large"
            show-password
            @keyup.enter="onAccountSubmit"
          />
        </el-form-item>

        <el-alert v-if="error && mode === 'account'" :title="error" type="error" show-icon :closable="false" style="margin-bottom:16px" />

        <el-button type="primary" size="large" :loading="loading" class="auth-btn" @click="onAccountSubmit">
          {{ loading ? '登录中...' : '账号登录' }}
        </el-button>
      </el-form>
      <el-form v-else label-position="top" @submit.prevent="onPhoneSubmit">
        <el-form-item label="手机号">
          <el-input
            v-model="phoneForm.phone"
            placeholder="请输入11位手机号"
            :prefix-icon="Iphone"
            size="large"
            maxlength="11"
            clearable
          />
        </el-form-item>
        <el-form-item label="验证码">
          <div class="code-row">
            <el-input
              v-model="phoneForm.code"
              placeholder="输入6位验证码"
              :prefix-icon="ChatDotRound"
              size="large"
              maxlength="6"
              @keyup.enter="onPhoneSubmit"
            />
            <el-button size="large" :loading="sending" :disabled="countdown > 0" @click="sendCode">
              {{ countdown > 0 ? countdown + 's' : '发送验证码' }}
            </el-button>
          </div>
        </el-form-item>

        <el-alert v-if="error && mode === 'phone'" :title="error" type="error" show-icon :closable="false" style="margin-bottom:16px" />

        <el-button type="primary" size="large" :loading="loading" class="auth-btn" @click="onPhoneSubmit">
          {{ loading ? '登录中...' : '手机号登录' }}
        </el-button>
      </el-form>

      <div class="oauth-divider"><span>其他登录方式</span></div>

      <div class="oauth-row">
        <button class="oauth-btn google" @click="onOAuth('google', 'Google')">
          <el-icon :size="18"><ChromeFilled /></el-icon>Google
        </button>
        <button class="oauth-btn github" @click="onOAuth('github', 'GitHub')">
          <el-icon :size="18"><Connection /></el-icon>GitHub
        </button>
      </div>

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
  background: radial-gradient(circle at 80% 0, rgba(23,107,91,.1), transparent 35%), #f3f5f9;
}
.dark .auth-page { background: radial-gradient(circle at 80% 0, rgba(79,196,168,.08), transparent 35%), #0e1219; }

.auth-card {
  width: 100%;
  max-width: 420px;
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: 20px;
  padding: 36px;
  box-shadow: var(--shadow);
}

.auth-header {
  text-align: center;
  margin-bottom: 24px;
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

.login-tabs {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 6px;
  background: var(--brand-soft);
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 5px;
  margin-bottom: 22px;
}
.login-tabs button {
  border: 0;
  background: transparent;
  color: var(--muted);
  padding: 9px 0;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  transition: all .2s;
}
.login-tabs button.active {
  background: var(--card);
  color: var(--brand);
  font-weight: 700;
  box-shadow: 0 2px 10px rgba(25,36,55,.06);
}

.auth-btn { width: 100%; height: 46px; font-size: 16px; }

.code-row { display: flex; gap: 10px; width: 100%; }
.code-row .el-input { flex: 1; }
.code-row .el-button { width: 118px; flex-shrink: 0; }

.oauth-divider {
  display: flex; align-items: center; gap: 12px;
  margin: 24px 0 14px; color: var(--muted); font-size: 12px;
}
.oauth-divider::before,
.oauth-divider::after {
  content: ""; flex: 1; height: 1px; background: var(--line);
}

.oauth-row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.oauth-btn {
  display: flex; align-items: center; justify-content: center; gap: 8px;
  height: 42px; border: 1px solid var(--line);
  background: var(--card); border-radius: 10px;
  cursor: pointer; font-size: 14px; color: var(--card-text, inherit);
  transition: all .2s;
}
.oauth-btn:hover { border-color: var(--brand); color: var(--brand); }
.oauth-btn .el-icon { color: currentColor; }

.auth-switch { text-align: center; margin-top: 20px; font-size: 13px; color: var(--muted); }
.auth-switch a { color: var(--brand); text-decoration: none; font-weight: 600; }
.auth-switch a:hover { text-decoration: underline; }
</style>
