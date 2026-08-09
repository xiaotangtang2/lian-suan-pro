import { createApp } from 'vue'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import App from './App.vue'
import router from './router'
import './styles.css'
import { useAuth } from './stores/auth.js'

async function bootstrap() {
  const app = createApp(App)
  app.use(ElementPlus)

  // 先恢复会话，再挂载路由，确保路由守卫拿到正确的登录状态
  const { restoreSession } = useAuth()
  await restoreSession()

  app.use(router)
  app.mount('#app')
}

bootstrap()
