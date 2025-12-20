# 设计文档

## 概述

本设计实现 FishTalk 管理中心的两个新功能模块：**网站表现**（Site Analytics）和**群聊信息**（Chat Viewer）。网站表现模块通过 GraphQL 聚合查询获取业务指标，并使用 Chart.js 绘制数据曲线；群聊信息模块解析 `group_chat` 表的 `dialogues` JSON 字段，以聊天界面风格展示对话内容。

## 架构

```mermaid
flowchart TD
    subgraph Frontend
        A[admin-center.html] --> B[admin-analytics.html]
        A --> C[admin-chat-viewer.html]
        B --> D[admin-analytics.js]
        C --> E[admin-chat-viewer.js]
    end
    
    subgraph API Layer
        D --> F[/api/admin-api.js]
        E --> F
        F --> G[analytics handler]
        F --> H[chat-viewer handler]
    end
    
    subgraph Data Layer
        G --> I[Hasura GraphQL]
        H --> I
        I --> J[(users)]
        I --> K[(group_chat)]
        I --> L[(our_tanks)]
        I --> M[(payment)]
    end
```

## 组件和接口

### 1. 页面组件

| 文件 | 功能 |
|------|------|
| `admin-analytics.html` | 网站表现页面，包含日期选择器、统计卡片和图表区域 |
| `admin-chat-viewer.html` | 群聊信息页面，包含日期选择器和群聊列表 |
| `src/js/admin-analytics.js` | 网站表现页面逻辑 |
| `src/js/admin-chat-viewer.js` | 群聊信息页面逻辑 |

### 2. API 接口

#### 统计数据接口

```
GET /api/admin-api?action=analytics&startDate={ISO}&endDate={ISO}
```

响应：
```json
{
  "success": true,
  "data": {
    "users": {
      "total": 150,
      "anonymous": 80,
      "registered": 70
    },
    "groupChats": 45,
    "ourTanks": 12,
    "payments": 8,
    "timeline": {
      "labels": ["2025-12-18", "2025-12-19", "2025-12-20"],
      "users": [50, 60, 40],
      "groupChats": [15, 18, 12],
      "ourTanks": [4, 5, 3],
      "payments": [2, 4, 2]
    }
  }
}
```

#### 群聊列表接口

```
GET /api/admin-api?action=chat-list&startDate={ISO}&endDate={ISO}&limit=50&offset=0
```

响应：
```json
{
  "success": true,
  "data": {
    "chats": [
      {
        "id": "uuid",
        "topic": "Morning Greetings",
        "created_at": "2025-12-20T08:30:00Z",
        "participant_count": 3,
        "our_tank_name": "Friends Tank",
        "has_user_talk": true
      }
    ],
    "total": 100
  }
}
```

#### 群聊详情接口

```
GET /api/admin-api?action=chat-detail&chatId={uuid}
```

响应：
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "topic": "Morning Greetings",
    "created_at": "2025-12-20T08:30:00Z",
    "user_talk": "Hello everyone!",
    "messages": [
      {
        "fishId": "uuid",
        "fishName": "Nemo",
        "message": "Good morning!",
        "sequence": 1
      }
    ]
  }
}
```

### 3. 后端处理器

| 文件 | 功能 |
|------|------|
| `lib/api_handlers/admin/analytics.js` | 统计数据聚合查询 |
| `lib/api_handlers/admin/chat-list.js` | 群聊列表查询 |
| `lib/api_handlers/admin/chat-detail.js` | 群聊详情查询 |

## 数据模型

### 统计查询 GraphQL

```graphql
# 用户统计
query UserStats($startDate: timestamp!, $endDate: timestamp!) {
  total: users_aggregate(where: {created_at: {_gte: $startDate, _lte: $endDate}}) {
    aggregate { count }
  }
  # 注：匿名用户通过 Supabase Auth 的 is_anonymous 字段判断
  # 需要通过 Supabase Admin API 或在 users 表添加 is_anonymous 字段
}

# 群聊统计
query GroupChatStats($startDate: timestamp!, $endDate: timestamp!) {
  group_chat_aggregate(where: {created_at: {_gte: $startDate, _lte: $endDate}}) {
    aggregate { count }
  }
}

# Our Tank 统计
query OurTankStats($startDate: timestamptz!, $endDate: timestamptz!) {
  our_tanks_aggregate(where: {created_at: {_gte: $startDate, _lte: $endDate}}) {
    aggregate { count }
  }
}

# 支付统计
query PaymentStats($startDate: timestamp!, $endDate: timestamp!) {
  payment_aggregate(where: {created_at: {_gte: $startDate, _lte: $endDate}}) {
    aggregate { count }
  }
}
```

### 群聊对话数据结构

`group_chat.dialogues` 字段存储 JSON 格式的对话内容：

```json
{
  "messages": [
    {
      "fishId": "uuid",
      "fishName": "Nemo",
      "message": "Hello!",
      "sequence": 1
    },
    {
      "fishId": "uuid",
      "fishName": "Dory",
      "message": "Hi there!",
      "sequence": 2
    }
  ]
}
```

### 匿名用户识别

由于 `users` 表没有 `is_anonymous` 字段，需要通过以下方式判断：
1. 查询 Supabase Auth 的用户元数据
2. 或者检查 `email` 字段是否为空/匿名格式

推荐方案：在统计时通过 email 字段判断（匿名用户的 email 通常为空或特定格式）

## 正确性属性

*属性是系统在所有有效执行中应保持为真的特征或行为——本质上是关于系统应该做什么的形式化陈述。属性是人类可读规范和机器可验证正确性保证之间的桥梁。*

### 属性 1: 用户统计一致性
*对于任意* 日期区间查询，返回的匿名用户数加上注册用户数应该等于总用户数
**验证: 需求 2.1, 2.2**

### 属性 2: 群聊统计准确性
*对于任意* 日期区间查询，返回的群聊数应该等于数据库中 `created_at` 在该区间内的 `group_chat` 记录数
**验证: 需求 3.1**

### 属性 3: Our Tank 统计准确性
*对于任意* 日期区间查询，返回的 Our Tank 数应该等于数据库中 `created_at` 在该区间内的 `our_tanks` 记录数
**验证: 需求 4.1**

### 属性 4: 支付统计准确性
*对于任意* 日期区间查询，返回的支付订单数应该等于数据库中 `created_at` 在该区间内的 `payment` 记录数
**验证: 需求 5.1**

### 属性 5: 时间线数据点数量
*对于任意* 大于1天的日期区间，返回的时间线数据点数量应该等于区间内的天数
**验证: 需求 6.1**

### 属性 6: 群聊列表日期过滤
*对于任意* 日期区间查询，返回的群聊列表中每条记录的 `created_at` 都应该在指定的日期区间内
**验证: 需求 7.2**

### 属性 7: 消息顺序正确性
*对于任意* 群聊详情查询，返回的消息列表应该按 `sequence` 字段升序排列
**验证: 需求 7.4**

### 属性 8: 消息内容完整性
*对于任意* 群聊消息，渲染结果应该包含 `fishName`、`message` 和 `sequence` 三个字段的值
**验证: 需求 7.5**

### 属性 9: 用户消息标识
*对于任意* 包含 `user_talk` 的群聊，用户消息应该被正确识别并标记为用户发言
**验证: 需求 8.3**

### 属性 10: 群聊列表项完整性
*对于任意* 群聊列表项，应该包含 `topic`、`created_at` 和参与鱼数量
**验证: 需求 9.1**

### 属性 11: Our Tank 关联显示
*对于任意* 关联了 Our Tank 的群聊，列表项应该显示对应的鱼缸名称
**验证: 需求 9.2**

## 错误处理

| 场景 | 处理方式 |
|------|----------|
| GraphQL 查询失败 | 显示错误提示，提供重试按钮 |
| 日期区间无效 | 前端验证，提示用户选择有效日期 |
| 群聊详情不存在 | 显示"群聊不存在"提示 |
| dialogues JSON 解析失败 | 显示"对话内容解析失败"，记录错误日志 |
| 网络超时 | 显示超时提示，提供重试选项 |

## 测试策略

### 单元测试

使用 Vitest 测试核心逻辑：
- 日期区间计算函数
- 统计数据聚合逻辑
- dialogues JSON 解析函数
- 消息排序函数

### 属性测试

使用 fast-check 进行属性测试，每个属性测试运行至少 100 次迭代：
- 用户统计一致性（匿名+注册=总数）
- 时间线数据点数量与日期区间天数的关系
- 消息列表排序正确性
- 日期过滤准确性

测试标注格式：`**Feature: admin-analytics, Property {number}: {property_text}**`

### 集成测试

- 完整的统计数据查询流程
- 群聊列表分页查询
- 群聊详情展开显示
