import { before, test } from 'node:test'
import assert from 'node:assert/strict'
import { mock } from 'node:test'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

function createFakeSupabase() {
  const calls = []
  const scenario = {
    rpc: {},
    profile: { id: 'u1', email: 'a@b.com', username: 'alice', is_member: false, is_admin: false, member_expires_at: null },
    session: null,
    signInError: null,
    signInThrow: null,
    signUpError: null,
    signUpThrow: null,
    signUpUser: null,
    signUpSession: { access_token: 't' },
    signInOtpError: null,
    signInOtpThrow: null,
    verifyOtpError: null,
    verifyOtpThrow: null,
    signInOAuthError: null,
    signInOAuthThrow: null,
    signOutError: null,
    signOutThrow: null,
    getUserError: null,
    getSessionError: null,
    getSessionThrow: null,
    profileFetchError: null,
    insertError: null,
  }
  const supabase = {
    calls,
    scenario,
    auth: {
      async signInWithPassword(args) {
        calls.push(['signInWithPassword', args])
        if (scenario.signInThrow) throw scenario.signInThrow
        if (scenario.signInError) return { data: { user: null, session: null }, error: scenario.signInError }
        return { data: { user: { id: 'u1', email: args.email }, session: { access_token: 't' } }, error: null }
      },
      async signUp(args) {
        calls.push(['signUp', args])
        if (scenario.signUpThrow) throw scenario.signUpThrow
        if (scenario.signUpError) return { data: { user: null, session: null }, error: scenario.signUpError }
        const user = scenario.signUpUser ?? { id: 'u1', email: args.email, identities: [{ id: 'i1' }] }
        return { data: { user, session: scenario.signUpSession }, error: null }
      },
      async getUser() {
        calls.push(['getUser'])
        if (scenario.getUserError) return { data: { user: null }, error: scenario.getUserError }
        return { data: { user: { id: 'u1', email: 'a@b.com' } }, error: null }
      },
      async getSession() {
        calls.push(['getSession'])
        if (scenario.getSessionThrow) throw scenario.getSessionThrow
        return { data: { session: scenario.session }, error: scenario.getSessionError ?? null }
      },
      async signOut() {
        calls.push(['signOut'])
        if (scenario.signOutThrow) throw scenario.signOutThrow
        return { error: scenario.signOutError ?? null }
      },
      async signInWithOtp(args) {
        calls.push(['signInWithOtp', args])
        if (scenario.signInOtpThrow) throw scenario.signInOtpThrow
        return { error: scenario.signInOtpError ?? null }
      },
      async verifyOtp(args) {
        calls.push(['verifyOtp', args])
        if (scenario.verifyOtpThrow) throw scenario.verifyOtpThrow
        if (scenario.verifyOtpError) return { data: { user: null, session: null }, error: scenario.verifyOtpError }
        return { data: { user: { id: 'u1', email: 'a@b.com' }, session: { access_token: 't' } }, error: null }
      },
      async signInWithOAuth(args) {
        calls.push(['signInWithOAuth', args])
        if (scenario.signInOAuthThrow) throw scenario.signInOAuthThrow
        return { error: scenario.signInOAuthError ?? null }
      },
    },
    async rpc(fn, args) {
      calls.push(['rpc', fn, args])
      if (scenario.rpc[fn]?.throw) throw scenario.rpc[fn].throw
      if (scenario.rpc[fn]) return scenario.rpc[fn].result(args)
      return { data: null, error: null }
    },
    from(table) {
      calls.push(['from', table])
      return {
        select() {
          calls.push(['select', table])
          return {
            eq(column, value) {
              calls.push(['eq', table, column, value])
              return {
                async maybeSingle() {
                  if (scenario.profileFetchError) return { data: null, error: scenario.profileFetchError }
                  return { data: scenario.profile, error: null }
                },
              }
            },
          }
        },
        insert(row) {
          calls.push(['insert', table, row])
          return {
            error: scenario.insertError ?? null,
            select() {
              return {
                async single() {
                  if (scenario.insertError) return { data: null, error: scenario.insertError }
                  return { data: row, error: null }
                },
              }
            },
          }
        },
      }
    },
  }
  return supabase
}

const fake = createFakeSupabase()
const supabaseModuleUrl = new URL('../src/lib/supabase.js', import.meta.url).href
mock.module(supabaseModuleUrl, { exports: { supabase: fake } })

let useAuth
before(async () => {
  const mod = await import('../src/stores/auth.js')
  useAuth = mod.useAuth
})

function freshAuth() {
  const auth = useAuth()
  auth.state.currentUser = null
  auth.state.loading = true
  return auth
}

test('登录：邮箱登录成功并写入当前用户', async () => {
  fake.calls.length = 0
  fake.scenario.rpc['check_email_registered'] = { result: () => ({ data: false, error: null }) }
  fake.scenario.signInError = null
  const auth = freshAuth()
  const result = await auth.login('  a@b.com  ', 'secret')
  assert.equal(result.ok, true)
  assert.equal(auth.state.currentUser.email, 'a@b.com')
  assert.equal(auth.state.currentUser.username, 'alice')
  assert.ok(fake.calls.some(c => c[0] === 'signInWithPassword' && c[1].email === 'a@b.com'))
})

test('登录：未注册邮箱返回友好提示', async () => {
  fake.calls.length = 0
  fake.scenario.rpc['check_email_registered'] = { result: () => ({ data: false, error: null }) }
  fake.scenario.signInError = new Error('Invalid login credentials')
  const auth = freshAuth()
  const result = await auth.login('nope@example.com', 'x')
  assert.equal(result.ok, false)
  assert.equal(result.error, '该邮箱未注册，请先注册')
})

test('登录：已注册邮箱密码错误返回提示', async () => {
  fake.scenario.rpc['check_email_registered'] = { result: () => ({ data: true, error: null }) }
  fake.scenario.signInError = new Error('Invalid login credentials')
  const auth = freshAuth()
  const result = await auth.login('a@b.com', 'wrong')
  assert.equal(result.ok, false)
  assert.equal(result.error, '邮箱或密码错误')
})

test('登录：邮箱未确认返回确认提示', async () => {
  fake.scenario.rpc['check_email_registered'] = { result: () => ({ data: true, error: null }) }
  fake.scenario.signInError = new Error('Email not confirmed')
  const auth = freshAuth()
  const result = await auth.login('a@b.com', 'secret')
  assert.equal(result.ok, false)
  assert.match(result.error, /邮箱还未确认/)
})

test('账号登录：输入邮箱时直接走邮箱登录', async () => {
  fake.calls.length = 0
  fake.scenario.rpc['check_email_registered'] = { result: () => ({ data: true, error: null }) }
  fake.scenario.signInError = null
  const auth = freshAuth()
  const result = await auth.loginWithAccount('a@b.com', 'secret')
  assert.equal(result.ok, true)
  assert.ok(fake.calls.some(c => c[0] === 'signInWithPassword' && c[1].email === 'a@b.com'))
})

test('账号登录：账号名能解析到邮箱', async () => {
  fake.calls.length = 0
  fake.scenario.rpc['find_login_email'] = { result: () => ({ data: 'a@b.com', error: null }) }
  fake.scenario.rpc['check_email_registered'] = { result: () => ({ data: true, error: null }) }
  fake.scenario.signInError = null
  const auth = freshAuth()
  const result = await auth.loginWithAccount('alice', 'secret')
  assert.equal(result.ok, true)
  assert.ok(fake.calls.some(c => c[0] === 'rpc' && c[1] === 'find_login_email'))
  assert.ok(fake.calls.some(c => c[0] === 'signInWithPassword' && c[1].email === 'a@b.com'))
})

test('账号登录：账号不存在返回提示', async () => {
  fake.scenario.rpc['find_login_email'] = { result: () => ({ data: null, error: null }) }
  const auth = freshAuth()
  const result = await auth.loginWithAccount('ghost', 'secret')
  assert.equal(result.ok, false)
  assert.equal(result.error, '该账号未注册，请先注册')
})

test('账号登录：RPC 未初始化返回初始化提示', async () => {
  fake.scenario.rpc['find_login_email'] = { result: () => ({ data: null, error: { message: 'function not found' } }) }
  const auth = freshAuth()
  const result = await auth.loginWithAccount('alice', 'secret')
  assert.equal(result.ok, false)
  assert.equal(result.error, '账号登录还未初始化，请先在 Supabase 执行数据库脚本')
})

test('手机号：发送验证码成功', async () => {
  fake.calls.length = 0
  fake.scenario.signInOtpError = null
  const auth = freshAuth()
  const result = await auth.sendPhoneOtp('+8613800138000')
  assert.equal(result.ok, true)
  assert.ok(fake.calls.some(c => c[0] === 'signInWithOtp' && c[1].phone === '+8613800138000'))
})

test('手机号：发送验证码限流提示', async () => {
  fake.scenario.signInOtpError = new Error('rate limit exceeded')
  const auth = freshAuth()
  const result = await auth.sendPhoneOtp('+8613800138000')
  assert.equal(result.ok, false)
  assert.match(result.error, /太频繁/)
})

test('手机号：短信服务未开启提示', async () => {
  fake.scenario.signInOtpError = new Error('Unsupported phone provider')
  const auth = freshAuth()
  const result = await auth.sendPhoneOtp('+8613800138000')
  assert.equal(result.ok, false)
  assert.match(result.error, /还没在后台开启/)
})

test('手机号：验证码登录成功', async () => {
  fake.scenario.verifyOtpError = null
  const auth = freshAuth()
  const result = await auth.loginWithPhone('+8613800138000', '123456')
  assert.equal(result.ok, true)
  assert.equal(auth.state.currentUser.email, 'a@b.com')
})

test('注册：账号名已被占用返回提示', async () => {
  fake.calls.length = 0
  fake.scenario.rpc['username_taken'] = { result: () => ({ data: true, error: null }) }
  const auth = freshAuth()
  const result = await auth.register('a@b.com', '123456', 'alice')
  assert.equal(result.ok, false)
  assert.equal(result.error, '该账号名已被使用，请换一个')
  assert.ok(!fake.calls.some(c => c[0] === 'signUp'))
})

test('注册：成功创建并写入当前用户', async () => {
  fake.calls.length = 0
  fake.scenario.rpc['username_taken'] = { result: () => ({ data: false, error: null }) }
  fake.scenario.signUpError = null
  fake.scenario.signUpUser = { id: 'u1', email: 'new@b.com', identities: [{ id: 'i1' }] }
  fake.scenario.signUpSession = { access_token: 't' }
  fake.scenario.profile = { id: 'u1', email: 'new@b.com', username: 'alice', is_member: false, is_admin: false, member_expires_at: null }
  const auth = freshAuth()
  const result = await auth.register('new@b.com', '123456', 'alice')
  assert.equal(result.ok, true)
  assert.equal(auth.state.currentUser.username, 'alice')
  const signUpCall = fake.calls.find(c => c[0] === 'signUp')
  assert.equal(signUpCall[1].options.data.username, 'alice')
})

test('注册：邮箱确认开启时返回确认提示', async () => {
  fake.scenario.rpc['username_taken'] = { result: () => ({ data: false, error: null }) }
  fake.scenario.signUpUser = { id: 'u1', email: 'new@b.com', identities: [{ id: 'i1' }] }
  fake.scenario.signUpSession = null
  fake.scenario.signOutError = null
  const auth = freshAuth()
  const result = await auth.register('new@b.com', '123456', 'alice')
  assert.equal(result.ok, true)
  assert.equal(result.needConfirm, true)
  assert.equal(auth.state.currentUser, null)
  assert.ok(fake.calls.some(c => c[0] === 'signOut'))
})

test('注册：已注册邮箱返回提示', async () => {
  fake.scenario.rpc['username_taken'] = { result: () => ({ data: false, error: null }) }
  fake.scenario.signUpUser = { id: 'u1', email: 'old@b.com', identities: [] }
  fake.scenario.signUpSession = null
  const auth = freshAuth()
  const result = await auth.register('old@b.com', '123456', 'alice')
  assert.equal(result.ok, false)
  assert.equal(result.error, '该邮箱已注册，请直接登录')
})

test('注册：signUp 返回 already 错误时提示', async () => {
  fake.scenario.rpc['username_taken'] = { result: () => ({ data: false, error: null }) }
  fake.scenario.signUpError = new Error('User already registered')
  const auth = freshAuth()
  const result = await auth.register('old@b.com', '123456', 'alice')
  assert.equal(result.ok, false)
  assert.equal(result.error, '该邮箱已注册')
})

test('注册：profile 缺失时自动补建', async () => {
  fake.calls.length = 0
  fake.scenario.rpc['username_taken'] = { result: () => ({ data: false, error: null }) }
  fake.scenario.signUpUser = { id: 'u1', email: 'new@b.com', identities: [{ id: 'i1' }] }
  fake.scenario.signUpError = null
  fake.scenario.signUpSession = { access_token: 't' }
  fake.scenario.profile = null
  fake.scenario.insertError = null
  const auth = freshAuth()
  const result = await auth.register('new@b.com', '123456', 'alice')
  assert.equal(result.ok, true)
  assert.ok(fake.calls.some(c => c[0] === 'insert'))
})

test('登出：清除当前用户', async () => {
  const auth = freshAuth()
  auth.state.currentUser = { id: 'u1' }
  await auth.logout()
  assert.equal(auth.state.currentUser, null)
})

test('会话恢复：无会话时返回 false 并结束 loading', async () => {
  fake.scenario.session = null
  const auth = freshAuth()
  const result = await auth.restoreSession()
  assert.equal(result, false)
  assert.equal(auth.state.loading, false)
})

test('会话恢复：有会话且 profile 缺失时自动创建', async () => {
  fake.calls.length = 0
  fake.scenario.session = { user: { id: 'u1', email: 'a@b.com' } }
  fake.scenario.profile = null
  fake.scenario.insertError = null
  const auth = freshAuth()
  const result = await auth.restoreSession()
  assert.equal(result, true)
  assert.equal(auth.state.currentUser.id, 'u1')
  assert.ok(fake.calls.some(c => c[0] === 'insert'))
})

test('UI：登录页包含三种登录方式和 OAuth 入口', () => {
  const html = readFileSync(fileURLToPath(new URL('../src/views/LoginPage.vue', import.meta.url)), 'utf8')
  for (const text of ['邮箱登录', '账号登录', '手机号登录', 'Google', 'GitHub', '立即注册']) {
    assert.match(html, new RegExp(text))
  }
  assert.match(html, /form\.email\.trim\(\)/)
  assert.match(html, /accountForm\.account\.trim\(\)/)
})

test('UI：注册页包含账号名、邮箱、密码和确认密码', () => {
  const html = readFileSync(fileURLToPath(new URL('../src/views/RegisterPage.vue', import.meta.url)), 'utf8')
  for (const text of ['账号名', '邮箱', '密码', '确认密码', '至少6位密码', '已有账号']) {
    assert.match(html, new RegExp(text))
  }
  assert.match(html, /form\.email\.trim\(\)/)
})

test('SQL：登录/注册依赖的 RPC 和触发器在脚本中已定义', () => {
  const schema = readFileSync(new URL('../supabase_schema.sql', import.meta.url), 'utf8')
  const membership = readFileSync(new URL('../supabase_membership.sql', import.meta.url), 'utf8')
  const username = readFileSync(new URL('../supabase_username_login.sql', import.meta.url), 'utf8')
  assert.match(schema, /create table if not exists profiles/)
  assert.match(membership, /check_email_registered/)
  assert.match(username, /username_taken/)
  assert.match(username, /find_login_email/)
  assert.match(username, /handle_new_user/)
})


test('登录：网络异常时返回友好错误而不是抛异常', async () => {
  fake.scenario.rpc['check_email_registered'] = { result: () => ({ data: false, error: null }) }
  fake.scenario.signInThrow = new Error('network down')
  const auth = freshAuth()
  const result = await auth.login('a@b.com', 'secret')
  assert.equal(result.ok, false)
  assert.equal(result.error, '网络异常，请稍后重试')
})

test('登录：获取用户信息失败时返回友好错误', async () => {
  fake.scenario.rpc['check_email_registered'] = { result: () => ({ data: false, error: null }) }
  fake.scenario.signInThrow = null
  fake.scenario.signInError = null
  fake.scenario.getUserError = new Error('user fetch failed')
  const auth = freshAuth()
  const result = await auth.login('a@b.com', 'secret')
  assert.equal(result.ok, false)
  assert.equal(result.error, '登录成功但获取用户信息失败，请刷新重试')
})

test('手机号：验证码登录网络异常时返回友好错误', async () => {
  fake.scenario.verifyOtpThrow = new Error('network down')
  const auth = freshAuth()
  const result = await auth.loginWithPhone('+8613800138000', '123456')
  assert.equal(result.ok, false)
  assert.equal(result.error, '网络异常，请稍后重试')
})

test('注册：网络异常时返回友好错误而不是抛异常', async () => {
  fake.scenario.rpc['username_taken'] = { result: () => ({ data: false, error: null }) }
  fake.scenario.signUpThrow = new Error('network down')
  const auth = freshAuth()
  const result = await auth.register('new@b.com', '123456', 'alice')
  assert.equal(result.ok, false)
  assert.equal(result.error, '网络异常，请稍后重试')
})

test('登出：signOut 失败时也清除本地用户', async () => {
  fake.scenario.signOutThrow = new Error('network down')
  const auth = freshAuth()
  auth.state.currentUser = { id: 'u1' }
  await auth.logout()
  assert.equal(auth.state.currentUser, null)
})

test('会话恢复：getSession 抛异常时返回 false 且不抛异常', async () => {
  fake.scenario.getSessionThrow = new Error('network down')
  const auth = freshAuth()
  const result = await auth.restoreSession()
  assert.equal(result, false)
  assert.equal(auth.state.loading, false)
})