import { createApp } from 'vue'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import App from './App.vue'
import router from './router'
import './styles.css'
import { useAuth } from './stores/auth.js'
import { supabase } from './lib/supabase.js'

function bootstrap() {
  const app = createApp(App)
  app.use(ElementPlus)
  app.use(router)
  app.mount('#app')

  const auth = useAuth()

  // 邮箱确认或其他标签页登录成功后，自动同步当前账号
  supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN' && session) {
      auth.restoreSession()
    } else if (event === 'SIGNED_OUT') {
      auth.state.currentUser = null
    }
  })

  // 后台恢复会话，不阻塞首屏渲染；恢复完如果没登录且在看受保护页面，就跳登录页
  auth.restoreSession().then((ok) => {
    if (!ok && router.currentRoute.value.meta.requiresAuth) {
      router.replace('/login')
    }
  })
}

bootstrap()
