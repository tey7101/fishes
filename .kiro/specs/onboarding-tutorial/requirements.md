# Requirements Document

## Introduction

本功能为 FishTalk.app 实现新手引导系统（Onboarding Tutorial），使用 Driver.js 库为首次访问的用户提供一步步的交互式操作指引。引导用户完成绘制鱼、AI 验证、提交作品等核心流程，提升新用户的上手体验和留存率。

## Glossary

- **Onboarding_System**: 新手引导系统，负责检测新用户并展示引导流程
- **Tutorial_Step**: 引导步骤，包含高亮元素、提示标题、描述文字
- **Driver.js**: 轻量级开源引导库，用于实现高亮遮罩和气泡提示效果
- **First_Visit_Flag**: 首次访问标记，存储在 localStorage 中用于判断是否显示引导
- **Highlight_Overlay**: 高亮遮罩层，用于聚焦当前引导步骤的目标元素
- **Popover**: 气泡提示框，显示当前步骤的说明文字

## Requirements

### Requirement 1

**User Story:** As a first-time visitor, I want to see a step-by-step tutorial when I visit the drawing page, so that I can quickly understand how to use the app.

#### Acceptance Criteria

1. WHEN a user visits index.html for the first time THEN the Onboarding_System SHALL automatically start the tutorial after page load completes
2. WHEN the tutorial starts THEN the Onboarding_System SHALL display a welcome message explaining the app's purpose
3. WHEN the Onboarding_System checks for first visit THEN the Onboarding_System SHALL read the First_Visit_Flag from localStorage
4. WHEN a user completes or skips the tutorial THEN the Onboarding_System SHALL set the First_Visit_Flag to prevent future automatic starts

### Requirement 2

**User Story:** As a new user, I want to be guided through the drawing process, so that I can successfully create my first fish.

#### Acceptance Criteria

1. WHEN the tutorial reaches the canvas step THEN the Onboarding_System SHALL highlight the draw-canvas element with a Popover explaining how to draw
2. WHEN the tutorial reaches the probability indicator step THEN the Onboarding_System SHALL highlight the fish-probability element explaining AI validation
3. WHEN the tutorial reaches the submit step THEN the Onboarding_System SHALL highlight the swim-btn element explaining how to submit
4. WHEN highlighting an element THEN the Onboarding_System SHALL use a semi-transparent Highlight_Overlay to focus user attention

### Requirement 3

**User Story:** As a user going through the tutorial, I want to navigate between steps freely, so that I can review previous steps or skip ahead.

#### Acceptance Criteria

1. WHEN a Tutorial_Step is displayed THEN the Onboarding_System SHALL show "Next" and "Previous" navigation buttons
2. WHEN the user clicks the "Next" button THEN the Onboarding_System SHALL advance to the next Tutorial_Step with smooth animation
3. WHEN the user clicks the "Previous" button THEN the Onboarding_System SHALL return to the previous Tutorial_Step
4. WHEN the user is on the first step THEN the Onboarding_System SHALL hide the "Previous" button
5. WHEN the user is on the last step THEN the Onboarding_System SHALL show a "Finish" button instead of "Next"

### Requirement 4

**User Story:** As a user, I want to skip or exit the tutorial at any time, so that I can start using the app immediately if I prefer.

#### Acceptance Criteria

1. WHEN a Tutorial_Step is displayed THEN the Onboarding_System SHALL show a "Skip" or close button
2. WHEN the user clicks the skip button THEN the Onboarding_System SHALL immediately end the tutorial and remove the Highlight_Overlay
3. WHEN the user clicks outside the Popover THEN the Onboarding_System SHALL keep the tutorial active and not dismiss it
4. WHEN the user presses the Escape key THEN the Onboarding_System SHALL end the tutorial

### Requirement 5

**User Story:** As a returning user, I want to manually restart the tutorial, so that I can refresh my memory on how to use the app.

#### Acceptance Criteria

1. WHEN a user wants to restart the tutorial THEN the Onboarding_System SHALL provide a way to trigger the tutorial manually
2. WHEN the manual trigger is activated THEN the Onboarding_System SHALL start the tutorial from the first step regardless of First_Visit_Flag
3. WHEN the tutorial is manually triggered THEN the Onboarding_System SHALL display the same steps as the automatic tutorial

### Requirement 6

**User Story:** As a mobile user, I want the tutorial to work well on my device, so that I can learn the app on any screen size.

#### Acceptance Criteria

1. WHEN the tutorial runs on a mobile device THEN the Onboarding_System SHALL position Popovers to remain fully visible within the viewport
2. WHEN the screen width is less than 768px THEN the Onboarding_System SHALL adjust Popover positioning to avoid overflow
3. WHEN a highlighted element is not visible THEN the Onboarding_System SHALL scroll the page to bring the element into view

### Requirement 7

**User Story:** As a user, I want the tutorial to match the app's visual style, so that the experience feels cohesive and professional.

#### Acceptance Criteria

1. WHEN displaying Popovers THEN the Onboarding_System SHALL use colors and fonts consistent with the cute-game-style theme
2. WHEN displaying the Highlight_Overlay THEN the Onboarding_System SHALL use a semi-transparent dark background matching the app's aesthetic
3. WHEN showing navigation buttons THEN the Onboarding_System SHALL style them consistently with the game-btn class styles
