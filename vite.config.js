import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import history from 'connect-history-api-fallback'

export default defineConfig({
  plugins: [
    vue(),
    {
      name: 'spa-fallback',
      configureServer(server) {
        server.middlewares.use(
          history({
            disableDotRule: true,
            htmlAcceptHeaders: ['text/html', 'application/xhtml+xml'],
          })
        )
      },
    },
  ],
})