# 订阅续费提醒系统配置指南

本指南介绍如何配置和部署订阅续费提醒邮件系统。

## 系统概述

续费提醒系统由以下部分组成：

1. **前端订阅模块**：在 Profile 页面显示订阅信息和取消按钮
2. **Edge Function**：Supabase 云函数，用于发送提醒邮件
3. **定时任务**：每天自动检查即将到期的订阅

## 第一步：部署 Edge Function

### 1. 安装 Supabase CLI

```bash
npm install -g supabase
```

### 2. 登录并关联项目

```bash
# 登录
supabase login

# 关联项目
supabase link --project-ref xxeplxorhecwwhtrakzw
```

### 3. 部署函数

```bash
supabase functions deploy renewal-reminder
```

### 4. 测试函数

```bash
curl -X POST \
  https://xxeplxorhecwwhtrakzw.supabase.co/functions/v1/renewal-reminder \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY"
```

## 第二步：配置定时任务

### 方案 A：使用 pg_cron（推荐）

1. 在 Supabase Dashboard 启用扩展：
   - 进入 Database → Extensions
   - 搜索并启用 `pg_cron`
   - 搜索并启用 `http` (pg_net)

2. 在 SQL Editor 中执行以下 SQL：

```sql
-- 创建触发函数
CREATE OR REPLACE FUNCTION trigger_renewal_reminder()
RETURNS void AS $$
BEGIN
  PERFORM net.http_post(
    url := 'https://xxeplxorhecwwhtrakzw.supabase.co/functions/v1/renewal-reminder',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
      'Content-Type', 'application/json'
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 创建定时任务（每天早上 9 点 UTC）
SELECT cron.schedule(
  'daily-renewal-reminder',
  '0 9 * * *',
  'SELECT trigger_renewal_reminder();'
);

-- 查看已创建的定时任务
SELECT * FROM cron.job;
```

### 方案 B：使用外部 Cron 服务

如果 pg_cron 不可用，可以使用外部服务：

#### 使用 cron-job.org

1. 访问 https://cron-job.org
2. 注册账号
3. 创建新任务：
   - Title: FishTalk Renewal Reminder
   - URL: `https://xxeplxorhecwwhtrakzw.supabase.co/functions/v1/renewal-reminder`
   - Method: POST
   - Headers: `Authorization: Bearer YOUR_SERVICE_ROLE_KEY`
   - Schedule: `0 9 * * *`

#### 使用 GitHub Actions

创建 `.github/workflows/renewal-reminder.yml`：

```yaml
name: Daily Renewal Reminder

on:
  schedule:
    - cron: '0 9 * * *'  # 每天 UTC 9:00
  workflow_dispatch:  # 允许手动触发

jobs:
  send-reminders:
    runs-on: ubuntu-latest
    steps:
      - name: Call Supabase Function
        run: |
          curl -X POST \
            https://xxeplxorhecwwhtrakzw.supabase.co/functions/v1/renewal-reminder \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}"
```

## 第三步：配置邮件服务

### 使用 Supabase 内置邮件（开发/小规模）

默认已启用，无需额外配置。限制：
- 每小时有发送限制
- 邮件可能进入垃圾箱

### 配置自定义 SMTP（生产环境推荐）

1. 进入 Supabase Dashboard
2. Authentication → Email Templates
3. 配置 SMTP 设置：

```
Host: smtp.gmail.com
Port: 587
Username: your-email@gmail.com
Password: your-app-password
Sender: FishTalk <noreply@fishtalk.app>
```

推荐的 SMTP 服务：
- **Gmail**：免费，每天 500 封
- **SendGrid**：免费 100 封/天
- **Resend**：免费 3000 封/月
- **Mailgun**：免费 5000 封/月

## 第四步：自定义邮件模板

在 `supabase/functions/renewal-reminder/index.ts` 中修改邮件内容：

```typescript
html: `
  <!DOCTYPE html>
  <html>
  <head>
    <style>
      body { font-family: Arial, sans-serif; }
      .container { max-width: 600px; margin: 0 auto; padding: 20px; }
      .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; }
      .content { padding: 20px; background: #f9f9f9; }
      .button { display: inline-block; padding: 12px 24px; background: #667eea; color: white; text-decoration: none; border-radius: 8px; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>🐟 FishTalk.app</h1>
      </div>
      <div class="content">
        <h2>Subscription Renewal Reminder</h2>
        <p>Hello,</p>
        <p>Your <strong>${sub.plan}</strong> subscription will automatically renew in <strong>${daysUntilRenewal} days</strong>.</p>
        <p>Renewal date: <strong>${new Date(sub.current_period_end).toLocaleDateString()}</strong></p>
        <p>If you wish to cancel, please visit your profile page.</p>
        <p style="text-align: center; margin: 30px 0;">
          <a href="https://fishtalk.app/profile.html" class="button">Manage Subscription</a>
        </p>
        <p>Thank you for using FishTalk.app!</p>
      </div>
    </div>
  </body>
  </html>
`
```

## 第五步：测试

### 测试前端订阅模块

1. 登录网站
2. 访问 Profile 页面
3. 检查订阅模块是否显示
4. 测试取消订阅功能

### 测试邮件发送

1. 创建测试订阅（7天后到期）：

```sql
INSERT INTO user_subscriptions (user_id, plan, is_active, current_period_end)
VALUES (
  'YOUR_USER_ID',
  'plus',
  true,
  NOW() + INTERVAL '7 days'
);
```

2. 手动触发 Edge Function：

```bash
curl -X POST \
  https://xxeplxorhecwwhtrakzw.supabase.co/functions/v1/renewal-reminder \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY"
```

3. 检查邮箱（包括垃圾邮件文件夹）

## 监控和维护

### 查看定时任务状态

```sql
-- 查看所有定时任务
SELECT * FROM cron.job;

-- 查看任务执行历史
SELECT * FROM cron.job_run_details 
ORDER BY start_time DESC 
LIMIT 10;
```

### 查看 Edge Function 日志

1. 进入 Supabase Dashboard
2. Edge Functions → renewal-reminder
3. 查看 Logs 标签

### 删除定时任务

```sql
SELECT cron.unschedule('daily-renewal-reminder');
```

## 故障排查

### 邮件未发送

1. 检查 Edge Function 日志
2. 确认 `current_period_end` 字段格式正确
3. 检查邮件服务配置
4. 查看垃圾邮件文件夹

### 定时任务未执行

1. 检查 `cron.job_run_details` 表
2. 确认 pg_cron 扩展已启用
3. 检查时区设置（pg_cron 使用 UTC）

### 邮件进入垃圾箱

1. 配置自定义 SMTP
2. 设置 SPF 记录
3. 设置 DKIM 签名
4. 避免使用敏感词汇

## 成本估算

- **Supabase Edge Function**：免费额度内（每月 500K 次调用）
- **Supabase 内置邮件**：免费，有限制
- **自定义 SMTP**：
  - Gmail: 免费 500 封/天
  - SendGrid: 免费 100 封/天
  - Resend: 免费 3000 封/月

假设 100 个付费用户：
- 每天检查：1 次 Edge Function 调用
- 每月邮件：约 200 封（每个用户 2 次提醒）
- **总成本：$0**（在免费额度内）

## 相关文件

- `supabase/functions/renewal-reminder/index.ts` - Edge Function 代码
- `profile.html` - 订阅模块 HTML
- `src/css/profile.css` - 订阅模块样式
- `src/js/profile.js` - 订阅模块逻辑




