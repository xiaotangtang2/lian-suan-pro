import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

function versionFilePlugin() {
  return {
    name: 'write-version-file',
    apply: 'build',
    closeBundle() {
      let release = ''
      let items = []
      try {
        const parsed = JSON.parse(readFileSync(resolve('public', 'updates.json'), 'utf8'))
        release = typeof parsed.release === 'string' ? parsed.release : ''
        items = Array.isArray(parsed.items) ? parsed.items : []
      } catch {}
      // updates.json 只代表本次发布，旧版本内容不会累计进新弹窗。
      writeFileSync(resolve('dist', 'version.json'), JSON.stringify({
        version: release || Date.now().toString(36),
        items,
      }))
    },
  }
}

export default defineConfig({
  plugins: [vue(), versionFilePlugin()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'element-plus': ['element-plus'],
          'vue-vendor': ['vue', 'vue-router'],
          'supabase': ['@supabase/supabase-js'],
        },
      },
    },
  },
})
