# 设计文档

## 概述

本设计实现 Supabase 匿名认证功能，让新用户无需注册即可使用应用。核心思路是利用 Supabase 原生的 `signInAnonymously()` API，匿名用户获得真实 UUID，与 Free 用户享有相同权限，后续可升级为正式账号。

## 架构

```mermaid
flowchart TD
    A[访客访问应用] --> B{检查现有会话}
    B -->|有会话| C[恢复用户状态]
    B -->|无会话| D[显示登录选项]
    D --> E[点击"立即体验"]
    D --> F[点击"跳过登录"]
    D --> G[正常登录/注册]
    E --> H[signInAnonymously]
    F --> H
    H --> I[创建匿名用户]
    I --> J[存储会话到浏览器]
    J --> K[进入应用]
    C --> K
    G --> K
    
    K --> L{用户操作}
    L -->|使用功能| M[Free 用户权限]
    L -->|购买会员| N{是否匿名用户?}
    N -->|是| O[要求升级账号]
    N -->|否| P[进入支付流程]
    O --> Q[升级账号]
    Q --> P
    
    L -->|升级账号| Q
    Q --> R[linkIdentity/updateUser]
    R --> S[保留原 UUID 和数据]
```

## 组件和接口

### 1. 匿名认证模块 (supabase-init.js 扩展)

```javascript
// 新增函数
async function signInAnonymously()
async function isAnonymousUser(user)
async function upgradeAnonymousAccount(method, credentials)
async function linkIdentity(provider)
```

### 2. UI 组件修改

| 组件 | 修改内容 |
|------|----------|
| auth-ui.js | 添加"跳过登录"按钮，匿名用户状态显示 |
| index.html | 添加"立即体验"入口按钮 |
| profile.html | 添加账号升级区域 |
| membership.html | 匿名用户购买前拦截 |

### 3. 接口定义

```typescript
// 匿名登录
signInAnonymously(): Promise<{ data: AuthResponse, error: Error | null }>

// 检查是否匿名用户
isAnonymousUser(user?: User): boolean

// 升级账号 - 邮箱方式
upgradeWithEmail(email: string, password: string): Promise<{ data, error }>

// 升级账号 - OAuth 方式
upgradeWithOAuth(provider: string): Promise<{ data, error }>

// 获取用户显示信息
getUserDisplayInfo(user: User): { name: string, isAnonymous: boolean, upgradePrompt: boolean }
```

## 数据模型

### 用户状态判断

Supabase 匿名用户的特征：
- `user.is_anonymous === true`
- `user.email` 为空或为 null
- `user.identities` 数组为空

```javascript
function isAnonymousUser(user) {
  if (!user) return false;
  return user.is_anonymous === true || 
         (!user.email && (!user.identities || user.identities.length === 0));
}
```

### 数据库无需修改

- 匿名用户使用真实 UUID，与现有 `users` 表结构兼容
- RLS 策略基于 `auth.uid()` 验证，无需修改
- 升级后 UUID 不变，数据自动保留

## 正确性属性

*属性是系统在所有有效执行中应保持为真的特征或行为——本质上是关于系统应该做什么的形式化陈述。属性是人类可读规范和机器可验证正确性保证之间的桥梁。*

### 属性 1: 匿名用户创建一致性
*对于任意* 无会话的访客，调用 `signInAnonymously()` 后应返回包含有效 UUID 的用户对象，且 `is_anonymous` 为 true
**验证: 需求 1.1, 1.2**

### 属性 2: 会话恢复身份一致性
*对于任意* 匿名用户，在会话有效期内重新访问应用，恢复的用户 UUID 应与原始 UUID 相同
**验证: 需求 1.4**

### 属性 3: 账号升级数据保留
*对于任意* 匿名用户，升级为正式用户后，用户 UUID 应保持不变，所有关联数据应可正常访问
**验证: 需求 2.1, 2.2, 2.3, 6.4**

### 属性 4: 匿名用户识别准确性
*对于任意* 用户对象，`isAnonymousUser()` 函数应正确返回该用户是否为匿名用户
**验证: 需求 3.1, 3.2**

### 属性 5: 付费前账号检查
*对于任意* 匿名用户，尝试进入支付流程时应被拦截并要求升级账号
**验证: 需求 4.1**

### 属性 6: 数据关联正确性
*对于任意* 匿名用户创建的数据，`user_id` 字段应等于该匿名用户的 UUID
**验证: 需求 6.2**

## 错误处理

| 场景 | 处理方式 |
|------|----------|
| 匿名登录失败 | 显示错误提示，允许重试或使用正常登录 |
| 升级时邮箱已存在 | 提示"该邮箱已注册"，建议登录现有账号 |
| 升级时 OAuth 失败 | 保持匿名状态，显示错误信息 |
| 会话过期 | 创建新的匿名账号（旧数据丢失） |
| Supabase 未启用匿名认证 | 回退到正常登录流程 |

## 测试策略

### 单元测试

使用 Vitest 测试核心逻辑：
- `isAnonymousUser()` 函数的各种输入情况
- `getUserDisplayInfo()` 返回值正确性
- 升级账号前的验证逻辑

### 属性测试

使用 fast-check 进行属性测试：
- 匿名用户创建后的状态验证
- 账号升级后 UUID 不变性验证
- 用户类型判断的准确性

### 集成测试

- 完整的匿名登录流程
- 账号升级流程（邮箱和 OAuth）
- 付费拦截流程
