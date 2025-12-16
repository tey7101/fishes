# Our Tank（好友鱼缸）技术设计文档

## Overview

Our Tank 是一个基于现有鱼缸系统扩展的熟人社交功能。用户可以创建私密鱼缸，邀请好友加入，共同在一个鱼缸中养鱼并进行群聊互动。

### 设计目标

1. **复用现有架构**：最大程度复用 `tank.js` 渲染逻辑和 Coze AI 群聊系统
2. **简单易用**：通过邀请码分享，一键加入
3. **会员激励**：创建数量与会员等级挂钩
4. **实时互动**：利用 Supabase Realtime 实现消息实时推送

## Architecture

### URL 参数设计

复用现有 `tank.html`，通过 `view` 参数区分模式：

| URL | 模式 | 说明 |
|-----|-----|-----|
| `tank.html` | Global Tank | 公共鱼缸（默认） |
| `tank.html?view=my` | My Tank | 个人私有鱼缸 |
| `tank.html?view=our&tankId=xxx` | Our Tank | 好友鱼缸 |

### 架构图

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend                              │
├─────────────────────────────────────────────────────────────┤
│  tank.html (复用)        │  src/js/tank.js (扩展)           │
│  - view=our&tankId=xxx  │  - VIEW_MODE: 'global'|'my'|'our'│
│  - 成员列表侧边栏        │  - loadOurTankFish()             │
│  - 群聊面板              │  - 群聊消息处理                   │
├─────────────────────────────────────────────────────────────┤
│  our-tank-list.html     │  src/js/our-tank-list.js         │
│  - 鱼缸列表页面          │  - 创建/加入鱼缸                  │
│  - 创建/加入表单         │  - 鱼缸列表管理                   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      API Layer                               │
├─────────────────────────────────────────────────────────────┤
│  api/our-tank-api.js                                        │
│  - create: 创建鱼缸                                          │
│  - join: 加入鱼缸                                            │
│  - leave: 退出鱼缸                                           │
│  - list: 获取鱼缸列表                                        │
│  - detail: 获取鱼缸详情                                      │
│  - add-fish: 添加鱼到鱼缸                                    │
│  - remove-fish: 从鱼缸移除鱼                                 │
│  - update: 更新鱼缸设置                                      │
│  - delete: 删除鱼缸                                          │
│  - members: 获取成员列表                                     │
│  - remove-member: 移除成员                                   │
│  - chat: 发送群聊消息                                        │
│  - chat-history: 获取聊天历史                                │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Database (Supabase)                       │
├─────────────────────────────────────────────────────────────┤
│  our_tanks              │  our_tank_members                  │
│  our_tank_fish          │  our_tank_messages                 │
│  member_types (扩展)                                         │
└─────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### 1. 前端组件

#### tank.html 扩展（复用现有页面）

扩展 `VIEW_MODE` 支持 `'our'` 模式：

```javascript
// src/js/tank.js 扩展
const VIEW_MODE = tankUrlParams.get('view') || 'global'; // 'global' | 'my' | 'our'
const OUR_TANK_ID = tankUrlParams.get('tankId'); // Our Tank 模式下的鱼缸 ID

if (VIEW_MODE === 'our') {
    if (!OUR_TANK_ID) {
        // 无 tankId，跳转到鱼缸列表
        window.location.href = 'our-tank-list.html';
    }
    loadOurTankFish(OUR_TANK_ID);
    initOurTankChat(OUR_TANK_ID);
}
```

Our Tank 模式下的 UI 变化：
- 显示鱼缸名称和成员数量
- 侧边栏显示成员列表
- 群聊面板支持用户发送消息
- 添加"添加我的鱼"按钮

#### our-tank-list.html（新页面）
- 鱼缸列表视图（我创建的 + 我加入的）
- 创建鱼缸模态框
- 加入鱼缸模态框（密码验证）
- 未读消息标记

### 2. API 接口

```javascript
// 创建鱼缸
POST /api/our-tank-api?action=create
Body: { name, description, password? }
Response: { success, tank: { id, code, name, ... } }

// 加入鱼缸
POST /api/our-tank-api?action=join
Body: { code, password? }
Response: { success, tank: { id, name, ... } }

// 获取鱼缸列表
GET /api/our-tank-api?action=list
Response: { success, tanks: [...], created_count, limit }

// 获取鱼缸详情（含鱼和成员）
GET /api/our-tank-api?action=detail&tankId=xxx
Response: { success, tank, members, fish }

// 添加鱼到鱼缸
POST /api/our-tank-api?action=add-fish
Body: { tankId, fishId }
Response: { success }

// 发送群聊消息（复用现有 group-chat API）
POST /api/fish-api?action=group-chat
Body: { ourTankId, userMessage, participants }
Response: { success, sessionId, dialogues }

// 获取聊天历史（复用现有查询，添加 ourTankId 过滤）
GET /api/our-tank-api?action=chat-history&tankId=xxx&limit=50
Response: { success, sessions: [...] }
```

### 3. 实时订阅

使用 Supabase Realtime 订阅 `group_chat` 表变化：

```javascript
// 订阅好友鱼缸的群聊会话
supabase
  .channel(`our-tank-chat-${tankId}`)
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'group_chat',
    filter: `our_tank_id=eq.${tankId}`
  }, handleNewChatSession)
  .subscribe();
```

## Data Models

### 1. our_tanks 表（好友鱼缸）

```sql
CREATE TABLE our_tanks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(8) UNIQUE NOT NULL,        -- 邀请码（6-8位字母数字）
  name VARCHAR(100) NOT NULL,             -- 鱼缸名称
  description TEXT,                        -- 描述
  password_hash VARCHAR(255),              -- 加密后的密码（可选）
  owner_id UUID NOT NULL REFERENCES users(id),
  max_fish_count INTEGER DEFAULT 20,       -- 鱼缸容量
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_our_tanks_owner ON our_tanks(owner_id);
CREATE INDEX idx_our_tanks_code ON our_tanks(code);
```

### 2. our_tank_members 表（鱼缸成员）

```sql
CREATE TABLE our_tank_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tank_id UUID NOT NULL REFERENCES our_tanks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  role VARCHAR(20) DEFAULT 'member',       -- 'owner' | 'member'
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  last_read_at TIMESTAMPTZ,                -- 最后阅读时间（用于未读计数）
  UNIQUE(tank_id, user_id)
);

CREATE INDEX idx_our_tank_members_tank ON our_tank_members(tank_id);
CREATE INDEX idx_our_tank_members_user ON our_tank_members(user_id);
```

### 3. our_tank_fish 表（鱼缸中的鱼）

```sql
CREATE TABLE our_tank_fish (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tank_id UUID NOT NULL REFERENCES our_tanks(id) ON DELETE CASCADE,
  fish_id UUID NOT NULL REFERENCES fish(id),
  added_by UUID NOT NULL REFERENCES users(id),
  added_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tank_id, fish_id)
);

CREATE INDEX idx_our_tank_fish_tank ON our_tank_fish(tank_id);
CREATE INDEX idx_our_tank_fish_user ON our_tank_fish(added_by);
```

### 4. 复用 `group_chat` 表（群聊消息）

> **设计决策：复用现有 `group_chat` 表**
> 
> 现有 `group_chat` 表结构完全满足 Our Tank 需求：
> - `dialogues` (JSONB): 存储整个对话 `{messages: [{fishId, fishName, message, sequence}]}`
> - `participant_fish_ids`: 参与的鱼 ID 数组
> - `topic`: 对话主题
> - `initiator_user_id`: 发起用户
> - `user_talk`: 用户发送的消息
> - `expires_at`: 自动过期时间
>
> **扩展方案**：添加 `our_tank_id` 字段关联好友鱼缸

```sql
-- 扩展 group_chat 表，添加 Our Tank 关联
ALTER TABLE group_chat 
ADD COLUMN our_tank_id UUID REFERENCES our_tanks(id) ON DELETE CASCADE;

CREATE INDEX idx_group_chat_our_tank ON group_chat(our_tank_id);

COMMENT ON COLUMN group_chat.our_tank_id IS '关联的好友鱼缸ID（NULL表示Global/My Tank群聊）';
```

**数据结构说明**：
- `our_tank_id = NULL`: Global Tank 或 My Tank 的群聊
- `our_tank_id = xxx`: Our Tank 的群聊
- `user_talk`: 用户发送的消息（触发 AI 回复）
- `dialogues`: 鱼群的回复内容（AI 生成）

**复用现有 API**：
- 复用 `lib/api_handlers/fish/chat/group.js` 群聊生成逻辑
- 扩展支持 `ourTankId` 参数

### 5. member_types 表扩展

```sql
ALTER TABLE member_types 
ADD COLUMN our_tank_limit INTEGER DEFAULT 1;

-- 更新各会员类型的限制
UPDATE member_types SET our_tank_limit = 1 WHERE id = 'free';
UPDATE member_types SET our_tank_limit = 3 WHERE id = 'plus';
UPDATE member_types SET our_tank_limit = 10 WHERE id = 'premium';
UPDATE member_types SET our_tank_limit = 999 WHERE id = 'admin';
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

基于需求分析，以下是核心正确性属性：

### Property 1: 邀请码唯一性
*For any* 两个不同的好友鱼缸，它们的邀请码必须不同
**Validates: Requirements 1.2**

### Property 2: 密码加密存储
*For any* 设置了密码的好友鱼缸，存储的密码哈希值不等于原始密码明文
**Validates: Requirements 1.3**

### Property 3: 会员创建限制
*For any* 用户和其会员类型，该用户创建的好友鱼缸数量不超过其会员类型对应的 our_tank_limit 值
**Validates: Requirements 1.4, 6.1, 6.2, 6.3**

### Property 4: 创建者自动成为主人
*For any* 新创建的好友鱼缸，创建者必须自动成为该鱼缸的成员且角色为 'owner'
**Validates: Requirements 1.5**

### Property 5: 密码验证正确性
*For any* 设有密码的好友鱼缸和任意用户尝试加入，只有当提供的密码与存储的哈希匹配时才能成功加入
**Validates: Requirements 2.3, 2.4**

### Property 6: 已是成员的幂等性
*For any* 已是某鱼缸成员的用户再次尝试加入，成员记录数量保持不变
**Validates: Requirements 2.5**

### Property 7: 鱼添加到鱼缸的完整性
*For any* 添加到好友鱼缸的鱼，原始鱼数据保持不变，仅创建关联记录
**Validates: Requirements 3.2, 3.3**

### Property 8: 成员移除的级联删除
*For any* 被移除的鱼缸成员，该成员添加的所有鱼也从鱼缸中移除
**Validates: Requirements 5.2, 5.5**

### Property 9: 鱼缸删除的级联清理
*For any* 被删除的好友鱼缸，所有关联的成员记录、鱼记录和消息记录都被删除
**Validates: Requirements 5.4**

### Property 10: 鱼缸列表完整性
*For any* 用户查询其鱼缸列表，结果包含所有该用户创建的和加入的鱼缸
**Validates: Requirements 7.1**

### Property 11: 聊天会话持久化
*For any* 在好友鱼缸中触发的群聊会话，该会话可以通过聊天历史 API 查询到，且 `our_tank_id` 正确关联
**Validates: Requirements 4.2, 4.3, 4.4**

### Property 12: 未读会话计数准确性
*For any* 鱼缸成员，未读会话数等于该鱼缸中 `group_chat.created_at` 大于成员 `last_read_at` 的会话数量
**Validates: Requirements 7.3**

## Error Handling

### 1. 创建鱼缸错误

| 错误场景 | 错误码 | 处理方式 |
|---------|-------|---------|
| 未登录 | 401 | 跳转登录页 |
| 达到创建限制 | 403 | 显示升级会员引导 |
| 名称为空 | 400 | 表单验证提示 |
| 邀请码生成冲突 | 500 | 自动重试生成 |

### 2. 加入鱼缸错误

| 错误场景 | 错误码 | 处理方式 |
|---------|-------|---------|
| 邀请码无效 | 404 | 提示"鱼缸不存在" |
| 密码错误 | 403 | 提示"密码错误" |
| 已是成员 | 200 | 直接进入鱼缸 |

### 3. 添加鱼错误

| 错误场景 | 错误码 | 处理方式 |
|---------|-------|---------|
| 非成员 | 403 | 提示"请先加入鱼缸" |
| 鱼已在鱼缸中 | 409 | 提示"这条鱼已在鱼缸中" |
| 鱼缸已满 | 403 | 提示"鱼缸已满" |

## Testing Strategy

### 单元测试

使用 Vitest 进行单元测试，覆盖：
- 邀请码生成函数
- 密码哈希和验证函数
- 会员限制检查函数

### 属性测试

使用 fast-check 进行属性测试，验证核心正确性属性：

```javascript
import fc from 'fast-check';

// Property 1: 邀请码唯一性
test('generated invite codes are unique', () => {
  fc.assert(
    fc.property(fc.integer({ min: 100, max: 1000 }), (count) => {
      const codes = new Set();
      for (let i = 0; i < count; i++) {
        codes.add(generateInviteCode());
      }
      return codes.size === count;
    })
  );
});

// Property 3: 会员创建限制
test('user cannot exceed membership tank limit', () => {
  fc.assert(
    fc.property(
      fc.record({
        memberType: fc.constantFrom('free', 'plus', 'premium'),
        existingTanks: fc.integer({ min: 0, max: 20 })
      }),
      ({ memberType, existingTanks }) => {
        const limit = getMemberTankLimit(memberType);
        const canCreate = checkCanCreateTank(memberType, existingTanks);
        return canCreate === (existingTanks < limit);
      }
    )
  );
});
```

### 集成测试

测试完整的用户流程：
1. 创建鱼缸 → 获取邀请码 → 分享链接
2. 通过邀请码加入 → 添加鱼 → 发送消息
3. 查看聊天历史 → 实时收到新消息
