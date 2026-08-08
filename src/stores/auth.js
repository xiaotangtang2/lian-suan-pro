import { reactive, computed, ref } from 'vue'
import { supabase } from '../lib/supabase.js'

const state = reactive({
  currentUser: null,
  loading: true,
})

export function useAuth() {
  const isLoggedIn = computed(() => !!state.currentUser)
  const isMember = computed(() => !!state.currentUser?.is_member)
  const isLoading = computed(() => state.loading)

  /** 启动时恢复 Supabase 会话 */
  async function restoreSession() {
    state.loading = true
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { state.loading = false; return false }

      // 拉取该用户的 profiles 记录
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single()

      if (profile) {
        state.currentUser = { email: session.user.email, is_member: profile.is_member }
      } else {
        // 老用户可能在 auth 里但 profiles 表里还没有记录，补一条
        const { data: created } = await supabase
          .from('profiles')
          .insert({ id: session.user.id, email: session.user.email, is_member: false })
          .select()
          .single()
        state.currentUser = { email: session.user.email, is_member: created?.is_member ?? false }
      }
      return true
    } catch {
      return false
    } finally {
      state.loading = false
    }
  }

  /** 登录 */
  async function login(email, password) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      const msg = error.message.includes('Invalid login')
        ? '邮箱或密码错误'
        : error.message
      return { ok: false, error: msg }
    }

    // 登录成功后拉取 profile
    const { data: { user } } = await supabase.auth.getUser()
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    state.currentUser = {
      email: user.email,
      is_member: profile?.is_member ?? false,
    }
    return { ok: true }
  }

  /** 注册 */
  async function register(email, password) {
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) {
      const msg = error.message.includes('already')
        ? '该邮箱已注册'
        : error.message
      return { ok: false, error: msg }
    }

    if (!data.user) {
      return { ok: false, error: '注册失败，请稍后重试' }
    }

    // 在 profiles 表创建记录
    await supabase.from('profiles').insert({
      id: data.user.id,
      email,
      is_member: false,
    })

    state.currentUser = { email, is_member: false }
    return { ok: true }
  }

  /** 登出 */
  async function logout() {
    await supabase.auth.signOut()
    state.currentUser = null
  }

  /** 切换会员状态 */
  async function setMembership(value) {
    if (!state.currentUser) return
    await supabase
      .from('profiles')
      .update({ is_member: value })
      .eq('id', (await supabase.auth.getUser()).data.user.id)

    state.currentUser.is_member = value
  }

  return {
    state,
    isLoading,
    isLoggedIn,
    isMember,
    restoreSession,
    login,
    register,
    logout,
    setMembership,
  }
}