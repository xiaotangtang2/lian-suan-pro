import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
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
        // 每次构建都生成唯一版本号，避免仅修改界面却忘记改说明时漏掉更新提醒。
        version: `${release || 'release'}-${Date.now().toString(36)}`,
        items,
      }))
    },
  }
}

function staticSeoPagesPlugin() {
  return {
    name: 'write-static-seo-pages',
    apply: 'build',
    closeBundle() {
      const pages = JSON.parse(readFileSync(resolve('seo-pages.json'), 'utf8'))
      const template = readFileSync(resolve('dist', 'index.html'), 'utf8')
      for (const page of pages) {
        const url = `https://lian-suan-pro.pages.dev${page.path === '/' ? '/' : page.path}`
        const structuredData = {
          '@context': 'https://schema.org',
          '@type': page.path.startsWith('/tools/') ? 'WebApplication' : 'WebPage',
          name: page.heading,
          url,
          description: page.description,
          inLanguage: 'zh-CN',
          ...(page.path.startsWith('/tools/') ? {
            applicationCategory: 'BusinessApplication',
            operatingSystem: 'Any',
            offers: { '@type': 'Offer', price: '0', priceCurrency: 'CNY' },
          } : {}),
        }
        const staticContent = `<main class="seo-static"><h1>${page.heading}</h1><p>${page.summary}</p><p>关键词：${page.keywords.join('、')}</p></main>`
        const html = template
          .replace(/<title>.*?<\/title>/, `<title>${page.title}</title>`)
          .replace(/<meta name="description" content="[^"]*"\s*\/>/, `<meta name="description" content="${page.description}"/>`)
          .replace(/<meta name="keywords" content="[^"]*"\s*\/>/, `<meta name="keywords" content="${page.keywords.join(',')}"/>`)
          .replace(/<link rel="canonical" href="[^"]*"\s*\/>/, `<link rel="canonical" href="${url}"/>`)
          .replace(/<meta property="og:title" content="[^"]*"\s*\/>/, `<meta property="og:title" content="${page.title}"/>`)
          .replace(/<meta property="og:description" content="[^"]*"\s*\/>/, `<meta property="og:description" content="${page.description}"/>`)
          .replace(/<meta property="og:url" content="[^"]*"\s*\/>/, `<meta property="og:url" content="${url}"/>`)
          .replace('</head>', `<script id="seo-json-ld" type="application/ld+json">${JSON.stringify(structuredData).replaceAll('<', '\\u003c')}</script></head>`)
          .replace('<div id="app"></div>', `<div id="app">${staticContent}</div>`)
        if (page.path === '/') {
          writeFileSync(resolve('dist', 'index.html'), html)
        } else {
          // 同时生成 clean URL 对应的 .html 与目录索引，兼容 Cloudflare 和常规静态服务器。
          const cleanOutput = resolve('dist', `${page.path.slice(1)}.html`)
          const directoryOutput = resolve('dist', page.path.slice(1), 'index.html')
          mkdirSync(resolve(cleanOutput, '..'), { recursive: true })
          mkdirSync(resolve(directoryOutput, '..'), { recursive: true })
          writeFileSync(cleanOutput, html)
          writeFileSync(directoryOutput, html)
        }
      }
    },
  }
}

export default defineConfig({
  plugins: [vue(), versionFilePlugin(), staticSeoPagesPlugin()],
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
