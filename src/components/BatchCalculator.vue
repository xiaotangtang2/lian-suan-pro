<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Download, Lock } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import ResultBox from './ResultBox.vue'
import { buildBatchRows, parseBatchNumbers } from '../lib/calculations.js'
const props=defineProps({isMember:Boolean}); const emit=defineEmits([])
const router=useRouter()
const text=ref('120\n350.5\n88\n1060'), mode=ref('sum'), rate=ref(10)
const nums=computed(()=>parseBatchNumbers(text.value))
const rows=computed(()=>buildBatchRows(nums.value, mode.value, rate.value))
const total=computed(()=>rows.value.reduce((s,r)=>s+r.计算结果,0))
const exportExcel=async()=>{
  if(!props.isMember){ElMessage.warning('Excel 导出为会员功能');return}
  try {
    // 点击导出时再加载 ExcelJS，避免普通计算页面承担整套导出库体积。
    const { default: ExcelJS } = await import('exceljs')
    const workbook = new ExcelJS.Workbook()
    const sheet = workbook.addWorksheet('批量计算')
    sheet.columns = [
      { header: '序号', key: 'index', width: 10 },
      { header: '原始值', key: 'original', width: 18 },
      { header: '计算结果', key: 'result', width: 18 },
    ]
    rows.value.forEach(row => sheet.addRow({ index: row.序号, original: row.原始值, result: row.计算结果 }))
    sheet.getRow(1).font = { bold: true }
    const buffer = await workbook.xlsx.writeBuffer()
    const url = URL.createObjectURL(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }))
    const link = document.createElement('a')
    link.href = url
    link.download = '链算Pro-批量计算.xlsx'
    link.click()
    URL.revokeObjectURL(url)
  } catch (error) {
    ElMessage.error('Excel 导出失败，请稍后重试')
  }
}
</script>
<template><div><div class="section-heading"><div><span>05 · BATCH</span><h2>批量计算 <el-tag v-if="!isMember" type="warning">PRO</el-tag></h2><p>一行一个数字，批量处理经营数据。</p></div></div><div class="two-column"><div><el-form label-position="top"><el-form-item label="粘贴数字"><el-input v-model="text" type="textarea" :rows="10" placeholder="每行输入一个数字"/></el-form-item><div class="inline-controls"><el-select v-model="mode"><el-option label="批量求和" value="sum"/><el-option label="批量加价" value="markup"/><el-option label="批量扣税（价税分离）" value="tax"/></el-select><el-input-number v-if="mode!=='sum'" v-model="rate" :min="0" :max="100"><template #suffix>%</template></el-input-number></div></el-form></div><div class="result-panel"><ResultBox label="处理条数" :value="nums.length"/><ResultBox label="结果合计" :value="total.toFixed(2)" featured/><el-table :data="rows.slice(0,5)" size="small" max-height="220"><el-table-column prop="原始值" label="原始值"/><el-table-column prop="计算结果" label="计算结果"><template #default="s">{{ s.row.计算结果.toFixed(2) }}</template></el-table-column></el-table><el-button type="primary" :disabled="!isMember" :icon="Download" @click="exportExcel">导出 Excel</el-button><el-button v-if="!isMember" :icon="Lock" @click="router.push('/upgrade')">升级会员</el-button><p v-if="!isMember" class="formula-note">免费版可完整预览；会员可导出 Excel。</p></div></div></div></template>
