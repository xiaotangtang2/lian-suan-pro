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
  app.use(router)

  const { restoreSession } = useAuth()
  await restoreSession()

  app.mount('#app')
}

bootstrap()
