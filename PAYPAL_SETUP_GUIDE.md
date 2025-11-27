# PayPal 支付测试快速设置指南

## 🚀 快速开始

### 1. 创建 PayPal 开发者账号
1. 访问 [PayPal 开发者控制台](https://developer.paypal.com/)
2. 使用你的 PayPal 账号登录
3. 创建一个新的应用程序

### 2. 获取 API 凭据
1. 在开发者控制台，点击 "Create App"
2. 选择 "Sandbox" 环境
3. 复制 `Client ID` 和 `Client Secret`

### 3. 配置环境变量
1. 复制 `.env.example` 为 `.env.local`
2. 填入你的 PayPal 凭据：

```bash
# 复制文件
cp .env.example .env.local

# 编辑 .env.local 文件，填入真实的值：
PAYPAL_MODE=sandbox
PAYPAL_CLIENT_ID=你的_CLIENT_ID
PAYPAL_CLIENT_SECRET=你的_CLIENT_SECRET
HASURA_GRAPHQL_ENDPOINT=你的_HASURA_端点
HASURA_ADMIN_SECRET=你的_HASURA_密钥
APP_DOMAIN=http://localhost:3000
```

### 4. 创建测试账号
1. 在 PayPal 开发者控制台，点击 "Accounts"
2. 创建一个 "Personal" 类型的测试账号（买家账号）
3. 记录邮箱和密码

### 5. 开始测试
1. 启动开发服务器：`npm run dev`
2. 打开测试页面：`http://localhost:3000/test-paypal-simple.html`
3. 按照页面指引进行测试

## 📝 测试流程

### 使用简化测试页面 (`test-paypal-simple.html`)

1. **创建订阅**
   - 输入测试用户ID（如：test-user-123）
   - 选择订阅计划
   - 点击"开始测试订阅"

2. **PayPal 授权**
   - 点击返回的 PayPal 链接
   - 使用测试账号登录
   - 完成授权流程

3. **同步订阅状态**
   - 从返回的 URL 中复制 `subscription_id`
   - 在"手动同步"区域粘贴
   - 点击"同步订阅状态"

4. **验证结果**
   - 使用"检查状态"功能
   - 确认订阅已激活

## 🔧 常见问题

### 1. API 调用失败
- 检查 `.env.local` 文件是否正确配置
- 确认 PayPal 凭据是否有效
- 查看浏览器控制台的错误信息

### 2. 授权后无法同步
- 确保复制了完整的 `subscription_id`
- 检查用户ID是否一致
- 查看服务器日志

### 3. 测试账号问题
- 确保使用的是 Sandbox 测试账号
- 检查账号是否有足够的测试余额
- 尝试创建新的测试账号

## 🎯 API 端点

简化测试页面使用以下 API 端点：

- `POST /api/payment?action=paypal-create-subscription` - 创建订阅
- `POST /api/payment?action=paypal-sync-subscription` - 同步状态
- `POST /api/payment?action=manage-subscription` - 管理订阅

## 📚 有用链接

- [PayPal 开发者控制台](https://developer.paypal.com/)
- [PayPal Sandbox 测试指南](https://developer.paypal.com/docs/api-basics/sandbox/)
- [PayPal 订阅 API 文档](https://developer.paypal.com/docs/subscriptions/)

## 💡 提示

- 使用 `test-paypal-simple.html` 进行快速测试
- 原始的 `test-paypal-subscription.html` 功能更完整但较复杂
- 测试完成后记得清理测试数据
- 生产环境需要将 `PAYPAL_MODE` 改为 `production`
