import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const SENDKEY = Deno.env.get('SENDKEY')
const ADMIN_URL = 'https://lian-suan-pro.pages.dev/admin'

function fmtDate(value) {
  if (!value) return ''
  const d = new Date(value)
  if (isNaN(d.getTime())) return String(value)
  return d.toLocaleString('zh-CN', { hour12: false, timeZone: 'Asia/Shanghai' })
}

function payMethodText(method) {
  if (method === 'wechat') return '微信支付'
  if (method === 'alipay') return '支付宝'
  return method || '未知'
}

async function pushToWechat(title, desp) {
  const url = `https://sctapi.ftqq.com/${SENDKEY}.send`
  const body = new URLSearchParams({ title, desp })
  return fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  if (!SENDKEY) {
    return new Response('SENDKEY not configured', { status: 500, headers: corsHeaders })
  }

  try {
    const payload = await req.json().catch(() => null)
    const order = payload?.order || payload?.record || payload
    if (!order?.order_no) {
      return new Response('missing order_no', { status: 400, headers: corsHeaders })
    }

    const amount = Number(order.amount || 0).toFixed(2)
    const title = `新订单待确认：${order.plan_name || '会员订单'} ¥${amount}`
    const desp = [
      `订单号：${order.order_no}`,
      `套餐：${order.plan_name || '-'}`,
      `金额：¥${amount}`,
      `支付方式：${payMethodText(order.pay_method)}`,
      `用户：${order.email || order.user_id || '-'}`,
      `下单时间：${fmtDate(order.created_at)}`,
      '',
      `请到后台确认收款：${ADMIN_URL}`,
    ].join('\n')

    const res = await pushToWechat(title, desp)
    const text = await res.text()
    return new Response(text, {
      status: res.status,
      headers: { ...corsHeaders, 'Content-Type': 'text/plain; charset=utf-8' },
    })
  } catch (e) {
    return new Response('notify error: ' + (e?.message || e), {
      status: 500,
      headers: corsHeaders,
    })
  }
})