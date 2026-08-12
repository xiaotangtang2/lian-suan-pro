import { createApp, h } from 'vue'
import ElementPlus from 'element-plus'
import { ElButton, ElNotification } from 'element-plus'
import 'element-plus/dist/index.css'
import App from './App.vue'
import router from './router'
import './styles.css'
import { useAuth } from './stores/auth.js'
import { supabase } from './lib/supabase.js'

async function bootstrap() {
  const auth = useAuth()

  // 邮箱确认或其他标签页登录成功后，自动同步当前账号
  supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN' && session) {
      auth.restoreSession()
    } else if (event === 'SIGNED_OUT') {
      auth.state.currentUser = null
    }
  })

  // 先恢复会话再挂载路由，未登录时由守卫直接跳登录页，避免首屏闪现首页
  await auth.restoreSession()

  const app = createApp(App)
  app.use(ElementPlus)
  app.use(router)
  app.mount('#app')

  // 自动检查部署版本，有新版本就提示并刷新
  let currentVersion = null
  async function checkVersion() {
    try {
      const res = await fetch(`/version.json?t=${Date.now()}`, { cache: 'no-store' })
      if (!res.ok) return
      const data = await res.json()
      if (!data?.version) return
      if (currentVersion === null) {
        currentVersion = data.version
        return
      }
      if (data.version !== currentVersion) {
        currentVersion = data.version
        ElNotification({
          title: '网站已更新',
          message: h('div', { style: 'display:flex;flex-direction:column;gap:8px;' }, [
            h('div', { style: 'display:flex;align-items:center;justify-content:space-between;gap:12px;' }, [
              '新版本已上线，点击按钮刷新',
              h(ElButton, { type: 'primary', size: 'small', onClick: () => location.reload() }, '立即刷新'),
            ]),
            ...(Array.isArray(data.items) && data.items.length ? [
              h('div', { style: 'font-weight:600;margin-top:2px;' }, '本次更新：'),
              h('ul', { style: 'margin:4px 0 0;padding-left:18px;' }, data.items.map((item) => h('li', { style: 'margin:2px 0;' }, item))),
            ] : []),
          ]),
          duration: 0,
          position: 'bottom-right',
        })
      }
    } catch { /* 版本文件不存在时忽略 */ }
  }
  setInterval(checkVersion, 30000)
  checkVersion()
}

bootstrap()