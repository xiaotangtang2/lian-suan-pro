<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Download, Lock } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import * as XLSX from 'xlsx'
import ResultBox from './ResultBox.vue'
const props=defineProps({isMember:Boolean}); const emit=defineEmits([])
const router=useRouter()
const text=ref('120\n350.5\n88\n1060'), mode=ref('sum'), rate=ref(10)
const nums=computed(()=>text.value.split(/[\n,锛孿s]+/).map(Number).filter(Number.isFinite))
const rows=computed(()=>nums.value.map((v,i)=>({搴忓彿:i+1,鍘熷鍊?v,璁＄畻缁撴灉:mode.value==='markup'?v*(1+rate.value/100):mode.value==='tax'?v/(1+rate.value/100):v})))
const total=computed(()=>rows.value.reduce((s,r)=>s+r.璁＄畻缁撴灉,0))
const exportExcel=()=>{if(!props.isMember){ElMessage.warning('Excel 瀵煎嚭涓轰細鍛樺姛鑳?);return}const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(rows.value),'鎵归噺璁＄畻');XLSX.writeFile(wb,'閾剧畻Pro-鎵归噺璁＄畻.xlsx')}
</script>
<template><div><div class="section-heading"><div><span>05 路 BATCH</span><h2>鎵归噺璁＄畻 <el-tag v-if="!isMember" type="warning">PRO</el-tag></h2><p>涓€琛屼竴涓暟瀛楋紝鎵归噺澶勭悊缁忚惀鏁版嵁銆?/p></div></div><div class="two-column"><div><el-form label-position="top"><el-form-item label="绮樿创鏁板瓧"><el-input v-model="text" type="textarea" :rows="10" placeholder="姣忚杈撳叆涓€涓暟瀛?/></el-form-item><div class="inline-controls"><el-select v-model="mode"><el-option label="鎵归噺姹傚拰" value="sum"/><el-option label="鎵归噺鍔犱环" value="markup"/><el-option label="鎵归噺鎵ｇ◣锛堜环绋庡垎绂伙級" value="tax"/></el-select><el-input-number v-if="mode!=='sum'" v-model="rate" :min="0" :max="100"><template #suffix>%</template></el-input-number></div></el-form></div><div class="result-panel"><ResultBox label="澶勭悊鏉℃暟" :value="nums.length"/><ResultBox label="缁撴灉鍚堣" :value="total.toFixed(2)" featured/><el-table :data="rows.slice(0,5)" size="small" max-height="220"><el-table-column prop="鍘熷鍊? label="鍘熷鍊?/><el-table-column prop="璁＄畻缁撴灉" label="璁＄畻缁撴灉"><template #default="s">{{ s.row.璁＄畻缁撴灉.toFixed(2) }}</template></el-table-column></el-table><el-button type="primary" :disabled="!isMember" :icon="Download" @click="exportExcel">瀵煎嚭 Excel</el-button><el-button v-if="!isMember" :icon="Lock" @click="router.push('/upgrade')">鍗囩骇浼氬憳</el-button><p v-if="!isMember" class="formula-note">鍏嶈垂鐗堝彲瀹屾暣棰勮锛涗細鍛樺彲瀵煎嚭 Excel銆?/p></div></div></div></template>
