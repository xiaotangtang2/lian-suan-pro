import { createApp } from 'vue'
import ElementPlus from 'element-plus'
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
}

bootstrap()