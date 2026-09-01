import { supabase } from '../lib/supabase.js'

const visitorKey = 'lc-visitor-id'
const visitMarkerPrefix = 'lc-daily-visit'

function visitorId() {
  let id = localStorage.getItem(visitorKey)
  if (!id) {
    id = crypto.randomUUID?.() || `visitor-${Date.now()}-${Math.random().toString(36).slice(2)}`
    localStorage.setItem(visitorKey, id)
  }
  return id
}

/** 与后台统计口径一致：按中国时区判断“当天”。 */
function chinaDayKey() {
  const parts = new Intl.DateTimeFormat('en', {
    timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date())
  const value = Object.fromEntries(parts.filter(item => item.type !== 'literal').map(item => [item.type, item.value]))
  return `${value.year}-${value.month}-${value.day}`
}

// 只记录页面与操作，不采集计算内容或付款凭证。
export async function trackEvent(eventName, properties = {}) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('analytics_events').insert({
      visitor_id: visitorId(), user_id: user?.id ?? null, event_name: eventName, properties,
    })
  } catch {}
}

/**
 * 每个账号或匿名浏览器每天只写一条“到访”记录。
 * 用户当天先匿名浏览、后登录时会补写账号记录；后台会排除该匿名记录，避免重复统计。
 */
export async function trackDailyVisit({ isAdmin = false } = {}) {
  // 管理员浏览、刷新或误切到访客页面都不属于真实访客。
  if (isAdmin) return

  try {
    const { data: { user } } = await supabase.auth.getUser()
    const identity = user?.id ? `account-${user.id}` : `guest-${visitorId()}`
    const markerKey = `${visitMarkerPrefix}-${chinaDayKey()}-${identity}`
    if (localStorage.getItem(markerKey)) return

    const { error } = await supabase.from('analytics_events').insert({
      visitor_id: visitorId(),
      user_id: user?.id ?? null,
      event_name: 'site_visit',
      properties: { source: user ? 'authenticated' : 'anonymous' },
    })
    if (!error) localStorage.setItem(markerKey, '1')
  } catch {
    // 统计不可用不影响用户使用任何计算功能。
  }
}
