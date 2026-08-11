import { after, before, test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'
import { createSSRApp } from 'vue'
import { routerKey } from 'vue-router'
import { renderToString } from 'vue/server-renderer'

const stubs = [
  ['el-alert', { template: '<div><slot /></div>' }],
  ['el-button', { template: '<button><slot /></button>' }],
  ['el-date-picker', { template: '<input />' }],
  ['el-empty', { template: '<div><slot /></div>' }],
  ['el-form', { template: '<form><slot /></form>' }],
  ['el-form-item', { template: '<div><slot /></div>' }],
  ['el-input', { template: '<div><slot /></div>' }],
  ['el-input-number', { template: '<input />' }],
  ['el-option', { template: '<option><slot /></option>' }],
  ['el-segmented', { template: '<div><slot /></div>' }],
  ['el-select', { template: '<div><slot /></div>' }],
  ['el-table', { template: '<table><slot /></table>' }],
  ['el-table-column', { template: '<td><slot :row="{ 计算结果: 0 }" /></td>' }],
  ['el-tag', { template: '<span><slot /></span>' }],
  ['el-time-select', { template: '<input />' }],
  ['el-tooltip', { template: '<div><slot /></div>' }],
]

let server

before(async () => {
  server = await createServer({
    appType: 'custom',
    logLevel: 'error',
    server: { middlewareMode: true },
  })
})

after(async () => {
  await new Promise(resolve => setTimeout(resolve, 500))
  await server.close()
})

async function renderComponent(path, props = {}) {
  const mod = await server.ssrLoadModule(path)
  const app = createSSRApp(mod.default, props)
  app.provide(routerKey, { push() {} })
  for (const [name, stub] of stubs) app.component(name, stub)
  return renderToString(app)
}

test('组件冒烟：基础计算器可渲染', async () => {
  const html = await renderComponent('/src/components/BasicCalculator.vue')
  assert.match(html, /基础计算器/)
  assert.match(html, /输入算式/)
})

test('组件冒烟：物流报价默认结果正确', async () => {
  const html = await renderComponent('/src/components/LogisticsCalculator.vue')
  assert.match(html, /物流成本报价/)
  assert.match(html, /¥\s*1,464\.77/)
  assert.match(html, /16\.00%/)
})

test('组件冒烟：工时工作日默认结果正确', async () => {
  const html = await renderComponent('/src/components/WorkdayCalculator.vue')
  assert.match(html, /工时与工作日/)
  assert.match(html, /8\.50 小时/)
  assert.match(html, /0\.50 小时/)
  assert.match(html, /31 天/)
  assert.match(html, /21 天/)
})

test('组件冒烟：真实 IRR 默认结果正确', async () => {
  const html = await renderComponent('/src/components/IrrCalculator.vue')
  assert.match(html, /真实 IRR/)
  assert.match(html, /2\.0757%/)
})

test('组件冒烟：批量计算默认结果正确', async () => {
  const html = await renderComponent('/src/components/BatchCalculator.vue', { isMember: true })
  assert.match(html, /批量计算/)
  assert.match(html, /1618\.50/)
  assert.match(html, /4/)
})

test('组件冒烟：公式模板默认结果正确', async () => {
  const html = await renderComponent('/src/components/FormulaTemplates.vue', { isMember: true })
  assert.match(html, /自定义公式模板/)
  assert.match(html, /0\.0000/)
})

test('组件冒烟：单位换算默认结果正确', async () => {
  const html = await renderComponent('/src/components/UnitConverter.vue')
  assert.match(html, /物流单位换算/)
  assert.match(html, /1,000/)
  assert.match(html, /1,000,000/)
})

test('组件冒烟：AI 计算可渲染且包含示例', async () => {
  const html = await renderComponent('/src/components/AiCalculator.vue', { isMember: true })
  assert.match(html, /AI 自然语言计算/)
  assert.match(html, /运费320元/)
})

test('AI 依赖：ai-proxy 后端函数完整且走 DeepSeek', () => {
  const functionsDir = fileURLToPath(new URL('../supabase/functions/', import.meta.url))
  const aiProxyDir = `${functionsDir}ai-proxy`
  assert.ok(existsSync(aiProxyDir), 'AI 计算调用 /functions/v1/ai-proxy，但 supabase/functions 下没有 ai-proxy 函数')
  const source = readFileSync(`${aiProxyDir}/index.ts`, 'utf8')
  assert.match(source, /DEEPSEEK_API_KEY/)
  assert.match(source, /https:\/\/api\.deepseek\.com/)
  assert.match(source, /deepseek-chat/)
  assert.match(source, /from\('profiles'\)/)
  assert.match(source, /is_member/)
  assert.match(source, /member_expires_at/)
})

test('AI 依赖：前端与 ai-proxy 契约一致', () => {
  const frontend = readFileSync(new URL('../src/components/AiCalculator.vue', import.meta.url), 'utf8')
  assert.match(frontend, /functions\/v1\/ai-proxy/)
  assert.match(frontend, /Authorization: `Bearer \$\{session\.access_token\}`/)
  assert.match(frontend, /data\.error/)
  assert.match(frontend, /result\.value = data\.result/)
})

test('组件冒烟：测试页 8 个模块全部可渲染', async () => {
  const html = await renderComponent('/src/views/TestModules.vue')
  for (const heading of ['基础计算器', '物流成本报价', '工时与工作日', '真实 IRR', '批量计算', '自定义公式模板', '物流单位换算', 'AI 自然语言计算']) {
    assert.match(html, new RegExp(heading))
  }
})

test('AI 安全：前端不包含 DeepSeek 密钥', () => {
  const frontend = readFileSync(new URL('../src/components/AiCalculator.vue', import.meta.url), 'utf8')
  assert.doesNotMatch(frontend, /DEEPSEEK_API_KEY/)
  assert.doesNotMatch(frontend, /sk-[A-Za-z0-9]{10,}/)
})


test('启动顺序：先恢复会话再挂载路由，避免未登录时闪现首页', () => {
  const source = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8')
  const restoreAt = source.indexOf('await auth.restoreSession()')
  const useRouterAt = source.indexOf('app.use(router)')
  const mountAt = source.indexOf("app.mount('#app')")
  assert.ok(restoreAt >= 0, 'main.js 必须显式 await auth.restoreSession()')
  assert.ok(useRouterAt >= 0 && mountAt >= 0, 'main.js 需要安装并挂载路由')
  assert.ok(restoreAt < useRouterAt, '必须先恢复会话，再安装路由')
  assert.ok(restoreAt < mountAt, '必须先恢复会话，再挂载应用')
})


test('移动端顶部：账号不再被隐藏且可省略号收缩', () => {
  const css = readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8')
  assert.doesNotMatch(css, /\.user-email\{display:none\}/)
  assert.match(css, /\.user-email\{display:inline-block;flex:1 1 auto;min-width:0;max-width:none/)
})