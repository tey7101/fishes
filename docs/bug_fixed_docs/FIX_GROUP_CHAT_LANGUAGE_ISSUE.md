# 修复群聊语言参数错误问题

## 问题描述

用户 `lovetey710125` 的数据库语言设置是 `English`，但在发起群聊时，Coze 后台 API 收到的语言参数却是 `简体中文`。

## 问题分析

### 根本原因

1. **前端问题**：`community-chat-manager.js` 在发起群聊请求时，**没有传递用户的语言参数**
2. **后端问题**：`group.js` 没有从请求体中提取 `userLanguage` 参数
3. **Fallback 逻辑问题**：后端在没有收到语言参数时，会按以下顺序查找语言：
   - 第一优先级：请求中的 `userLanguage`（❌ 前端没传）
   - 第二优先级：从数据库查询发起人的语言（✅ 应该正确）
   - 第三优先级：从参与群聊的鱼主人中找第一个非空语言（⚠️ 可能是简体中文用户）

### 为什么会返回简体中文？

当前端没有传递语言参数时，后端依赖 fallback 逻辑。如果：
- 数据库查询失败或返回空值
- 或者参与群聊的第一条鱼的主人是简体中文用户

就会导致群聊使用简体中文。

## 修复方案

### 1. 后端修复（`lib/api_handlers/fish/chat/group.js`）

#### 修改 1：从请求体提取语言参数

**位置：** 第 973-993 行

**修改前：**
```javascript
// Get tank fish IDs from request body (if provided)
// Language will be determined from database based on requestUserId
let tankFishIds = null;
if (req.method === 'POST') {
    // ... 解析请求体
    if (body && body.tankFishIds && Array.isArray(body.tankFishIds)) {
        tankFishIds = body.tankFishIds;
    }
}
console.log('[AI Fish Group Chat] 🌐 Language will be determined from database for user:', requestUserId);
```

**修改后：**
```javascript
// Get tank fish IDs and user language from request body (if provided)
let tankFishIds = null;
let userLanguageFromRequest = null;

if (req.method === 'POST') {
    // ... 解析请求体
    if (body && body.tankFishIds && Array.isArray(body.tankFishIds)) {
        tankFishIds = body.tankFishIds;
    }
    
    // 🔧 修复：从请求体中提取用户语言参数
    if (body && body.userLanguage && typeof body.userLanguage === 'string' && body.userLanguage.trim()) {
        userLanguageFromRequest = body.userLanguage.trim();
        console.log('[AI Fish Group Chat] 🌐 User language from request:', userLanguageFromRequest);
    }
}

if (!userLanguageFromRequest) {
    console.log('[AI Fish Group Chat] 🌐 No language in request, will query database for user:', requestUserId);
}
```

#### 修改 2：传递语言参数给 `generateGroupChat`

**位置：** 第 1031-1032 行

**修改前：**
```javascript
// Generate chat using Coze (language determined from database based on requestUserId)
const chatResult = await generateGroupChat(fishArray, requestUserId, {}, null, null);
```

**修改后：**
```javascript
// Generate chat using Coze (language from request or database)
const chatResult = await generateGroupChat(fishArray, requestUserId, {}, null, userLanguageFromRequest);
```

### 2. 前端修复（`src/js/community-chat-manager.js`）

#### 修改：在请求中添加用户语言参数

**位置：** 第 208-217 行

**修改前：**
```javascript
// Call backend API for group chat (using Coze AI)
// Backend will determine language from database based on userId
const requestBody = {
  prompt: `Generate a "${topic}" conversation`,
  tankFishIds: currentTankFishIds,
  userId: currentUserId
};

console.log('🌐 [Community Chat] Backend will determine language from database for user:', currentUserId);
```

**修改后：**
```javascript
// 🔧 获取用户的语言设置
let userLanguage = null;

// 尝试从 tank 页面的语言选择器获取
const userLanguageSelect = document.getElementById('user-language-select');
if (userLanguageSelect && userLanguageSelect.value) {
  userLanguage = userLanguageSelect.value;
  console.log('🌐 [Community Chat] Got user language from selector:', userLanguage);
} else {
  console.log('⚠️ [Community Chat] No language selector found, will fetch from API');
  
  // 如果没有选择器，尝试从 API 获取
  try {
    const backendUrl = window.BACKEND_URL || '';
    const profileResponse = await fetch(`${backendUrl}/api/profile/${encodeURIComponent(currentUserId)}`);
    if (profileResponse.ok) {
      const profileData = await profileResponse.json();
      userLanguage = profileData.user?.user_language || null;
      console.log('🌐 [Community Chat] Got user language from API:', userLanguage);
    }
  } catch (error) {
    console.warn('⚠️ [Community Chat] Failed to fetch user language from API:', error);
  }
}

// Call backend API for group chat (using Coze AI)
const requestBody = {
  prompt: `Generate a "${topic}" conversation`,
  tankFishIds: currentTankFishIds,
  userId: currentUserId,
  userLanguage: userLanguage // 🔧 传递用户语言设置
};

console.log('🌐 [Community Chat] Request body:', {
  userId: currentUserId,
  userLanguage: userLanguage,
  tankFishCount: currentTankFishIds.length
});
```

## 修复效果

### 修复前

1. 前端不传递语言参数
2. 后端依赖 fallback 逻辑
3. 可能使用其他鱼主人的语言（简体中文）

**控制台日志：**
```
[AI Fish Group Chat] 🌐 Language will be determined from database for user: xxx
[AI Fish Group Chat] Using fish owner language: 简体中文  ← 从其他鱼主人获取
```

### 修复后

1. 前端优先从语言选择器获取用户语言
2. 如果选择器不存在，从 Profile API 获取
3. 后端优先使用前端传递的语言参数
4. Fallback 到数据库查询

**控制台日志：**
```
🌐 [Community Chat] Got user language from selector: English
🌐 [Community Chat] Request body: { userId: 'xxx', userLanguage: 'English', ... }
[AI Fish Group Chat] 🌐 User language from request: English
[AI Fish Group Chat] Using language from frontend request: English  ← 正确！
```

## 语言优先级（修复后）

1. **第一优先级**：前端传递的 `userLanguage`（从语言选择器或 Profile API）
2. **第二优先级**：后端从数据库查询发起人的语言
3. **第三优先级**：从参与鱼主人中获取第一个非空语言
4. **默认值**：`English`

## 测试步骤

1. **清除缓存**：确保使用最新代码
2. **登录用户**：使用 lovetey710125 账号
3. **设置语言**：在 tank 页面的语言选择器中选择 `English`
4. **发起群聊**：观察 Coze API 收到的语言参数
5. **查看日志**：应该看到 `Using language from frontend request: English`

## 验证方法

### 前端验证

在浏览器控制台执行：
```javascript
// 检查语言选择器
const select = document.getElementById('user-language-select');
console.log('当前选择的语言:', select?.value);

// 手动触发群聊
if (window.communityChatManager) {
  window.communityChatManager.generateChatSession();
}
```

### 后端验证

查看服务器日志，应该包含：
```
[AI Fish Group Chat] 🌐 User language from request: English
[AI Fish Group Chat] Using language from frontend request: English
[AI Fish Group Chat] 🌐 Final output language determined: English
```

## 相关文件

- ✅ `lib/api_handlers/fish/chat/group.js` - 后端 API 处理
- ✅ `src/js/community-chat-manager.js` - 前端群聊管理器
- ℹ️ `tank.html` - 语言选择器定义

## 注意事项

1. **向后兼容**：如果前端没有传递 `userLanguage`，后端仍然会从数据库查询，保证旧版本客户端正常工作
2. **错误处理**：如果语言选择器不存在或 API 调用失败，会优雅降级到后端查询
3. **日志完善**：添加了详细的调试日志，便于追踪语言参数的来源

## 总结

✅ **前端**：获取并传递用户语言参数  
✅ **后端**：提取并优先使用前端传递的语言参数  
✅ **Fallback**：保留数据库查询作为备选方案  
✅ **日志**：添加详细的调试信息便于追踪

这个修复确保了用户的语言偏好能够正确传递到 Coze API，避免使用错误的语言生成群聊。

