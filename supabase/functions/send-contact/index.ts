import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import nodemailer from 'npm:nodemailer@6.9.13'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const SMTP_HOST = Deno.env.get('SMTP_HOST') || 'smtp.qq.com'
const SMTP_PORT = Number(Deno.env.get('SMTP_PORT') || 465)
const SMTP_USER = Deno.env.get('SMTP_USER') || ''
const SMTP_PASS = Deno.env.get('SMTP_PASS') || ''
const SMTP_TO = Deno.env.get('SMTP_TO') || SMTP_USER

// 简单按 IP 限流，避免表单被刷
const recentSends = new Map()

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' },
  })
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    const now = Date.now()
    const last = recentSends.get(ip) || 0
    if (now - last < 60000) {
      return json({ error: '发送太频繁，请一分钟后再试' }, 429)
    }

    const body = await req.json().catch(() => null)
    const contact = String(body?.contact || '').trim()
    const subject = String(body?.subject || '').trim() || '链算 Pro 用户反馈'
    const content = String(body?.content || '').trim()
    if (!content) return json({ error: '请填写问题描述' }, 400)
    if (!SMTP_USER || !SMTP_PASS) return json({ error: '邮件服务未配置，请先设置 SMTP 环境变量' }, 500)

    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    })

    await transporter.sendMail({
      from: `"链算 Pro 联系表单" <${SMTP_USER}>`,
      to: SMTP_TO,
      replyTo: contact || SMTP_TO,
      subject: `[链算Pro联系] ${subject}`,
      text: `来自网站联系表单：\n\n联系方式：${contact || '未填写'}\n\n问题描述：\n${content}`,
    })

    recentSends.set(ip, now)
    return json({ ok: true })
  } catch (e) {
    return json({ error: '发送失败：' + (e?.message || e) }, 500)
  }
})