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
  const { restoreSession } = useAuth()
  await restoreSession()
  app.use(router)
  app.mount('#app')
}

bootstrap()
