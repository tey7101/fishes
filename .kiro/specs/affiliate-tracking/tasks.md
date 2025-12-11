# 实现计划

- [x] 1. 数据库结构修改


  - [x] 1.1 在 member_types 表添加 affiliate 会员类型


    - 复制 premium 的权限配置
    - _需求: 1.1_
  - [x] 1.2 在 users 表添加推广者相关字段

    - 添加 referral_code (VARCHAR(20), UNIQUE)
    - 添加 referred_by (VARCHAR(255), 外键关联 users.id)
    - 添加 commission_rate (DECIMAL(5,2), 默认 10.00)
    - _需求: 1.1, 2.2_
  - [x] 1.3 在 payment 表添加 affiliate_id 字段

    - 添加 affiliate_id (VARCHAR(255), 外键关联 users.id)
    - _需求: 2.3_

- [x] 2. 后端 API 实现


  - [x] 2.1 创建 api/affiliate-api.js 基础结构


    - 实现路由分发逻辑
    - 添加管理员权限验证
    - _需求: 1.1, 1.2_
  - [x] 2.2 实现推广者管理接口

    - create: 将用户设为推广者，生成唯一推广码
    - list: 获取所有推广者列表及统计数据
    - update: 更新推广者佣金比例
    - _需求: 1.1, 1.2, 1.3_
  - [x] 2.3 编写推广码唯一性属性测试


    - **Property 1: 推广码唯一性**
    - **验证: 需求 1.1**
  - [x] 2.4 实现推广者面板接口

    - dashboard: 获取推广者自己的统计数据
    - referrals: 获取推荐用户列表
    - _需求: 3.1, 3.2, 3.3_
  - [x] 2.5 编写统计数据准确性属性测试

    - **Property 4: 统计数据准确性**
    - **验证: 需求 3.2, 4.1**
  - [x] 2.6 实现管理员报表接口

    - report: 获取所有推广者汇总报表，支持日期筛选
    - export: 导出 CSV 报表
    - _需求: 4.1, 4.2, 4.3_
  - [x] 2.7 编写日期筛选正确性属性测试

    - **Property 5: 日期筛选正确性**
    - **验证: 需求 4.2**

- [x] 3. 推广码捕获和关联逻辑


  - [x] 3.1 修改 index.html 捕获推广码


    - 检测 URL 参数 ?ref=CODE
    - 存储到 localStorage
    - _需求: 2.1_
  - [x] 3.2 修改注册流程关联推广者


    - 注册时检查 localStorage 中的推广码
    - 查询推广者并设置 referred_by 字段
    - _需求: 2.2_
  - [x] 3.3 编写推荐关系正确性属性测试

    - **Property 2: 推荐关系正确性**
    - **验证: 需求 2.2**
  - [x] 3.4 修改付费流程关联推广者


    - 付费时检查用户的 referred_by 字段
    - 将 affiliate_id 写入 payment 记录
    - _需求: 2.3_
  - [x] 3.5 编写付费归属正确性属性测试

    - **Property 3: 付费归属正确性**
    - **验证: 需求 2.3**

- [x] 4. 前端页面实现



  - [x] 4.1 创建管理员推广者管理页面 admin-affiliates.html

    - 推广者列表展示
    - 创建推广者功能（选择现有用户）
    - 修改佣金比例功能
    - 查看推广者详情和推荐列表
    - _需求: 1.1, 1.2, 4.1_

  - [x] 4.2 创建推广者面板页面 affiliate-dashboard.html

    - 显示推广链接和推广码
    - 显示统计数据（总推荐数、总收入、总佣金）
    - 显示推荐用户列表
    - _需求: 3.1, 3.2, 3.3_
  - [x] 4.3 实现日期筛选和数据导出功能


    - 管理员页面添加日期范围选择器
    - 实现 CSV 导出按钮
    - _需求: 4.2, 4.3_

- [x] 5. 检查点 - 确保所有测试通过



  - 确保所有测试通过，如有问题请询问用户。


- [x] 6. 后台管理页面架构优化



  - [x] 6.1 修改导航栏 Test 按钮为 Dashboard 下拉菜单
    - [x] CSS 样式已添加到 cute-game-style.css
    - [x] auth-ui.js 中已实现 showDashboardMenu/hideDashboardMenu 方法

    - [x] auth-ui.js 中已实现 updateDashboardMenuVisibility 权限检查
    - [x] 在 index.html 中添加 Dashboard 下拉菜单 HTML 结构
    - [x] auth-ui.js 中添加 bindDashboardMenuEvents 方法
    - _需求: 5.1_

  - [x] 6.2 创建管理中心页面 admin-center.html
    - [x] 将数据表管理功能入口移到此页面
    - [x] 添加推广者管理入口
    - [x] 添加内容审核和会员管理入口
    - _需求: 5.2_



  - [x] 6.3 优化测试中心页面 test-center.html
    - [x] 移除数据表管理入口（已移至管理中心）
    - [x] 保留 API 测试相关功能


    - _需求: 页面优化_



  - [x] 6.4 实现权限控制逻辑
    - [x] admin-auth.js 已支持 checkAffiliateAccess 推广者权限检查
    - [x] admin-auth.js 已支持 requireAffiliateOrAdminAccess 方法
    - [x] auth-ui.js 已实现基于权限的菜单显示逻辑
    - _需求: 5.3, 5.4_

- [x] 7. 检查点 - 确保页面优化完成
  - 确保所有页面正常工作，权限控制正确。
