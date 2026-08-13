<template>
  <div class="app-root">
    <!-- 互动粒子只用于访客可直接使用的免费页面，避免干扰工作台的专注计算。 -->
    <ParticleField v-if="showPublicEffect" />
    <router-view />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import ParticleField from './components/ParticleField.vue'

const route = useRoute()
const showPublicEffect = computed(() => route.path === '/' || route.path.startsWith('/tools/'))
</script>
