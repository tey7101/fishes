# Design Document: Onboarding Tutorial

## Overview

本设计文档描述 FishTalk.app 新手引导系统的技术实现方案。系统使用 Driver.js 库实现高亮遮罩和气泡提示效果，为首次访问的用户提供交互式操作指引。

核心目标：
- 引导新用户完成绘制鱼 → AI 验证 → 提交作品的完整流程
- 提供流畅的步骤导航体验
- 支持移动端响应式布局
- 与现有 cute-game-style 主题保持视觉一致性

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        index.html                           │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                   app.js (existing)                  │   │
│  │  - 页面初始化完成后调用 onboarding.init()            │   │
│  └─────────────────────────────────────────────────────┘   │
│                            │                                │
│                            ▼                                │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              src/js/onboarding.js (new)              │   │
│  │  - 首次访问检测 (localStorage)                       │   │
│  │  - Driver.js 配置和步骤定义                          │   │
│  │  - 手动触发接口                                      │   │
│  │  - 自定义样式注入                                    │   │
│  └─────────────────────────────────────────────────────┘   │
│                            │                                │
│                            ▼                                │
│  ┌─────────────────────────────────────────────────────┐   │
│  │           Driver.js (CDN loaded)                     │   │
│  │  - 高亮遮罩渲染                                      │   │
│  │  - Popover 气泡提示                                  │   │
│  │  - 步骤导航控制                                      │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### 1. OnboardingManager (src/js/onboarding.js)

主模块，负责引导系统的初始化和控制。

```javascript
window.onboardingManager = {
  // 常量
  STORAGE_KEY: 'fishtalk_onboarding_completed',
  
  // 初始化 - 页面加载后调用
  init(): void,
  
  // 检查是否首次访问
  isFirstVisit(): boolean,
  
  // 标记引导已完成
  markCompleted(): void,
  
  // 启动引导（自动或手动）
  startTutorial(force?: boolean): void,
  
  // 获取引导步骤配置
  getSteps(): DriverStep[],
  
  // Driver.js 实例
  driverInstance: Driver | null
};
```

### 2. Tutorial Steps Configuration

引导步骤定义，每个步骤包含目标元素和提示内容。

```javascript
const tutorialSteps = [
  {
    // Step 1: 欢迎介绍
    popover: {
      title: '🐟 Welcome to FishTalk!',
      description: 'Let me show you how to create your first talking fish in just a few steps!',
      side: 'center',
      align: 'center'
    }
  },
  {
    // Step 2: 画布介绍
    element: '#draw-canvas',
    popover: {
      title: '🎨 Draw Your Fish',
      description: 'Use your mouse or finger to draw a fish here. Make sure it faces right! →',
      side: 'bottom',
      align: 'center'
    }
  },
  {
    // Step 3: AI 验证说明
    element: '#fish-probability',
    popover: {
      title: '🤖 AI Validation',
      description: 'Our AI will analyze your drawing in real-time. Try to get above 50% fish probability!',
      side: 'top',
      align: 'center'
    }
  },
  {
    // Step 4: 提交按钮
    element: '#swim-btn',
    popover: {
      title: '🌊 Make it Swim!',
      description: 'When you\'re happy with your fish, click here to add it to the global tank!',
      side: 'top',
      align: 'center'
    }
  },
  {
    // Step 5: 导航按钮
    element: '.game-btn-group',
    popover: {
      title: '🏆 Explore More',
      description: 'Visit the Global Tank to see other fish, or check the Rank to vote for your favorites!',
      side: 'top',
      align: 'center'
    }
  }
];
```

### 3. Driver.js Configuration

Driver.js 实例配置。

```javascript
const driverConfig = {
  showProgress: true,           // 显示进度指示器
  showButtons: ['next', 'previous', 'close'],
  nextBtnText: 'Next →',
  prevBtnText: '← Back',
  doneBtnText: 'Start Drawing! 🎨',
  progressText: '{{current}} / {{total}}',
  allowClose: true,             // 允许点击关闭按钮
  overlayClickNext: false,      // 点击遮罩不跳转
  stagePadding: 10,             // 高亮区域内边距
  stageRadius: 8,               // 高亮区域圆角
  animate: true,                // 启用动画
  smoothScroll: true,           // 平滑滚动
  disableActiveInteraction: false, // 允许与高亮元素交互
  popoverClass: 'fishtalk-popover', // 自定义样式类
  onDestroyStarted: () => {
    // 引导结束时标记完成
    onboardingManager.markCompleted();
  }
};
```

## Data Models

### LocalStorage Schema

```javascript
// 存储键
const STORAGE_KEY = 'fishtalk_onboarding_completed';

// 存储值结构
{
  completed: boolean,      // 是否已完成引导
  completedAt: string,     // 完成时间 ISO 格式
  version: number          // 引导版本号（用于未来更新）
}

// 示例
localStorage.setItem('fishtalk_onboarding_completed', JSON.stringify({
  completed: true,
  completedAt: '2024-12-17T10:30:00Z',
  version: 1
}));
```

### DriverStep Interface

```typescript
interface DriverStep {
  element?: string;           // CSS 选择器，可选（无则显示居中弹窗）
  popover: {
    title: string;            // 标题
    description: string;      // 描述文字
    side?: 'top' | 'bottom' | 'left' | 'right' | 'center';
    align?: 'start' | 'center' | 'end';
  };
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

Based on the prework analysis, the following correctness properties have been identified:

### Property 1: First Visit Detection Consistency
*For any* localStorage state, if the First_Visit_Flag is not set or is set to `completed: false`, then calling `isFirstVisit()` should return `true`; otherwise it should return `false`.
**Validates: Requirements 1.1, 1.3**

### Property 2: Tutorial Completion Persistence
*For any* tutorial session that ends (via completion or skip), the localStorage should contain a valid completion record with `completed: true` and a valid timestamp.
**Validates: Requirements 1.4**

### Property 3: Overlay Visibility During Highlighting
*For any* active tutorial step that targets an element, the highlight overlay should be visible (opacity > 0) and the target element should be visually distinguished from the rest of the page.
**Validates: Requirements 2.4**

### Property 4: Navigation Button State Consistency
*For any* tutorial step at index `i` where `0 < i < totalSteps - 1`, both "Next" and "Previous" buttons should be visible and enabled.
**Validates: Requirements 3.1**

### Property 5: Step Index Increment on Next
*For any* tutorial at step index `i` where `i < totalSteps - 1`, clicking the "Next" button should result in the tutorial advancing to step `i + 1`.
**Validates: Requirements 3.2**

### Property 6: Step Index Decrement on Previous
*For any* tutorial at step index `i` where `i > 0`, clicking the "Previous" button should result in the tutorial returning to step `i - 1`.
**Validates: Requirements 3.3**

### Property 7: Skip Button Terminates Tutorial
*For any* active tutorial step, clicking the skip/close button should result in the tutorial being destroyed and the overlay being removed from the DOM.
**Validates: Requirements 4.1, 4.2**

### Property 8: Click Outside Does Not Dismiss
*For any* active tutorial step, clicking on the overlay (outside the popover) should not cause the tutorial to advance or dismiss.
**Validates: Requirements 4.3**

### Property 9: Escape Key Terminates Tutorial
*For any* active tutorial, pressing the Escape key should result in the tutorial being destroyed.
**Validates: Requirements 4.4**

### Property 10: Manual Trigger Ignores Completion Flag
*For any* localStorage state (including `completed: true`), calling `startTutorial(true)` should start the tutorial from step 0.
**Validates: Requirements 5.2, 5.3**

### Property 11: Mobile Viewport Popover Containment
*For any* viewport width less than 768px and any tutorial step, the popover element should be fully contained within the viewport boundaries (no overflow).
**Validates: Requirements 6.1, 6.2**

### Property 12: Auto-Scroll to Hidden Elements
*For any* tutorial step targeting an element that is outside the current viewport, the page should scroll to bring the element into view before highlighting.
**Validates: Requirements 6.3**

## Error Handling

| 场景 | 处理方式 |
|------|----------|
| Driver.js CDN 加载失败 | 静默失败，不显示引导，记录 console.warn |
| 目标元素不存在 | 跳过该步骤，继续下一步 |
| localStorage 不可用 | 每次都显示引导（降级处理） |
| 移动端元素位置异常 | 使用 center 定位作为 fallback |

## Testing Strategy

### Unit Tests

使用 Vitest 进行单元测试：

1. `isFirstVisit()` 函数测试
   - localStorage 为空时返回 true
   - localStorage 有完成记录时返回 false
   - localStorage 数据损坏时返回 true（降级）

2. `markCompleted()` 函数测试
   - 正确写入 localStorage
   - 包含正确的时间戳和版本号

3. `getSteps()` 函数测试
   - 返回正确数量的步骤
   - 每个步骤包含必要的 popover 配置

### Property-Based Tests

使用 fast-check 进行属性测试：

1. **Property 1 测试**: 生成随机 localStorage 状态，验证 `isFirstVisit()` 返回值一致性
2. **Property 2 测试**: 模拟多次完成/跳过操作，验证 localStorage 始终包含有效记录
3. **Property 5/6 测试**: 生成随机步骤索引，验证导航操作后索引变化正确

测试配置：
- 每个属性测试运行最少 100 次迭代
- 使用 `// **Feature: onboarding-tutorial, Property N: description**` 格式标注测试

### Integration Tests

手动测试清单：
- [ ] 首次访问自动触发引导
- [ ] 完成引导后刷新页面不再触发
- [ ] 清除 localStorage 后重新触发
- [ ] 移动端布局正常
- [ ] 所有步骤元素正确高亮
