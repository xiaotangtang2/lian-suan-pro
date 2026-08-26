import { reactive, computed } from 'vue'
import { supabase } from '../lib/supabase.js'

const state = reactive({
  currentUser: null,
  loading: true,
})

function buildCurrentUser(user, profile) {
  return {
    id: user.id,
    email: user.email ?? null,
    username: profile?.username ?? null,
    is_member: profile?.is_member ?? false,
    is_admin: profile?.is_admin ?? false,
    member_expires_at: profile?.member_expires_at ?? null,
  }
}

async function fetchProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle()
  if (error) return null
  return data
}

export function useAuth() {
  const isLoggedIn = computed(() => !!state.currentUser)
  const isMember = computed(() => !!state.currentUser?.is_member && (!state.currentUser.member_expires_at || new Date(state.currentUser.member_expires_at) > new Date()))
  const isAdmin = computed(() => !!state.currentUser?.is_admin)
  const isLoading = computed(() => state.loading)

  /** 重新拉取当前用户的会员/管理员状态 */
  async function refreshMembership() {
    if (!state.currentUser) return false
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return false
      const profile = await fetchProfile(user.id)
      if (profile) {
        state.currentUser = buildCurrentUser(user, profile)
        return !!profile.is_member
      }
      return false
    } catch {
      return false
    }
  }

  /** 启动时恢复 Supabase 会话 */
  async function restoreSession() {
    state.loading = true
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { state.loading = false; return false }

      // 拉取该用户的 profiles 记录
      let profile = await fetchProfile(session.user.id)
      if (!profile) {
        const { data: created } = await supabase
          .from('profiles')
          .insert({ id: session.user.id, email: session.user.email, is_member: false })
          .select()
          .single()
        profile = created ?? null
      }
      state.currentUser = buildCurrentUser(session.user, profile)
      return true
    } catch {
      return false
    } finally {
      state.loading = false
    }
  }

  /** 邮箱 + 密码登录 */
  async function login(email, password) {
    const value = (email || '').trim()
    try {
      // 先尝试真实登录，被拒绝后再区分未注册和密码错误
      let preRegistered = null
      try {
        const { data } = await supabase.rpc('check_email_registered', { p_email: value })
        preRegistered = data
      } catch { /* 查询失败时按默认逻辑处理 */ }

      const { error } = await supabase.auth.signInWithPassword({ email: value, password })
      if (error) {
        if (error.message.includes('Invalid login')) {
          return {
            ok: false,
            error: preRegistered === false ? '该邮箱未注册，请先注册' : '邮箱或密码错误',
          }
        }
        const msg = error.message.includes('Email not confirmed')
          ? '邮箱还未确认，请先到邮箱点击确认链接，确认后再登录'
          : error.message
        return { ok: false, error: msg }
      }

      // 登录成功后拉取 profile
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) {
        return { ok: false, error: '登录成功但获取用户信息失败，请刷新重试' }
      }
      const profile = await fetchProfile(user.id)
      state.currentUser = buildCurrentUser(user, profile)
      return { ok: true }
    } catch {
      return { ok: false, error: '网络异常，请稍后重试' }
    }
  }

  /** 注册 */
  async function register(email, password) {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      })
      if (error) {
        const msg = error.message.includes('already')
          ? '该邮箱已注册'
          : error.message.includes('Email not confirmed')
            ? '该邮箱已注册但还未确认，请先到邮箱点击确认链接，或换一个邮箱'
            : error.message.toLowerCase().includes('rate limit')
              ? '注册请求太频繁（同一网络短时间注册太多），请稍等一段时间再试'
              : error.message
        return { ok: false, error: msg }
      }

      if (!data.user) {
        return { ok: false, error: '注册失败，请稍后重试' }
      }

      // Supabase 对已存在的邮箱不报错，但返回空 identities，此时视为已注册
      if (!data.user.identities || data.user.identities.length === 0) {
        return { ok: false, error: '该邮箱已注册，请直接登录' }
      }

      // 邮箱确认开启时没有 session，先清掉当前登录态，等用户确认后再进站
      if (!data.session) {
        await supabase.auth.signOut()
        state.currentUser = null
        return { ok: true, needConfirm: true, email }
      }

      // 有登录会话时，确保 profile 已创建
      let profile = await fetchProfile(data.user.id)
      if (!profile) {
        const { error: profileError } = await supabase.from('profiles').insert({
          id: data.user.id,
          email,
          is_member: false,
        })
        if (profileError) {
          profile = await fetchProfile(data.user.id)
          if (!profile) return { ok: false, error: '账号创建失败：' + profileError.message }
        } else {
          profile = { id: data.user.id, email, username: null, is_member: false, is_admin: false, member_expires_at: null }
        }
      }

      if (profile) {
        state.currentUser = {
          id: data.user.id,
          email: profile.email || email,
          username: profile.username ?? null,
          is_member: profile.is_member ?? false,
          is_admin: profile.is_admin ?? false,
          member_expires_at: profile.member_expires_at ?? null,
        }
      }
      return { ok: true }
    } catch {
      return { ok: false, error: '网络异常，请稍后重试' }
    }
  }

  /** 登出 */
  async function logout() {
    try {
      await supabase.auth.signOut()
    } catch {
      // 网络失败也清掉本地登录态，避免界面卡在已登录
    } finally {
      state.currentUser = null
    }
  }

  return {
    state,
    isLoading,
    isLoggedIn,
    isMember,
    isAdmin,
    restoreSession,
    refreshMembership,
    login,
    register,
    logout,
  }
}
