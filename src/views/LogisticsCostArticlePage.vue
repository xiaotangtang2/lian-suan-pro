<script setup>
import { RouterLink } from 'vue-router'
</script>

<template>
  <article class="article-page">
    <header class="article-hero">
      <p class="eyebrow">物流报价指南 · 链算 Pro</p>
      <h1>物流成本报价计算器怎么用？</h1>
      <p class="lead">报价不能只看进货价。把运费、包装、损耗、税费和目标利润率一起算进去，才能知道每一单真正应该卖多少钱。</p>
      <RouterLink class="article-cta" to="/tools/logistics-quote/">打开物流成本报价计算器 →</RouterLink>
    </header>

    <section class="article-content">
      <h2>一、物流报价为什么容易算错？</h2>
      <p>很多报价只把进货成本和基础运费相加，却漏掉包装费、货损、增值税和阶梯运费。这样算出来的价格看起来有利润，实际成交后却可能被隐性成本吃掉。</p>

      <h2>二、报价需要准备哪些数据？</h2>
      <ul>
        <li><strong>进货成本：</strong>商品或原材料的采购单价。</li>
        <li><strong>基础运费：</strong>这一单固定产生的干线、支线或快递费用。</li>
        <li><strong>包装费：</strong>纸箱、托盘、填充物和人工包装成本。</li>
        <li><strong>货物重量与体积重：</strong>系统会采用两者中更高的计费重量。</li>
        <li><strong>损耗率、增值税率和目标利润率：</strong>用于还原真实成本并倒推出建议报价。</li>
      </ul>

      <h2>三、一个简单的报价案例</h2>
      <p>假设一批货的进货成本是 1,000 元，基础运费 120 元，包装费 30 元，损耗率 2%，增值税率 13%，目标利润率 20%。计算器会先合并采购、运输和包装成本，再把损耗、税费与利润目标纳入报价公式，给出建议对外报价、总成本、税费、毛利和毛利率。</p>
      <p>这里最容易踩坑的是“利润率”和“加价率”不是一回事。直接把成本乘以 1.2，并不等于最终毛利率 20%，因为含税售价和税费会改变分母。</p>

      <h2>四、体积重和阶梯运费怎么处理？</h2>
      <p>物流行业经常同时存在实重和体积重。若货物轻但体积大，承运商通常按体积重收费。报价时应使用更高的计费重量，并把不同重量区间的阶梯运费单独列出，避免超过某个区间后报价突然失真。</p>
      <p>在 <RouterLink to="/tools/logistics-quote/">物流成本报价计算器</RouterLink> 中，可以添加多个阶梯区间，查看当前计费重量命中的运费档位；如果区间有缺口或重量超过最高档，页面会给出提示。</p>

      <h2>五、实操建议</h2>
      <ol>
        <li>先记录真实成交过的运费和包装成本，不要只用估算数。</li>
        <li>把实重、体积重和阶梯运费分开维护，定期更新承运商报价。</li>
        <li>报价前同时检查建议售价、总成本、税费和毛利率。</li>
        <li>对高损耗、低毛利或大体积商品，留出风险缓冲，不要把利润目标卡得过死。</li>
      </ol>

      <div class="article-next">
        <strong>现在就算一笔真实报价</strong>
        <p>输入你的成本参数，快速查看建议售价和每单利润。</p>
        <RouterLink to="/tools/logistics-quote/">免费试算物流报价 →</RouterLink>
      </div>
    </section>
  </article>
</template>

<style scoped>
.article-page { max-width: 960px; margin: 0 auto; padding: 56px 24px 80px; color: var(--text, #172033); }
.article-hero { max-width: 760px; margin-bottom: 48px; }
.eyebrow { color: #168b72; font-size: 13px; letter-spacing: .12em; text-transform: uppercase; }
h1 { margin: 12px 0 20px; font-size: clamp(32px, 6vw, 56px); line-height: 1.15; }
.lead { color: #5d6b80; font-size: 18px; line-height: 1.8; }
.article-cta, .article-next a { color: #fff; background: #168b72; border-radius: 8px; display: inline-block; padding: 12px 18px; text-decoration: none; margin-top: 12px; }
.article-content { max-width: 760px; }
h2 { margin: 38px 0 12px; font-size: 26px; }
p, li { color: #536176; line-height: 1.9; }
li { margin: 8px 0; }
.article-content a { color: #168b72; }
.article-next { margin-top: 48px; padding: 24px; border: 1px solid #dce8e3; border-radius: 12px; background: #f4faf7; }
.article-next strong { font-size: 20px; }
.article-next p { margin: 8px 0; }
</style>
