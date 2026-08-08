import { ref, watch } from 'vue'
import { loadLocal, saveLocal } from '../utils/storage.js'

const dark = ref(loadLocal('lc-theme', false))

watch(dark, value => {
  document.documentElement.classList.toggle('dark', value)
  saveLocal('lc-theme', value)
}, { immediate: true })

export function useTheme() {
  return { dark }
}