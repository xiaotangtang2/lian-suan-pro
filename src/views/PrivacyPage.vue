<template>
  <main class="policy">
    <router-link to="/">返回首页</router-link>
    <p class="eyebrow">链算 PRO · 使用说明</p>
    <h1>隐私与会员说明</h1>
    <p class="intro">我们只收集提供服务所需的最少信息，并尽量让计算内容留在你的设备上。</p>

    <section>
      <h2>数据使用</h2>
      <p>基础计算历史、主题和公式模板优先保存在你的浏览器。我们不会出售你的计算数据。</p>
    </section>
    <section>
      <h2>AI 计算</h2>
      <p>仅当你主动提交自然语言问题时，内容会发送到 AI 服务用于生成计算结果。</p>
    </section>
    <section>
      <h2>会员审核</h2>
      <p>完成支付后可提交开通申请。无需上传订单截图或填写订单号；管理员会在工作日 2 小时内核验到账。审核通过后自动开通，驳回时会说明原因并允许重新提交。</p>
    </section>
  </main>
</template>

<style scoped>
.policy{max-width:760px;margin:44px auto;padding:44px;line-height:1.9;background:var(--card);border:1px solid var(--line);border-radius:24px;box-shadow:var(--shadow)}
.policy>a{color:var(--brand);text-decoration:none;font-weight:700;font-size:14px}.policy>a::before{content:'← ';}.eyebrow{margin:36px 0 8px;color:var(--brand);font-size:12px;font-weight:800;letter-spacing:.12em}.policy h1{margin:0;font-size:36px;letter-spacing:-.04em}.intro{margin:14px 0 30px;font-size:16px;color:var(--muted)}
.policy section{padding:22px 0;border-top:1px solid var(--line)}.policy h2{margin:0 0 8px;font-size:18px}.policy section p{margin:0;color:var(--muted)}
@media(max-width:640px){.policy{margin:0;padding:32px 22px;border:none;border-radius:0;box-shadow:none;min-height:100vh}.policy h1{font-size:30px}}
</style>
