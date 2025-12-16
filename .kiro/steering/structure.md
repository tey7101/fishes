# 项目结构

## 目录概览

```
fish_art/
├── api/                    # Vercel Serverless API 路由入口
├── lib/                    # 后端核心库和处理器
├── src/                    # 前端源代码
├── public/                 # 公共静态资源
├── scripts/                # 工具脚本
├── database/               # 数据库迁移脚本
├── docs/                   # 项目文档
├── tests/                  # 测试文件
└── *.html                  # 页面文件（根目录）
```

## API 层结构

### `/api/` - API 路由入口

每个文件是一个 Vercel Serverless Function 入口，通过 `action` 查询参数路由到具体处理器。

```
api/
├── fish-api.js             # 鱼相关操作（list/submit/upload/delete 等）
├── payment-api.js          # 支付相关（Stripe/PayPal）
├── affiliate-api.js        # 联盟营销
├── message-api.js          # 消息系统
├── coze-api.js             # AI 聊天
├── graphql.js              # GraphQL 代理
├── admin/                  # 管理后台 API
├── profile/                # 用户资料 API
└── vote/                   # 投票 API
```

### `/lib/api_handlers/` - 实际业务处理器

```
lib/api_handlers/
├── fish/                   # 鱼操作处理器
│   ├── list.js
│   ├── submit.js
│   ├── upload.js
│   ├── delete.js
│   └── chat/               # AI 聊天相关
├── payment/                # 支付处理器
│   ├── webhook.js          # Stripe webhook
│   └── paypal-webhook.js   # PayPal webhook
├── middleware/             # 中间件
│   ├── auth.js             # 认证中间件
│   └── admin-auth.js       # 管理员认证
└── ...
```

### `/lib/` - 核心库

```
lib/
├── hasura.js               # Hasura GraphQL 客户端
├── redis.js                # Redis 客户端
├── stripe-config.js        # Stripe 配置
├── paypal-config.js        # PayPal 配置
├── coze-client.js          # Coze AI 客户端
└── qiniu/                  # 七牛云上传
```

## 前端结构

### `/src/js/` - JavaScript 模块

```
src/js/
├── app.js                  # 主绘画页面逻辑
├── tank.js                 # 鱼缸动画和显示
├── rank.js                 # 排行榜逻辑
├── fish-utils.js           # 共享工具函数
├── supabase-init.js        # Supabase 认证初始化
├── auth-ui.js              # 认证 UI 组件
├── membership.js           # 会员功能
├── profile.js              # 个人中心
└── ...
```

### `/src/css/` - 样式文件

```
src/css/
├── style.css               # 主样式
├── cute-game-style.css     # 游戏风格主题
├── auth-ui.css             # 认证 UI 样式
├── membership.css          # 会员页面样式
└── ...
```

## 页面文件

HTML 页面直接放在根目录：

- `index.html` - 首页/绘画页
- `tank.html` - 鱼缸页
- `rank.html` - 排行榜
- `login.html` - 登录页
- `profile.html` - 个人中心
- `membership.html` - 会员页
- `admin-*.html` - 管理后台页面
- `test-*.html` - 测试页面

## 配置文件

- `package.json` - 项目依赖和脚本
- `vercel.json` - Vercel 部署配置
- `railway.toml` - Railway 部署配置
- `.env.local` - 环境变量（不提交到 Git）
- `codegen.json` - GraphQL 代码生成配置

## API 路由模式

API 使用 `action` 参数进行路由分发：

```
GET /api/fish-api?action=list
POST /api/fish-api?action=submit
POST /api/fish-api?action=upload
DELETE /api/fish-api?action=delete&fishId=xxx
```

这种模式减少了 Serverless Function 的数量，同时保持了清晰的 API 结构。
