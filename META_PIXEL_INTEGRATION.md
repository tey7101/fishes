# Meta Pixel 集成完成

## 概述
已成功在 FishTalk.app 的关键页面添加 Meta Pixel 代码（Pixel ID: 1187103726151352），用于追踪用户行为和转化事件。

## 已添加 Meta Pixel 的页面

### 1. **index.html** (首页)
- **事件**: `PageView`
- **用途**: 追踪访问首页的用户
- **位置**: `<head>` 标签内，Google Analytics 之前

### 2. **login.html** (登录/注册页)
- **事件**: 
  - `PageView` - 页面访问
  - `CompleteRegistration` - 注册成功时触发（在 login.js 中）
- **用途**: 追踪用户注册转化
- **位置**: `<head>` 标签内

### 3. **membership.html** (会员套餐页)
- **事件**: 
  - `PageView`
  - `ViewContent` - 查看会员套餐内容
- **参数**:
  ```javascript
  {
    content_name: 'Membership Plans',
    content_category: 'Subscription'
  }
  ```
- **用途**: 追踪用户对会员套餐的兴趣
- **位置**: `<head>` 标签内

### 4. **stripe-success.html** (Stripe 支付成功页) ⭐
- **事件**: 
  - `PageView`
  - `Purchase` - 购买转化事件
- **参数**:
  ```javascript
  {
    value: 1.00,
    currency: 'USD',
    content_name: 'Membership Subscription',
    content_type: 'product'
  }
  ```
- **用途**: 追踪 Stripe 支付转化（关键转化事件）
- **位置**: `<head>` 标签内

### 5. **paypal-success.html** (PayPal 支付成功页) ⭐
- **事件**: 
  - `PageView`
  - `Purchase` - 购买转化事件
- **参数**:
  ```javascript
  {
    value: 1.00,
    currency: 'USD',
    content_name: 'Membership Subscription',
    content_type: 'product'
  }
  ```
- **用途**: 追踪 PayPal 支付转化（关键转化事件）
- **位置**: `<head>` 标签内

### 6. **tank.html** (全局鱼缸页)
- **事件**: `PageView`
- **用途**: 追踪用户互动和参与度
- **位置**: `<head>` 标签内

### 7. **myfish.html** (我的鱼收藏页)
- **事件**: `PageView`
- **用途**: 追踪用户参与度
- **位置**: `<head>` 标签内

### 8. **fish-drawing-game.html** (鱼绘画游戏页)
- **事件**: `PageView`
- **用途**: 追踪游戏页面访问
- **位置**: `<head>` 标签内

## Meta Pixel 代码结构

### 基础代码（所有页面）
```html
<!-- Meta Pixel Code -->
<script>
!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window, document,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '1187103726151352');
fbq('track', 'PageView');
</script>
<noscript><img height="1" width="1" style="display:none" src="https://www.facebook.com/tr?id=1187103726151352&ev=PageView&noscript=1"/></noscript>
<!-- End Meta Pixel Code -->
```

### 注册完成事件（login.js）
```javascript
// Track registration completion with Meta Pixel
if (typeof fbq !== 'undefined') {
  fbq('track', 'CompleteRegistration', {
    content_name: 'User Registration',
    status: 'success'
  });
}
```

## Facebook 广告转化追踪设置

### 1. 在 Facebook Events Manager 中验证
1. 访问 [Facebook Events Manager](https://business.facebook.com/events_manager2)
2. 选择 Pixel ID: 1187103726151352
3. 查看"测试事件"标签，验证事件是否正常触发

### 2. 创建自定义转化
在 Events Manager 中创建以下自定义转化：

#### 转化 1: 注册完成
- **事件**: CompleteRegistration
- **URL 规则**: 包含 `login.html`

#### 转化 2: 查看会员套餐
- **事件**: ViewContent
- **URL 规则**: 包含 `membership.html`

#### 转化 3: 购买完成（主要转化）
- **事件**: Purchase
- **URL 规则**: 包含 `success.html`

### 3. 在广告系列中使用转化
1. 创建新的广告系列
2. 选择"转化"作为目标
3. 在"转化事件"中选择"Purchase"
4. Facebook 将自动优化广告投放以获得更多购买转化

## 测试 Meta Pixel

### 使用 Facebook Pixel Helper
1. 安装 [Facebook Pixel Helper](https://chrome.google.com/webstore/detail/facebook-pixel-helper/fdgfkebogiimcoedlicjlajpkdmockpc) Chrome 扩展
2. 访问网站的各个页面
3. 点击扩展图标，查看 Pixel 是否正确触发
4. 验证事件参数是否正确

### 测试流程
1. **首页访问**: 访问 index.html → 应触发 PageView
2. **注册流程**: 
   - 访问 login.html → 触发 PageView
   - 完成注册 → 触发 CompleteRegistration
3. **会员套餐**: 访问 membership.html → 触发 PageView + ViewContent
4. **购买转化**: 
   - 完成支付 → 重定向到 stripe-success.html 或 paypal-success.html
   - 应触发 PageView + Purchase

## 优化建议

### 1. 动态价值追踪
当前 Purchase 事件使用固定值 1.00 USD。建议根据实际套餐价格动态设置：

```javascript
// 在支付成功页面获取实际价格
const urlParams = new URLSearchParams(window.location.search);
const planPrice = urlParams.get('price') || 1.00;

fbq('track', 'Purchase', {
  value: parseFloat(planPrice),
  currency: 'USD',
  content_name: 'Membership Subscription',
  content_type: 'product'
});
```

### 2. 添加更多事件
考虑添加以下事件以获得更好的优化：

- **AddToCart**: 用户点击"Upgrade"按钮时
- **InitiateCheckout**: 用户进入支付流程时
- **Lead**: 用户填写表单时

### 3. 创建自定义受众
在 Facebook Ads Manager 中创建以下自定义受众：

1. **网站访问者**: 访问过任何页面的用户（180天）
2. **会员套餐查看者**: 访问过 membership.html 的用户（30天）
3. **购买者**: 触发过 Purchase 事件的用户（180天）
4. **注册用户**: 触发过 CompleteRegistration 的用户（180天）

### 4. 创建类似受众
基于"购买者"受众创建类似受众，以找到更多可能转化的用户。

## 注意事项

1. **隐私合规**: 确保网站有适当的隐私政策和 Cookie 同意机制
2. **数据延迟**: Meta Pixel 数据可能有 15-30 分钟的延迟
3. **测试模式**: 使用 Facebook Pixel Helper 进行测试，避免影响实际数据
4. **事件去重**: 确保同一转化不会被重复追踪

## 下一步

1. ✅ 在 Facebook Events Manager 中验证所有事件
2. ✅ 创建自定义转化
3. ✅ 设置转化广告系列
4. ⏳ 监控转化数据（需要 7-14 天的学习期）
5. ⏳ 根据数据优化广告投放

## 支持

如有问题，请参考：
- [Meta Pixel 文档](https://developers.facebook.com/docs/meta-pixel)
- [Facebook Events Manager](https://business.facebook.com/events_manager2)
- [Meta Business Help Center](https://www.facebook.com/business/help)
