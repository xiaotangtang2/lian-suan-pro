import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const MAX_INPUT_CHARS = 2000
const MAX_OUTPUT_TOKENS = 700
const SYSTEM_PROMPT = '你是物流商业计算助手。只做计算，不闲聊；先明确公式，再给出最终数值，并保留必要的计算过程。'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(data: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' },
  })
}

function characterCount(value: string) {
  return Array.from(value).length
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: '仅支持 POST 请求' }, 405)

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !serviceRoleKey) {
    return json({ error: 'AI 代理未配置：请设置 SUPABASE_URL 和 SUPABASE_SERVICE_ROLE_KEY' }, 500)
  }

  const authorization = req.headers.get('Authorization') || ''
  const token = authorization.replace(/^Bearer\s+/i, '')
  if (!token) return json({ error: '请先登录' }, 401)

  const supabase = createClient(supabaseUrl, serviceRoleKey)
  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) return json({ error: '登录状态无效，请重新登录' }, 401)

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('is_member, member_expires_at')
    .eq('id', user.id)
    .maybeSingle()
  if (profileError) return json({ error: '会员状态查询失败' }, 500)
  if (!profile?.is_member) return json({ error: 'AI 计算为 PRO 会员功能' }, 403)
  if (profile.member_expires_at && new Date(profile.member_expires_at) <= new Date()) {
    return json({ error: 'PRO 会员已过期，请续费后再试' }, 403)
  }

  const payload = await req.json().catch(() => null)
  const prompt = payload?.prompt?.trim()
  if (!prompt) return json({ error: '请输入要计算的内容' }, 400)
  const inputChars = characterCount(prompt)
  if (inputChars > MAX_INPUT_CHARS) {
    return json({ error: `单次输入不能超过 ${MAX_INPUT_CHARS} 个字符，当前为 ${inputChars} 个字符` }, 400)
  }

  // 数据库函数在单个事务里锁定设置行、检查当日次数并创建日志，避免并发绕过额度。
  const { data: reservations, error: reservationError } = await supabase.rpc('reserve_ai_request', {
    p_user_id: user.id,
    p_input_chars: inputChars,
  })
  const reservation = Array.isArray(reservations) ? reservations[0] : reservations
  if (reservationError || !reservation) {
    return json({ error: 'AI 用量校验失败，请稍后重试' }, 500)
  }
  if (!reservation.allowed) {
    return json({
      error: `今日 AI 计算次数已达上限（${reservation.daily_limit} 次），请明天再试`,
      dailyLimit: reservation.daily_limit,
      usedCount: reservation.used_count,
    }, 429)
  }

  const requestId = reservation.request_id as number
  const finishUsage = async (
    status: 'success' | 'failed',
    outputChars = 0,
    inputTokens: number | null = null,
    outputTokens: number | null = null,
    errorCode: string | null = null,
  ) => {
    // 失败记录也要落库，管理员才能看见错误率；日志从不记录 prompt 或结果文本。
    await supabase.rpc('complete_ai_request', {
      p_request_id: requestId,
      p_status: status,
      p_output_chars: outputChars,
      p_input_tokens: inputTokens,
      p_output_tokens: outputTokens,
      p_error_code: errorCode,
    })
  }

  const apiKey = Deno.env.get('DEEPSEEK_API_KEY') || Deno.env.get('OPENAI_API_KEY')
  if (!apiKey) {
    await finishUsage('failed', 0, null, null, 'provider_not_configured')
    return json({ error: 'AI 服务未配置：请设置 DEEPSEEK_API_KEY' }, 500)
  }

  const baseUrl = (Deno.env.get('DEEPSEEK_BASE_URL') || Deno.env.get('OPENAI_BASE_URL') || 'https://api.deepseek.com').replace(/\/+$/, '')
  const model = Deno.env.get('DEEPSEEK_MODEL') || Deno.env.get('AI_MODEL') || 'deepseek-chat'

  let aiRes: Response
  try {
    aiRes = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0,
        max_tokens: MAX_OUTPUT_TOKENS,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: prompt },
        ],
      }),
    })
  } catch {
    await finishUsage('failed', 0, null, null, 'provider_network_error')
    return json({ error: 'AI 服务网络异常，请稍后重试' }, 502)
  }

  const aiData = await aiRes.json().catch(() => null)
  const result = aiData?.choices?.[0]?.message?.content?.trim()
  const inputTokens = Number.isFinite(aiData?.usage?.prompt_tokens) ? aiData.usage.prompt_tokens : null
  const outputTokens = Number.isFinite(aiData?.usage?.completion_tokens) ? aiData.usage.completion_tokens : null
  if (!aiRes.ok || !result) {
    await finishUsage('failed', 0, inputTokens, outputTokens, `provider_${aiRes.status}`)
    return json({ error: aiData?.error?.message || 'AI 服务请求失败' }, 502)
  }

  await finishUsage('success', characterCount(result), inputTokens, outputTokens)
  return json({
    result,
    quota: { dailyLimit: reservation.daily_limit, usedCount: reservation.used_count },
  })
})
