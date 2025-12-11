# Chrome DevTools MCP 工具使用指南

## 概述

Chrome DevTools MCP 是一个用于自动化浏览器测试的工具。本文档记录了工具的使用方法和已知问题的解决方案。

## 工具状态

| 工具 | 状态 | 备注 |
|------|------|------|
| `list_pages` | ✅ 正常 | 列出所有打开的页面 |
| `select_page` | ✅ 正常 | 选择要操作的页面 |
| `navigate_page` | ✅ 正常 | 导航到 URL、前进、后退、刷新 |
| `take_snapshot` | ✅ 正常 | 获取页面 DOM 快照 |
| `take_screenshot` | ✅ 正常 | 截取页面截图 |
| `press_key` | ✅ 正常 | 模拟键盘按键 |
| `evaluate_script` | ✅ 正常 | 执行 JavaScript 代码 |
| `list_console_messages` | ✅ 正常 | 获取控制台消息 |
| `list_network_requests` | ✅ 正常 | 获取网络请求 |
| `fill` | ⚠️ 不稳定 | 有时成功，有时超时（5秒） |
| `click` | ⚠️ 不稳定 | 有时成功，有时超时（5秒） |
| `hover` | ⚠️ 不稳定 | 经常超时 |
| `fill_form` | ⚠️ 不稳定 | 经常超时 |

## 已知问题

### fill 和 click 超时问题

**问题描述**：
`fill` 和 `click` 工具在某些情况下会超时（默认 5 秒），返回错误：
```
MCP Tool Error Response: Timed out after waiting 5000ms
```

**可能原因**：
1. 页面有复杂的 JavaScript 事件处理
2. 页面有动画或过渡效果
3. 元素未完全加载或不可交互
4. MCP 工具等待元素稳定的超时时间不够

### 解决方案

#### 方案 1：使用 evaluate_script 替代（推荐）

使用 `evaluate_script` 直接操作 DOM 元素，绑过 MCP 工具的等待机制：

**替代 fill - 填写输入框**：
```javascript
// 通过 ID 填写
() => {
  const input = document.getElementById('email-input');
  if (input) {
    input.value = 'test@example.com';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    return { success: true };
  }
  return { success: false, error: 'Input not found' };
}

// 通过选择器填写
() => {
  const input = document.querySelector('input[type="email"]');
  if (input) {
    input.value = 'test@example.com';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    return { success: true };
  }
  return { success: false };
}
```

**替代 click - 点击元素**：
```javascript
// 通过 ID 点击
() => {
  const btn = document.getElementById('submit-btn');
  if (btn) {
    btn.click();
    return 'clicked';
  }
  return 'button not found';
}

// 通过文本内容点击
() => {
  for (const btn of document.querySelectorAll('button')) {
    if (btn.textContent.includes('Login')) {
      btn.click();
      return 'clicked login button';
    }
  }
  return 'login button not found';
}
```

**替代 fill_form - 批量填写表单**：
```javascript
() => {
  const emailInput = document.querySelector('input[type="email"]');
  const passwordInput = document.querySelector('input[type="password"]');
  
  if (emailInput) emailInput.value = 'test@example.com';
  if (passwordInput) passwordInput.value = 'password123';
  
  return { 
    email: emailInput?.value, 
    password: passwordInput?.value ? '***' : null 
  };
}
```

#### 方案 2：使用 press_key 配合 Tab 导航

先用 Tab 键导航到目标元素，使其获得焦点，然后再使用 fill：

```
1. press_key: Tab  (导航到第一个可聚焦元素)
2. press_key: Tab  (继续导航)
3. take_snapshot   (确认目标元素已聚焦)
4. fill: uid, value (此时成功率更高)
```

#### 方案 3：使用 press_key Enter 提交表单

对于 `type="submit"` 的按钮，可以用 Enter 键提交：

```
1. 填写表单字段
2. press_key: Enter (提交表单)
```

## 最佳实践

### 1. 优先使用稳定的工具

```
推荐顺序：
1. evaluate_script (最可靠)
2. press_key (稳定)
3. navigate_page (稳定)
4. take_snapshot (稳定)
5. fill/click (不稳定，作为备选)
```

### 2. 检查元素状态

在操作元素前，先用 evaluate_script 检查元素状态：

```javascript
() => {
  const btn = document.querySelector('#submit-btn');
  return {
    exists: !!btn,
    disabled: btn?.disabled,
    visible: btn?.offsetParent !== null,
    type: btn?.type
  };
}
```

### 3. 等待页面加载

使用 `wait_for` 等待特定文本出现：

```
wait_for: text="Dashboard", timeout=5000
```

### 4. 检查控制台错误

操作失败时，检查控制台是否有 JavaScript 错误：

```
list_console_messages: types=["error", "warn"]
```

## 完整测试示例

### 登录流程测试

```javascript
// 1. 导航到登录页
navigate_page: url="http://localhost:3000/login.html"

// 2. 获取页面快照
take_snapshot

// 3. 使用 evaluate_script 填写表单并提交
evaluate_script: () => {
  const email = document.getElementById('signin-email');
  const password = document.getElementById('signin-password');
  
  if (email) email.value = 'test@example.com';
  if (password) password.value = 'password123';
  
  // 触发表单提交
  const form = email?.closest('form');
  if (form) form.submit();
  
  return { success: true };
}

// 4. 等待登录完成
wait_for: text="Dashboard"

// 5. 验证登录状态
take_snapshot
```

### 检查用户权限

```javascript
evaluate_script: async () => {
  const user = await window.supabaseAuth?.getCurrentUser();
  return {
    loggedIn: !!user,
    userId: user?.id,
    email: user?.email
  };
}
```

## 故障排除

### 问题：所有操作都超时

1. 检查 Chrome 浏览器是否正常运行
2. 检查 MCP 服务器连接：`list_pages`
3. 刷新页面：`navigate_page: type="reload"`

### 问题：元素找不到

1. 获取最新快照：`take_snapshot`
2. 检查 uid 是否正确
3. 检查元素是否在 iframe 中

### 问题：点击无响应

1. 检查元素是否被遮挡
2. 检查是否有 disabled 属性
3. 使用 evaluate_script 直接调用 click()

## 更新日志

- 2024-12-10: 初始版本，记录 fill/click 超时问题及解决方案
