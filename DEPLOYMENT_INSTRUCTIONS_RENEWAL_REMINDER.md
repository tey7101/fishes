# 续费提醒系统部署说明

## 已完成的工作

✅ 前端订阅模块已添加到 Profile 页面
✅ CSS 样式已配置
✅ JavaScript 逻辑已实现
✅ Supabase Edge Function 已创建

## 需要手动执行的步骤

由于部署 Supabase Edge Function 和配置定时任务需要访问 Supabase 账户和执行命令行操作，以下步骤需要您手动完成：

### 步骤 1：安装 Supabase CLI（如果尚未安装）

```bash
npm install -g supabase
```

### 步骤 2：登录 Supabase

```bash
supabase login
```

这会打开浏览器让您登录 Supabase 账户。

### 步骤 3：关联项目

```bash
supabase link --project-ref xxeplxorhecwwhtrakzw
```

根据提示输入数据库密码。

### 步骤 4：部署 Edge Function

```bash
supabase functions deploy renewal-reminder
```

部署成功后，您会看到函数的 URL。

### 步骤 5：配置定时任务

#### 选项 A：使用 pg_cron（推荐）

1. 访问 Supabase Dashboard: https://app.supabase.com
2. 选择您的项目
3. 进入 **Database** → **Extensions**
4. 启用以下扩展：
   - `pg_cron`
   - `http` (pg_net)

5. 进入 **SQL Editor**，执行以下 SQL：

```sql
-- 创建触发函数
CREATE OR REPLACE FUNCTION trigger_renewal_reminder()
RETURNS void AS $$
DECLARE
  service_key text;
BEGIN
  -- 从环境变量获取 service role key
  -- 注意：您需要替换为实际的 service role key
  service_key := 'YOUR_SERVICE_ROLE_KEY_HERE';
  
  PERFORM net.http_post(
    url := 'https://xxeplxorhecwwhtrakzw.supabase.co/functions/v1/renewal-reminder',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || service_key,
      'Content-Type', 'application/json'
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 创建定时任务（每天早上 9 点 UTC，北京时间下午 5 点）
SELECT cron.schedule(
  'daily-renewal-reminder',
  '0 9 * * *',
  'SELECT trigger_renewal_reminder();'
);

-- 查看已创建的定时任务
SELECT * FROM cron.job;
```

**重要**：将 `YOUR_SERVICE_ROLE_KEY_HERE` 替换为您的实际 Service Role Key。
可以在 Supabase Dashboard → Settings → API 中找到。

#### 选项 B：使用 GitHub Actions

如果您的项目在 GitHub 上，可以使用 GitHub Actions：

1. 在项目根目录创建 `.github/workflows/renewal-reminder.yml`：

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

2. 在 GitHub 仓库设置中添加 Secret：
   - 进入 Settings → Secrets and variables → Actions
   - 添加 `SUPABASE_SERVICE_ROLE_KEY`

### 步骤 6：测试系统

#### 测试前端

1. 启动开发服务器：
```bash
npm run dev
```

2. 访问 http://localhost:3000/profile.html
3. 登录后检查是否显示订阅模块
4. 测试取消订阅功能

#### 测试 Edge Function

手动调用函数：

```bash
curl -X POST \
  https://xxeplxorhecwwhtrakzw.supabase.co/functions/v1/renewal-reminder \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY"
```

#### 创建测试数据

在 Supabase SQL Editor 中执行：

```sql
-- 创建一个 7 天后到期的测试订阅
INSERT INTO user_subscriptions (user_id, plan, is_active, current_period_end, payment_provider)
VALUES (
  'YOUR_USER_ID',  -- 替换为实际用户 ID
  'plus',
  true,
  NOW() + INTERVAL '7 days',
  'stripe'
);
```

然后再次调用 Edge Function，检查是否收到邮件。

### 步骤 7：配置邮件服务（可选，生产环境推荐）

默认使用 Supabase 内置邮件服务，但有限制。生产环境建议配置自定义 SMTP：

1. 进入 Supabase Dashboard
2. Authentication → Email Templates
3. 配置 SMTP 设置

推荐服务：
- **Resend**：免费 3000 封/月，易于集成
- **SendGrid**：免费 100 封/天
- **Gmail**：免费 500 封/天

## 验证清单

- [ ] Supabase CLI 已安装
- [ ] Edge Function 已部署
- [ ] 定时任务已配置
- [ ] 前端订阅模块正常显示
- [ ] 取消订阅功能正常工作
- [ ] 测试邮件发送成功
- [ ] 定时任务按时执行

## 监控

### 查看 Edge Function 日志

Supabase Dashboard → Edge Functions → renewal-reminder → Logs

### 查看定时任务执行历史

```sql
SELECT * FROM cron.job_run_details 
ORDER BY start_time DESC 
LIMIT 10;
```

## 故障排查

### 邮件未收到

1. 检查垃圾邮件文件夹
2. 查看 Edge Function 日志
3. 确认 `current_period_end` 在 3-7 天范围内
4. 检查用户邮箱是否正确

### 定时任务未执行

1. 确认 pg_cron 扩展已启用
2. 检查 `cron.job` 表
3. 查看 `cron.job_run_details` 表的错误信息

## 相关文档

- [完整配置指南](docs/SUBSCRIPTION_RENEWAL_REMINDER_SETUP.md)
- [Edge Function README](supabase/functions/renewal-reminder/README.md)

## 支持

如有问题，请查看：
1. Supabase 文档：https://supabase.com/docs
2. Edge Functions 指南：https://supabase.com/docs/guides/functions
3. pg_cron 文档：https://github.com/citusdata/pg_cron


