# 需求文档

## 简介

本文档定义了 FishTalk 管理中心的两个新功能模块：**网站表现**（Site Analytics）和**群聊信息**（Chat Viewer）。网站表现模块用于查看指定日期区间内的关键业务指标统计数据；群聊信息模块用于快速浏览用户的群聊对话内容。

## 术语表

- **Admin_Center**: FishTalk 管理后台入口页面
- **Site_Analytics**: 网站表现模块，展示业务统计数据
- **Chat_Viewer**: 群聊信息模块，展示群聊对话内容
- **Date_Range**: 日期区间选择器，支持自定义起止日期
- **Anonymous_User**: 匿名用户，通过 Supabase `is_anonymous` 属性识别
- **Registered_User**: 注册用户，非匿名的正式用户
- **Group_Chat**: 群聊记录，存储在 `group_chat` 表中
- **Our_Tank**: 好友鱼缸，存储在 `our_tanks` 表中
- **Payment**: 支付订单，存储在 `payment` 表中

## 需求

### 需求 1

**用户故事:** 作为管理员，我希望查看指定日期区间内的网站关键指标，以便了解网站运营状况。

#### 验收标准

1. WHEN 管理员访问网站表现模块 THEN Admin_Center SHALL 显示默认为过去24小时的统计数据
2. WHEN 管理员点击快速选择按钮（7天、30天） THEN Site_Analytics SHALL 更新日期区间并刷新统计数据
3. WHEN 管理员自定义日期区间 THEN Site_Analytics SHALL 根据选定的起止日期查询并显示统计数据
4. WHEN 统计数据加载中 THEN Site_Analytics SHALL 显示加载状态指示器
5. WHEN 统计数据加载失败 THEN Site_Analytics SHALL 显示错误提示并提供重试选项

### 需求 2

**用户故事:** 作为管理员，我希望查看用户增长数据，以便了解用户获取情况。

#### 验收标准

1. WHEN 查询指定日期区间 THEN Site_Analytics SHALL 显示该期间创建的总用户数
2. WHEN 查询指定日期区间 THEN Site_Analytics SHALL 分别显示匿名用户数和注册用户数
3. WHEN 用户数据为零 THEN Site_Analytics SHALL 显示数值 0 而非空白

### 需求 3

**用户故事:** 作为管理员，我希望查看群聊活跃度数据，以便了解用户互动情况。

#### 验收标准

1. WHEN 查询指定日期区间 THEN Site_Analytics SHALL 显示该期间创建的群聊总数
2. WHEN 群聊数据为零 THEN Site_Analytics SHALL 显示数值 0 而非空白

### 需求 4

**用户故事:** 作为管理员，我希望查看好友鱼缸创建数据，以便了解社交功能使用情况。

#### 验收标准

1. WHEN 查询指定日期区间 THEN Site_Analytics SHALL 显示该期间创建的 Our_Tank 总数
2. WHEN Our_Tank 数据为零 THEN Site_Analytics SHALL 显示数值 0 而非空白

### 需求 5

**用户故事:** 作为管理员，我希望查看订单数据，以便了解收入情况。

#### 验收标准

1. WHEN 查询指定日期区间 THEN Site_Analytics SHALL 显示该期间创建的支付订单总数
2. WHEN 订单数据为零 THEN Site_Analytics SHALL 显示数值 0 而非空白

### 需求 6

**用户故事:** 作为管理员，我希望通过数据曲线查看指标随时间的变化趋势，以便发现数据规律。

#### 验收标准

1. WHEN 日期区间大于1天 THEN Site_Analytics SHALL 显示按日期分组的数据曲线图
2. WHEN 鼠标悬停在曲线数据点上 THEN Site_Analytics SHALL 显示该日期的具体数值
3. WHEN 日期区间为1天 THEN Site_Analytics SHALL 显示按小时分组的数据曲线图

### 需求 7

**用户故事:** 作为管理员，我希望查看群聊对话内容，以便了解用户在聊什么。

#### 验收标准

1. WHEN 管理员访问群聊信息模块 THEN Chat_Viewer SHALL 显示默认为过去24小时的群聊列表
2. WHEN 管理员选择日期区间 THEN Chat_Viewer SHALL 根据选定的起止日期查询并显示群聊列表
3. WHEN 管理员点击某条群聊 THEN Chat_Viewer SHALL 展开显示该群聊的完整对话内容
4. WHEN 显示对话内容 THEN Chat_Viewer SHALL 按时间顺序排列每条消息
5. WHEN 显示对话消息 THEN Chat_Viewer SHALL 显示发言者（鱼名称）、消息内容和发言顺序

### 需求 8

**用户故事:** 作为管理员，我希望群聊对话以聊天界面风格展示，以便直观阅读对话内容。

#### 验收标准

1. WHEN 展示群聊对话 THEN Chat_Viewer SHALL 以气泡样式显示每条消息
2. WHEN 展示群聊对话 THEN Chat_Viewer SHALL 区分不同鱼的消息（使用不同颜色或位置）
3. WHEN 群聊包含用户发言 THEN Chat_Viewer SHALL 特别标识用户的消息

### 需求 9

**用户故事:** 作为管理员，我希望群聊列表显示关键信息，以便快速筛选感兴趣的对话。

#### 验收标准

1. WHEN 显示群聊列表 THEN Chat_Viewer SHALL 显示群聊主题、创建时间和参与鱼数量
2. WHEN 群聊关联 Our_Tank THEN Chat_Viewer SHALL 显示所属鱼缸名称
3. WHEN 群聊列表为空 THEN Chat_Viewer SHALL 显示"暂无群聊记录"提示

### 需求 10

**用户故事:** 作为管理员，我希望从管理中心首页快速访问新功能模块。

#### 验收标准

1. WHEN 管理员访问管理中心 THEN Admin_Center SHALL 显示网站表现模块入口卡片
2. WHEN 管理员访问管理中心 THEN Admin_Center SHALL 显示群聊信息模块入口卡片
3. WHEN 管理员点击模块卡片 THEN Admin_Center SHALL 导航到对应的功能页面
