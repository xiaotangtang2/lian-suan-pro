<script setup>
import BasicCalculator from '../components/BasicCalculator.vue'
import LogisticsCalculator from '../components/LogisticsCalculator.vue'
import WorkdayCalculator from '../components/WorkdayCalculator.vue'
import IrrCalculator from '../components/IrrCalculator.vue'
import BatchCalculator from '../components/BatchCalculator.vue'
import FormulaTemplates from '../components/FormulaTemplates.vue'
import UnitConverter from '../components/UnitConverter.vue'
import AiCalculator from '../components/AiCalculator.vue'
</script>

<template>
  <div class="test-page">
    <h1>模块自动化测试页（临时）</h1>
    <section id="test-basic" class="test-section"><h2>1 基础计算</h2><BasicCalculator /></section>
    <section id="test-logistics" class="test-section"><h2>2 物流报价</h2><LogisticsCalculator /></section>
    <section id="test-workday" class="test-section"><h2>3 工时工作日</h2><WorkdayCalculator /></section>
    <section id="test-irr" class="test-section"><h2>4 真实 IRR</h2><IrrCalculator /></section>
    <section id="test-batch" class="test-section"><h2>5 批量计算</h2><BatchCalculator is-member /></section>
    <section id="test-formula" class="test-section"><h2>6 公式模板</h2><FormulaTemplates is-member /></section>
    <section id="test-unit" class="test-section"><h2>7 单位换算</h2><UnitConverter /></section>
    <section id="test-ai" class="test-section"><h2>8 AI 计算</h2><AiCalculator is-member /></section>
  </div>
</template>

<style scoped>
.test-page { max-width: 1200px; margin: 0 auto; padding: 24px; }
.test-page h1 { margin: 0 0 24px; }
.test-section { border: 1px solid #d9d9d9; border-radius: 12px; padding: 16px; margin-bottom: 24px; }
.test-section h2 { margin: 0 0 12px; }
</style>