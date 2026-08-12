# 链算 Pro

基于 Vue 3、Vite 和 Element Plus 开发的物流商业计算网站。

## 技术栈

- Vue 3
- Vite
- Vue Router
- Element Plus
- Supabase
- SheetJS（Excel 导出）

## 本地开发

要求已安装 Node.js 18 或更高版本。

```powershell
Set-Location "D:\CodexProjects\MyWeb"
npm.cmd install
npm.cmd run dev
```

浏览器打开终端输出的本地地址，默认通常为 `http://localhost:5173`。

## 环境变量

在项目根目录创建 `.env`：

```env
VITE_SUPABASE_URL=https://你的项目.supabase.co
VITE_SUPABASE_ANON_KEY=你的匿名公钥
```

前端只能使用 Supabase 匿名公钥。服务端密钥和 AI API Key 必须保存在 Supabase Function Secrets 中，不能写进前端源码或 `.env`。

## 构建

```powershell
npm.cmd run build
```

构建结果生成在 `dist/`。本地检查生产构建：

```powershell
npm.cmd run preview
```

## 部署

### Vercel

项目已包含 `vercel.json`。导入代码仓库后设置以下环境变量：

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

构建命令使用 `npm run build`，输出目录使用 `dist`。

### 静态服务器

将 `dist/` 内的全部文件上传到网站根目录。由于项目使用 Vue Router History 模式，服务器需要将不存在的路径回退到 `index.html`。

## Supabase

数据库初始化脚本：

- `supabase_schema.sql`
- `supabase_membership.sql`
- `supabase_username_login.sql`

后续数据库变更位于 `supabase/migrations/`。其中付款凭证使用私有 Storage bucket，提交前会校验图片类型及 5MB 大小限制，管理员通过短时签名链接查看。

会员体系仅包含月度和年度两个付费周期，两者均为同一 PRO 等级且权益完全一致；年度价格提供约 18% 优惠。第一版不提供季度套餐。

Edge Functions：

- `supabase/functions/ai-proxy`：AI 计算代理
- `supabase/functions/send-contact`：联系表单
- `supabase/functions/notify-admin`：会员订单通知

部署 Edge Functions 后，在 Supabase 控制台配置其所需 Secrets。

## 项目结构

```text
src/
├─ components/   业务组件和计算器模块
├─ config/       前端配置
├─ lib/          Supabase 与计算逻辑
├─ router/       页面路由
├─ stores/       登录状态和主题状态
├─ utils/        通用工具
├─ views/        页面组件
├─ App.vue       应用框架
└─ main.js       应用入口

supabase/
└─ functions/    Supabase Edge Functions

public/          静态资源
```

## 常用命令

```text
npm run dev       启动开发服务器
npm run build     生成生产版本
npm run preview   预览生产版本
```
