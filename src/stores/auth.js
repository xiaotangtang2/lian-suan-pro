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
    phone: user.phone ?? null,
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
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false
    const profile = await fetchProfile(user.id)
    if (profile) {
      state.currentUser = buildCurrentUser(user, profile)
      return !!profile.is_member
    }
    return false
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

  /** 登录 */
  /** 登录 */
  async function login(email, password) {
    const value = (email || '').trim()

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
    const { data: { user } } = await supabase.auth.getUser()
    const profile = await fetchProfile(user.id)
    state.currentUser = buildCurrentUser(user, profile)
    return { ok: true }
  }

  /** 自定义账号名 + 密码登录 */
  async function loginWithAccount(account, password) {
    const value = (account || '').trim()
    if (!value || !password) return { ok: false, error: '请填写账号和密码' }
    // 输入的是邮箱就按邮箱登录，否则先用账号名找邮箱
    if (value.includes('@')) return login(value, password)
    let email = null
    try {
      const { data, error } = await supabase.rpc('find_login_email', { p_account: value })
      if (error) return { ok: false, error: '账号登录还未初始化，请先在 Supabase 执行数据库脚本' }
      email = data
    } catch {
      return { ok: false, error: '账号登录还未初始化，请先在 Supabase 执行数据库脚本' }
    }
    if (!email) return { ok: false, error: '该账号未注册，请先注册' }
    return login(email, password)
  }

  /** 发送手机验证码 */
  async function sendPhoneOtp(phone) {
    const { error } = await supabase.auth.signInWithOtp({ phone })
    if (error) {
      const msg = error.message.toLowerCase().includes('rate limit')
        ? '验证码发送太频繁，请稍后再试'
        : error.message.toLowerCase().includes('unsupported phone provider')
          ? '手机号登录还没在后台开启，请先在 Supabase 配置短信服务'
          : error.message
      return { ok: false, error: msg }
    }
    return { ok: true }
  }

  /** 手机号 + 验证码登录 */
  async function loginWithPhone(phone, token) {
    const { error } = await supabase.auth.verifyOtp({ phone, token, type: 'sms' })
    if (error) return { ok: false, error: '验证码错误或已过期：' + error.message }
    const { data: { user } } = await supabase.auth.getUser()
    const profile = await fetchProfile(user.id)
    state.currentUser = buildCurrentUser(user, profile)
    return { ok: true }
  }

  /** OAuth 第三方登录 */
  async function loginWithOAuth(provider) {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: window.location.origin },
    })
    if (error) return { ok: false, error: error.message }
    return { ok: true }
  }

  /** 注册 */
  /** 注册 */
  async function register(email, password, username = '') {
    const uname = (username || '').trim()
    if (uname) {
      try {
        const { data: taken, error: takenError } = await supabase.rpc('username_taken', { p_username: uname })
        if (takenError) {
          return { ok: false, error: '自定义账号功能未初始化，请先在 Supabase 执行数据库脚本' }
        }
        if (taken) return { ok: false, error: '该账号名已被使用，请换一个' }
      } catch {
        return { ok: false, error: '自定义账号功能未初始化，请先在 Supabase 执行数据库脚本' }
      }
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: uname ? { data: { username: uname } } : undefined,
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
        username: uname || null,
        is_member: false,
      })
      if (profileError) {
        profile = await fetchProfile(data.user.id)
        if (!profile) return { ok: false, error: '账号创建失败：' + profileError.message }
      } else {
        profile = { id: data.user.id, email, username: uname || null, is_member: false, is_admin: false, member_expires_at: null }
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
  }

  /** 登出 */
  async function logout() {
    await supabase.auth.signOut()
    state.currentUser = null
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
    loginWithAccount,
    sendPhoneOtp,
    loginWithPhone,
    loginWithOAuth,
    register,
    logout,
  }
}
