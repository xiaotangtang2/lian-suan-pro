<template>
  <div class="app-root">
    <router-view />
  </div>
</template>

<script setup>
import { onBeforeUnmount, onMounted } from 'vue'
import { startOnlinePresence, stopOnlinePresence } from './composables/useOnlinePresence.js'


// 在根组件统一维护在线 Presence，任何页面都会被纳入实时在线统计。
onMounted(() => {
  startOnlinePresence()
  window.addEventListener('pagehide', stopOnlinePresence)
})

onBeforeUnmount(() => {
  window.removeEventListener('pagehide', stopOnlinePresence)
  stopOnlinePresence()
})
</script>
