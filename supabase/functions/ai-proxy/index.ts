import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' },
  })
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

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

  const apiKey = Deno.env.get('DEEPSEEK_API_KEY') || Deno.env.get('OPENAI_API_KEY')
  if (!apiKey) return json({ error: 'AI 服务未配置：请设置 DEEPSEEK_API_KEY' }, 500)

  const baseUrl = (Deno.env.get('DEEPSEEK_BASE_URL') || Deno.env.get('OPENAI_BASE_URL') || 'https://api.deepseek.com').replace(/\/+$/, '')
  const model = Deno.env.get('DEEPSEEK_MODEL') || Deno.env.get('AI_MODEL') || 'deepseek-chat'

  const aiRes = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0,
      messages: [
        {
          role: 'system',
          content: '你是物流商业计算助手。只做计算，不闲聊；先明确公式，再给出最终数值，并保留必要的计算过程。',
        },
        { role: 'user', content: prompt },
      ],
    }),
  })

  const aiData = await aiRes.json().catch(() => null)
  const result = aiData?.choices?.[0]?.message?.content?.trim()
  if (!aiRes.ok || !result) {
    return json({ error: aiData?.error?.message || 'AI 服务请求失败' }, 502)
  }

  return json({ result, userId: user.id })
})
