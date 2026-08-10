# 链算 Pro — 物流商业计算器

基于 Vue 3、Vite、Element Plus 的纯浏览器端商业计算工具。计算记录、主题偏好和公式模板仅存放在当前浏览器的 `localStorage`，不会上传服务器。

## 安装与启动

```bash
npm install
npm run dev
```

浏览器打开终端显示的本地地址。生产构建：

```bash
npm run build
npm run preview
```

## 功能模块

- 基础计算器：四则运算、百分比链式计算、键盘操作、历史记录及复制。
- 物流报价：完整成本、损耗、税率、利润率和阶梯运费计算。
- 工时与工作日：实际工时、加班时长、排除周末的日期统计。
- 真实 IRR：月度 IRR、名义年利率及复利实际年化。
- 物流单位换算：体积、重量、CBM 与台制材积。
- **付费模块**：批量计算的 Excel 导出、自定义公式模板保存。顶部会员开关及“模拟开通会员”仅模拟前端会员状态，无支付接口。
- AI 自然语言计算：通过 Supabase Edge Function `ai-proxy` 调用，API Key 只存在后端环境变量中。

## AI 接口

前端调用 `supabase/functions/ai-proxy`，仓库已提供对应 Edge Function。部署前需在 Supabase Function Secrets 中配置：

- `DEEPSEEK_API_KEY`：必填，DeepSeek API 密钥；也兼容 `OPENAI_API_KEY`。
- `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY`：Supabase 通常会自动注入，必要时手动确认。
- `DEEPSEEK_BASE_URL`：可选，默认 `https://api.deepseek.com`，也兼容 `OPENAI_BASE_URL`。
- `DEEPSEEK_MODEL`：可选，默认 `deepseek-chat`，也兼容 `AI_MODEL`。

禁止把 API Key 写入前端源码或 Vite 环境变量。

## 目录结构

```text
src/
├─ components/       # 独立业务计算模块与通用结果组件
├─ utils/storage.js  # localStorage、复制及金额格式化工具
├─ App.vue           # 页面框架、导航、主题与会员状态
├─ main.js           # 应用入口
└─ styles.css        # 全局商务主题与响应式样式
```

Excel 导出使用 `xlsx` 在浏览器内生成文件；项目不包含后端、数据库、小程序或 App 代码。
