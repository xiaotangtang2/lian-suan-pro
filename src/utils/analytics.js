import { supabase } from '../lib/supabase.js'
const visitorKey = 'lc-visitor-id'
function visitorId() { let id = localStorage.getItem(visitorKey); if (!id) { id = crypto.randomUUID(); localStorage.setItem(visitorKey, id) }; return id }
// 只记录页面与操作，不采集计算内容或付款凭证。
export async function trackEvent(eventName, properties = {}) { try { const { data: { user } } = await supabase.auth.getUser(); await supabase.from('analytics_events').insert({ visitor_id: visitorId(), user_id: user?.id ?? null, event_name: eventName, properties }) } catch {} }
