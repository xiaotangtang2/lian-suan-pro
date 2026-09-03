<script setup>
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeft, Message, Promotion } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { supabase } from '../lib/supabase.js'

const router = useRouter()
const form = reactive({ contact: '', subject: '', content: '' })
const sending = ref(false)

async function sendMail() {
  if (!form.content.trim()) { ElMessage.warning('请填写问题描述'); return }
  sending.value = true
  try {
    const { data, error } = await supabase.functions.invoke('send-contact', {
      body: {
        contact: form.contact.trim(),
        subject: form.subject.trim(),
        content: form.content.trim(),
      },
    })
    if (error) throw error
    if (data?.error) throw new Error(data.error)
    ElMessage.success('已发送成功，我们会尽快回复你')
    Object.assign(form, { contact: '', subject: '', content: '' })
  } catch (e) {
    ElMessage.error('发送失败：' + (e.message || '请稍后重试'))
  } finally {
    sending.value = false
  }
}
</script>

<template>
  <div class="contact-page">
    <header class="contact-topbar">
      <el-button :icon="ArrowLeft" text @click="router.push('/')">返回首页</el-button>
      <span class="contact-brand">链算 Pro · 联系我们</span>
    </header>

    <section class="contact-hero">
      <h1>遇到问题？联系我们</h1>
      <p>直接在下方填写并发送，我们会收到你的消息并尽快回复。</p>
    </section>

    <section class="contact-panel">
      <div class="contact-tip">
        <div class="contact-icon"><el-icon :size="26"><Message /></el-icon></div>
        <h2>快速反馈</h2>
        <p>不需要知道我们的邮箱，填好内容点发送即可。为了我们能回复你，建议留下你的联系方式。</p>
      </div>

      <div class="contact-form-card">
        <h2>发送反馈</h2>
        <el-form label-position="top">
          <el-form-item label="你的联系方式（选填）">
            <el-input v-model="form.contact" placeholder="QQ / 微信 / 邮箱，方便我们回复你" />
          </el-form-item>
          <el-form-item label="主题（选填）">
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
          <el-button type="primary" size="large" :icon="Promotion" style="width:100%" :loading="sending" @click="sendMail">
            {{ sending ? '发送中...' : '发送反馈' }}
          </el-button>
        </el-form>
      </div>
    </section>
  </div>
</template>

<style scoped>
.contact-page {
  min-height: 100vh;
  background: radial-gradient(circle at 82% 0, rgba(23,105,213,.11), transparent 30%), radial-gradient(circle at 8% 8%, rgba(15,148,136,.07), transparent 24%), var(--surface);
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

.contact-panel {
  max-width: 820px; margin: 0 auto; padding: 0 24px 64px;
  display: grid; grid-template-columns: 1fr 1.3fr; gap: 20px;
}
.contact-tip, .contact-form-card {
  background: var(--card); border: 1px solid var(--line);
  border-radius: 20px; padding: 28px; box-shadow: 0 14px 30px rgba(25,47,89,.055);
}
.contact-tip { display: flex; flex-direction: column; }
.contact-icon {
  width: 52px; height: 52px; border-radius: 14px;
  background: var(--brand-soft); color: var(--brand);
  display: grid; place-items: center; margin-bottom: 18px;
}
.contact-tip h2, .contact-form-card h2 { margin: 0 0 10px; font-size: 20px; }
.contact-tip p { color: var(--muted); font-size: 14px; line-height: 1.8; margin: 0; }

@media (max-width: 700px) {
  .contact-panel { grid-template-columns: 1fr; }
  .contact-hero h1 { font-size: 26px; }
}
</style>
