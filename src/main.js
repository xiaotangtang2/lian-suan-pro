import { createApp } from 'vue'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import App from './App.vue'
import router from './router'
import './styles.css'
import { useAuth } from './stores/auth.js'

const app = createApp(App)
app.use(ElementPlus)
app.use(router)

// 等待 Supabase 会话恢复完成后再挂载
const { restoreSession } = useAuth()
await restoreSession()

app.mount('#app')