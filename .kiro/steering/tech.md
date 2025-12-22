# 技术栈

## 运行环境

- **Node.js**: >= 20.0.0
- **包管理器**: npm

## 前端技术

- **框架**: 原生 JavaScript（无框架依赖）
- **UI**: 原生 HTML/CSS
- **AI 推理**: ONNX Runtime Web（浏览器端神经网络）
- **认证**: Supabase Auth
- **绘图**: Canvas API

## 后端技术

- **运行时**: Node.js
- **部署**: Vercel Serverless Functions / Railway
- **数据库**: PostgreSQL (Hasura)
- **数据访问**: Hasura GraphQL
- **图片存储**: 七牛云 CDN

## 主要依赖

```json
{
  "@supabase/supabase-js": "用户认证",
  "stripe": "支付处理",
  "@paypal/paypal-server-sdk": "PayPal 支付",
  "qiniu": "七牛云存储",
  "node-fetch": "HTTP 请求",
  "formidable": "文件上传处理",
  "dotenv": "环境变量"
}
```

## 开发依赖

- **测试**: Vitest
- **GraphQL**: @graphql-codegen/cli

## 常用命令

```bash
# 启动开发服务器
npm run dev

# 启动生产服务器
npm start

# 运行测试
npm test

# 运行单个测试文件
npm run test:affiliate

# 测试后端连接
npm run test:hasura
npm run test:api
npm run test:all

# 检查环境变量
npm run check:env

# 下载 GraphQL Schema
npm run download:schema
```

## 环境变量

关键环境变量配置在 `.env.local` 文件中：

- `HASURA_GRAPHQL_ENDPOINT` - Hasura GraphQL 端点
- `HASURA_ADMIN_SECRET` - Hasura 管理密钥
- `SUPABASE_URL` / `SUPABASE_ANON_KEY` - Supabase 配置
- `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` - Stripe 支付
- `PAYPAL_CLIENT_ID` / `PAYPAL_CLIENT_SECRET` - PayPal 支付
- `QINIU_*` - 七牛云存储配置
- `COZE_*` - Coze AI 聊天配置

## 部署平台

- **主要**: Vercel（Serverless Functions）
- **备选**: Railway（完整 Node.js 服务器）
