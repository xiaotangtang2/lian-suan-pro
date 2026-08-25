<template>
  <div class="app-root">
    <!-- 互动粒子只用于访客可直接使用的免费页面，避免干扰工作台的专注计算。 -->
    <ParticleField v-if="showPublicEffect" />
    <router-view />
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import ParticleField from './components/ParticleField.vue'
import { startOnlinePresence, stopOnlinePresence } from './composables/useOnlinePresence.js'

const route = useRoute()
const showPublicEffect = computed(() => route.path === '/' || route.path.startsWith('/tools/'))

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
