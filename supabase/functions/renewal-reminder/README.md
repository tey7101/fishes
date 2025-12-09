# Renewal Reminder Edge Function

这个 Supabase Edge Function 用于发送订阅续费提醒邮件。

## 功能

- 每天自动检查即将到期的订阅（3-7天内）
- 向用户发送续费提醒邮件
- 使用 Supabase 内置邮件服务（免费额度内）

## 部署

### 前提条件

1. 安装 Supabase CLI：
```bash
npm install -g supabase
```

2. 登录 Supabase：
```bash
supabase login
```

3. 关联项目：
```bash
supabase link --project-ref YOUR_PROJECT_ID
```

### 部署 Edge Function

```bash
supabase functions deploy renewal-reminder
```

### 设置环境变量

Edge Function 会自动使用以下环境变量：
- `SUPABASE_URL` - 自动注入
- `SUPABASE_SERVICE_ROLE_KEY` - 自动注入

## 配置定时任务

### 方法 1：使用 pg_cron 扩展

1. 在 Supabase Dashboard → Database → Extensions 中启用 `pg_cron`

2. 在 SQL Editor 中执行：

```sql
-- 创建调用 Edge Function 的函数
CREATE OR REPLACE FUNCTION trigger_renewal_reminder()
RETURNS void AS $$
BEGIN
  PERFORM net.http_post(
    url := 'https://YOUR_PROJECT_ID.supabase.co/functions/v1/renewal-reminder',
    headers := jsonb_build_object(
      'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY',
      'Content-Type', 'application/json'
    )
  );
END;
$$ LANGUAGE plpgsql;

-- 创建定时任务（每天早上 9 点执行）
SELECT cron.schedule(
  'daily-renewal-reminder',
  '0 9 * * *',
  'SELECT trigger_renewal_reminder();'
);
```

### 方法 2：使用外部 Cron 服务

使用 [cron-job.org](https://cron-job.org) 或类似服务，配置每天调用：

```
URL: https://YOUR_PROJECT_ID.supabase.co/functions/v1/renewal-reminder
Method: POST
Headers: 
  Authorization: Bearer YOUR_SERVICE_ROLE_KEY
Schedule: 0 9 * * * (每天早上 9 点)
```

## 测试

手动调用 Edge Function：

```bash
curl -X POST \
  https://YOUR_PROJECT_ID.supabase.co/functions/v1/renewal-reminder \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY"
```

## 邮件模板

邮件内容包括：
- 订阅计划名称
- 剩余天数
- 续费日期
- 管理订阅链接

## 注意事项

1. Supabase 内置邮件服务有发送限制（每小时限制）
2. 生产环境建议配置自定义 SMTP
3. 确保 `user_subscriptions` 表有正确的 `current_period_end` 字段
4. 邮件可能进入垃圾邮件文件夹，建议配置 SPF/DKIM


