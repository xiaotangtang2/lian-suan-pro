import { computed, readonly, ref } from 'vue'
import { supabase } from '../lib/supabase.js'

/**
 * 网站在线人数（Supabase Realtime Presence）。
 *
 * 统计口径：一个正在连接的浏览器标签页算一个在线会话。
 * 不上传账号、邮箱、IP 或访问页面，仅使用随机的 sessionStorage 标识，
 * 因此该指标适合看实时活跃度，不应用作“去重后的真实用户数”。
 */
const onlineCount = ref(0)
const connectionStatus = ref('idle')
let channel = null
let sessionKey = null

function getSessionKey() {
  if (sessionKey) return sessionKey

  const storageKey = 'lian-suan-online-session-id'
  try {
    sessionKey = sessionStorage.getItem(storageKey)
    if (!sessionKey) {
      sessionKey = crypto.randomUUID?.() || `visitor-${Date.now()}-${Math.random().toString(36).slice(2)}`
      sessionStorage.setItem(storageKey, sessionKey)
    }
  } catch {
    // 隐私模式禁用存储时，当前页面仍可正常参与在线统计。
    sessionKey = crypto.randomUUID?.() || `visitor-${Date.now()}-${Math.random().toString(36).slice(2)}`
  }
  return sessionKey
}

function syncPresenceCount() {
  if (!channel) return
  // Presence state 以 key 为单位；同一标签页重复同步不会被重复计数。
  onlineCount.value = Object.keys(channel.presenceState()).length
}

/** 在根组件调用一次，保持全站在线状态。 */
export function startOnlinePresence() {
  if (channel) return

  connectionStatus.value = 'connecting'
  channel = supabase
    .channel('site-online-presence', {
      config: { presence: { key: getSessionKey() } },
    })
    .on('presence', { event: 'sync' }, syncPresenceCount)
    .on('presence', { event: 'join' }, syncPresenceCount)
    .on('presence', { event: 'leave' }, syncPresenceCount)
    .subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        connectionStatus.value = 'connected'
        // 只记录无身份信息的连接时间，管理员页面只读取聚合数量。
        await channel.track({ connected_at: new Date().toISOString() })
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        connectionStatus.value = 'error'
      } else if (status === 'CLOSED') {
        connectionStatus.value = 'idle'
        onlineCount.value = 0
      }
    })
}

/** 页面卸载时主动离开；异常关闭时 Realtime 心跳超时也会自动清理。 */
export async function stopOnlinePresence() {
  if (!channel) return
  const activeChannel = channel
  channel = null
  onlineCount.value = 0
  connectionStatus.value = 'idle'
  await supabase.removeChannel(activeChannel)
}

export function useOnlinePresence() {
  return {
    onlineCount: readonly(onlineCount),
    connectionStatus: readonly(connectionStatus),
    isConnected: computed(() => connectionStatus.value === 'connected'),
    startOnlinePresence,
    stopOnlinePresence,
  }
}
