<script setup>
import { reactive } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeft, Message, CopyDocument, Promotion } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

const router = useRouter()
const CONTACT_EMAIL = '2957793882@qq.com'
const form = reactive({ subject: '', content: '' })

function sendMail() {
  if (!form.content.trim()) { ElMessage.warning('请填写问题描述'); return }
  const subject = encodeURIComponent(form.subject.trim() || '链算 Pro 使用问题')
  const body = encodeURIComponent('请描述你遇到的问题：\n\n' + form.content.trim())
  window.location.href = `mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}`
}

async function copyEmail() {
  try {
    await navigator.clipboard.writeText(CONTACT_EMAIL)
    ElMessage.success('邮箱已复制')
  } catch {
    ElMessage.error('复制失败，请手动复制')
  }
}
</script>

<template>
  <div class="contact-page">
    <header class="contact-topbar">
      <el-button :icon="ArrowLeft" text @click="router.push('/')">返回工作台</el-button>
      <span class="contact-brand">链算 Pro · 联系我们</span>
    </header>

    <section class="contact-hero">
      <h1>遇到问题？联系我们</h1>
      <p>使用过程中有任何疑问、建议或反馈，都可以直接发邮件给我们。</p>
    </section>

    <section class="contact-grid">
      <div class="contact-info">
        <div class="contact-icon"><el-icon :size="26"><Message /></el-icon></div>
        <h2>QQ 邮箱联系</h2>
        <p class="contact-email">{{ CONTACT_EMAIL }}</p>
        <div class="contact-actions">
          <el-button type="primary" :icon="Promotion" size="large" @click="sendMail">发送邮件</el-button>
          <el-button :icon="CopyDocument" size="large" @click="copyEmail">复制邮箱</el-button>
        </div>
        <p class="contact-note">收到邮件后一般会在 1-2 个工作日内回复。</p>
      </div>

      <div class="contact-form-card">
        <h2>快速写信</h2>
        <el-form label-position="top">
          <el-form-item label="主题">
            <el-input v-model="form.subject" placeholder="例如：登录问题 / 会员开通问题" />
          </el-form-item>
          <el-form-item label="问题描述">
            <el-input
              v-model="form.content"
              type="textarea"
              :rows="7"
              placeholder="请尽量描述清楚遇到的问题，例如操作步骤、看到的报错信息、账号邮箱等"
            />
          </el-form-item>
          <el-button type="primary" size="large" :icon="Promotion" style="width:100%" @click="sendMail">
            打开邮箱发送
          </el-button>
        </el-form>
        <p class="form-tip">点击后会用你电脑或手机默认的邮件客户端发送，也可以直接复制邮箱地址手动发送。</p>
      </div>
    </section>
  </div>
</template>

<style scoped>
.contact-page {
  min-height: 100vh;
  background: radial-gradient(circle at 80% 0, rgba(23,107,91,.08), transparent 35%), #f3f5f9;
}
.dark .contact-page { background: radial-gradient(circle at 80% 0, rgba(79,196,168,.08), transparent 35%), #0e1219; }

.contact-topbar {
  height: 64px; padding: 0 24px;
  display: flex; align-items: center; justify-content: space-between;
  border-bottom: 1px solid var(--line);
  background: color-mix(in srgb, var(--card) 90%, transparent);
  backdrop-filter: blur(16px); position: sticky; top: 0; z-index: 10;
}
.contact-brand { font-size: 13px; color: var(--muted); }

.contact-hero { text-align: center; padding: 56px 24px 36px; }
.contact-hero h1 { font-size: 32px; margin: 0 0 8px; letter-spacing: -.03em; }
.contact-hero p { color: var(--muted); font-size: 15px; margin: 0; }

.contact-grid {
  max-width: 900px; margin: 0 auto; padding: 0 24px 64px;
  display: grid; grid-template-columns: 1fr 1.2fr; gap: 20px;
}

.contact-info, .contact-form-card {
  background: var(--card); border: 1px solid var(--line);
  border-radius: 16px; padding: 28px;
}
.contact-info { display: flex; flex-direction: column; }
.contact-icon {
  width: 52px; height: 52px; border-radius: 14px;
  background: var(--brand-soft); color: var(--brand);
  display: grid; place-items: center; margin-bottom: 18px;
}
.contact-info h2, .contact-form-card h2 { margin: 0 0 10px; font-size: 20px; }
.contact-email { font-size: 16px; font-weight: 700; margin: 0 0 20px; word-break: break-all; }
.contact-actions { display: flex; gap: 10px; flex-wrap: wrap; }
.contact-note { margin-top: auto; padding-top: 20px; color: var(--muted); font-size: 13px; }
.form-tip { color: var(--muted); font-size: 12px; margin: 12px 0 0; line-height: 1.7; }

@media (max-width: 700px) {
  .contact-grid { grid-template-columns: 1fr; }
  .contact-hero h1 { font-size: 26px; }
}
</style>