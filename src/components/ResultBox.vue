<script setup>
import { CopyDocument } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { copyText } from '../utils/storage'
defineProps({ label: String, value: [String, Number], featured: Boolean, suffix: String })
const copy = async value => { await copyText(value); ElMessage.success('已复制') }
</script>
<template><div class="result-box" :class="{ featured }"><span>{{ label }}</span><div><strong>{{ value }}</strong><small v-if="suffix">{{ suffix }}</small><el-button text :icon="CopyDocument" aria-label="复制结果" @click="copy(value)" /></div></div></template>
