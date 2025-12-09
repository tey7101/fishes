# Requirements Document

## Introduction

本需求文档描述了在 FishTalk.app 网站中集成 Facebook Pixel 代码的功能需求。Facebook Pixel 是 Meta 提供的追踪工具，用于收集用户行为数据，优化广告投放效果，追踪转化事件。

## Glossary

- **Facebook Pixel**: Meta 提供的网页追踪代码，用于收集用户行为数据和追踪广告转化
- **Meta Pixel**: Facebook Pixel 的新名称
- **Base Code**: 基础像素代码，需要安装在所有页面的 `<head>` 标签中
- **PageView Event**: 页面浏览事件，当用户访问页面时自动触发
- **Conversion Event**: 转化事件，如注册、购买、提交等关键用户行为
- **HTML Page**: 网站的 HTML 页面文件
- **Head Tag**: HTML 文档中的 `<head>` 标签区域

## Requirements

### Requirement 1

**User Story:** 作为广告投放人员，我希望在所有网站页面中安装 Facebook Pixel 基础代码，以便追踪所有页面的访问数据。

#### Acceptance Criteria

1. WHEN 用户访问任何网站页面 THEN 系统 SHALL 加载 Facebook Pixel 基础代码并触发 PageView 事件
2. WHEN Facebook Pixel 代码加载 THEN 系统 SHALL 将代码放置在 `<head>` 标签内，位于现有代码下方但在 `</head>` 之前
3. WHEN 页面包含其他 `<head>` 标签内容 THEN 系统 SHALL 保持现有代码不变，仅添加 Pixel 代码
4. WHEN Facebook Pixel 初始化 THEN 系统 SHALL 使用 Pixel ID '1187103726151352'
5. WHEN 浏览器禁用 JavaScript THEN 系统 SHALL 使用 `<noscript>` 标签中的备用追踪方式

### Requirement 2

**User Story:** 作为广告投放人员，我希望识别网站中的关键页面，以便在这些页面上部署 Pixel 代码。

#### Acceptance Criteria

1. WHEN 识别关键页面 THEN 系统 SHALL 包含首页 (index.html)
2. WHEN 识别关键页面 THEN 系统 SHALL 包含登录页 (login.html)
3. WHEN 识别关键页面 THEN 系统 SHALL 包含会员页 (membership.html)
4. WHEN 识别关键页面 THEN 系统 SHALL 包含鱼缸页 (tank.html)
5. WHEN 识别关键页面 THEN 系统 SHALL 包含个人资料页 (profile.html)
6. WHEN 识别关键页面 THEN 系统 SHALL 包含排行榜页 (rank.html)
7. WHEN 识别关键页面 THEN 系统 SHALL 包含所有用户可访问的 HTML 页面

### Requirement 3

**User Story:** 作为开发人员，我希望 Pixel 代码不影响现有功能，以便保持网站正常运行。

#### Acceptance Criteria

1. WHEN 添加 Pixel 代码 THEN 系统 SHALL 保持现有 Google Analytics 代码正常工作
2. WHEN 添加 Pixel 代码 THEN 系统 SHALL 保持现有 meta 标签不变
3. WHEN 添加 Pixel 代码 THEN 系统 SHALL 保持现有 CSS 和 JavaScript 引用不变
4. WHEN Pixel 代码加载失败 THEN 系统 SHALL 不影响页面其他功能的正常运行
5. WHEN 页面加载 THEN 系统 SHALL 确保 Pixel 代码异步加载，不阻塞页面渲染

### Requirement 4

**User Story:** 作为广告投放人员，我希望验证 Pixel 代码是否正确安装，以便确认追踪功能正常工作。

#### Acceptance Criteria

1. WHEN Pixel 代码安装完成 THEN 系统 SHALL 在浏览器控制台中可见 fbq 函数
2. WHEN 访问页面 THEN 系统 SHALL 在浏览器网络请求中可见对 facebook.com 的请求
3. WHEN 使用 Meta Pixel Helper 浏览器插件 THEN 系统 SHALL 显示 Pixel 已正确安装
4. WHEN 查看页面源代码 THEN 系统 SHALL 在 `<head>` 标签中可见完整的 Pixel 代码
5. WHEN Pixel 触发事件 THEN 系统 SHALL 在 Meta Events Manager 中可见事件数据

### Requirement 5

**User Story:** 作为开发人员，我希望 Pixel 代码易于维护和更新，以便未来可以轻松修改或添加事件追踪。

#### Acceptance Criteria

1. WHEN 需要更新 Pixel ID THEN 系统 SHALL 允许在单一位置修改所有页面的 Pixel ID
2. WHEN 添加新的转化事件 THEN 系统 SHALL 提供清晰的代码结构以便添加自定义事件
3. WHEN 查看代码 THEN 系统 SHALL 包含注释说明 Pixel 代码的用途和位置
4. WHEN 需要禁用 Pixel THEN 系统 SHALL 允许通过简单的配置禁用追踪
5. WHEN 代码结构变化 THEN 系统 SHALL 保持 Pixel 代码的独立性，不与其他功能耦合
