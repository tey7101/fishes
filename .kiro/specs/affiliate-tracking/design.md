# 设计文档 - 联盟推广者追踪系统

## 概述

本功能为 Fish Art 平台添加联盟推广者（Affiliate）追踪系统。推广者是一种特殊的会员类型，拥有与 Premium 相同的权限，同时具备专属推广码。系统自动追踪通过推广链接产生的注册和付费，便于后续佣金结算。

## 架构

```
┌─────────────────────────────────────────────────────────────┐
│                      前端层                                  │
├─────────────────────────────────────────────────────────────┤
│  index.html          │  affiliate-dashboard.html            │
│  (推广码捕获)         │  (推广者面板)                         │
│                      │                                      │
│  admin-affiliates.html                                      │
│  (管理员管理推广者)                                          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      API层                                   │
├─────────────────────────────────────────────────────────────┤
│  api/affiliate-api.js                                       │
│  - 推广者管理                                               │
│  - 统计数据查询                                              │
│  - 数据导出                                                  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    数据库层 (Hasura/PostgreSQL)              │
├─────────────────────────────────────────────────────────────┤
│  member_types (添加 affiliate 类型)                         │
│  users (添加 referral_code, referred_by 字段)               │
│  payment (添加 affiliate_id 字段)                           │
└─────────────────────────────────────────────────────────────┘
```

## 组件和接口

### 1. 数据库修改（无需新建表）

#### member_types 表添加推广者类型
```sql
INSERT INTO member_types (id, name, can_group_chat, can_promote_owner, can_self_talk, 
  lead_topic_frequency, promote_owner_frequency, draw_fish_limit, add_to_my_tank_limit, 
  group_chat_daily_limit)
SELECT 'affiliate', 'Affiliate', can_group_chat, can_promote_owner, can_self_talk,
  lead_topic_frequency, promote_owner_frequency, draw_fish_limit, add_to_my_tank_limit,
  group_chat_daily_limit
FROM member_types WHERE id = 'premium';
```

#### users 表添加字段
```sql
-- 推广码（推广者专用，唯一）
ALTER TABLE users ADD COLUMN referral_code VARCHAR(20) UNIQUE;

-- 推荐人ID（被推荐用户记录来源）
ALTER TABLE users ADD COLUMN referred_by VARCHAR(255) REFERENCES users(id);

-- 佣金比例（推广者专用）
ALTER TABLE users ADD COLUMN commission_rate DECIMAL(5,2) DEFAULT 10.00;
```

#### payment 表添加字段
```sql
-- 关联推广者ID
ALTER TABLE payment ADD COLUMN affiliate_id VARCHAR(255) REFERENCES users(id);
```

### 2. API 接口设计

#### api/affiliate-api.js

| Action | Method | 描述 | 权限 |
|--------|--------|------|------|
| `create` | POST | 将用户设为推广者（生成推广码） | 管理员 |
| `list` | GET | 获取所有推广者列表 | 管理员 |
| `update` | PUT | 更新推广者佣金比例 | 管理员 |
| `dashboard` | GET | 获取推广者统计数据 | 推广者本人 |
| `referrals` | GET | 获取推荐用户列表 | 推广者本人 |
| `report` | GET | 获取所有推广者汇总报表 | 管理员 |
| `export` | GET | 导出CSV报表 | 管理员 |

### 3. 前端页面

#### 推广码捕获逻辑（修改 index.html）
```javascript
// 检测URL中的推广码参数
const urlParams = new URLSearchParams(window.location.search);
const refCode = urlParams.get('ref');
if (refCode) {
  localStorage.setItem('affiliate_ref_code', refCode);
}
```

#### 注册时关联推广者
在用户注册流程中，检查 localStorage 中的推广码，查询对应推广者，设置 referred_by 字段。

#### 付费时关联推广者
在付费流程中，检查用户的 referred_by 字段，将 affiliate_id 写入 payment 记录。

## 数据模型

### 推广者（users 表中 referral_code 不为空的用户）
```typescript
interface AffiliateUser {
  id: string;
  email: string;
  referral_code: string;      // 推广码
  commission_rate: number;    // 佣金比例(%)
  // 统计字段（计算得出）
  total_referrals?: number;   // 总推荐数
  total_revenue?: number;     // 总收入
  total_commission?: number;  // 总佣金
}
```

### 被推荐用户
```typescript
interface ReferredUser {
  id: string;
  email: string;
  referred_by: string;        // 推广者用户ID
  created_at: string;         // 注册时间
  // 关联的付费记录
  payments?: Payment[];
}
```

## 正确性属性

*属性是系统在所有有效执行中应保持为真的特征或行为——本质上是关于系统应该做什么的形式化陈述。属性作为人类可读规范和机器可验证正确性保证之间的桥梁。*

### Property 1: 推广码唯一性
*对于任意*新创建的推广者，其推广码在整个系统中应该是唯一的，不与任何现有推广码重复
**验证: 需求 1.1**

### Property 2: 推荐关系正确性
*对于任意*带有有效推广码注册的用户，其 referred_by 字段应正确指向该推广码对应的推广者用户ID
**验证: 需求 2.2**

### Property 3: 付费归属正确性
*对于任意*被推荐用户完成的付费，payment 表中的 affiliate_id 应等于该用户的 referred_by 值
**验证: 需求 2.3**

### Property 4: 统计数据准确性
*对于任意*推广者，其统计数据（总推荐数、总收入、总佣金）应等于 users 表中 referred_by 指向该推广者的用户数量，以及这些用户的 payment 记录聚合值
**验证: 需求 3.2, 4.1**

### Property 5: 日期筛选正确性
*对于任意*日期范围筛选，返回的记录应仅包含 created_at 在指定范围内的数据
**验证: 需求 4.2**

## 错误处理

| 场景 | 处理方式 |
|------|----------|
| 推广码不存在 | 忽略，正常处理注册/付费 |
| 重复注册同一用户 | 仅记录首次推荐（referred_by 不可更改） |
| 数据库错误 | 记录日志，不影响主流程 |

## 测试策略

### 单元测试
- 推广码生成函数的唯一性测试
- 佣金计算函数的准确性测试
- 日期筛选逻辑测试

### 属性测试
使用 fast-check 库进行属性测试：
- 推广码唯一性属性测试
- 统计数据准确性属性测试
- 日期筛选正确性属性测试

### 集成测试
- 完整的推广流程测试（设置推广者 → 分享链接 → 用户注册 → 用户付费 → 查看统计）
- 管理员操作流程测试
