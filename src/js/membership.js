/**
 * Membership Page Logic
 * 会员套餐页面逻辑
 */

const BACKEND_URL = window.BACKEND_URL || '';

let currentUser = null;
let currentPlan = 'free';
let memberTypes = [];

// 初始化页面
async function initMembershipPage() {
    try {
        console.log('💎 Initializing membership page...');
        
        // 获取当前用户
        if (window.supabaseAuth && window.supabaseAuth.getCurrentUser) {
            currentUser = await window.supabaseAuth.getCurrentUser();
            if (currentUser) {
                console.log('✅ Current user:', currentUser.id);
                await loadCurrentMembership();
            }
        }
        
        // 加载会员套餐数据
        await loadMemberTypes();
        
        // 渲染套餐卡片
        renderPlanCards();
        
    } catch (error) {
        console.error('❌ Initialization failed:', error);
        showError('Failed to load membership plans: ' + error.message);
    }
}

// 加载当前会员信息
async function loadCurrentMembership() {
    if (!currentUser) return;
    
    try {
        const query = `
            query GetUserMembership($userId: String!) {
                users_by_pk(id: $userId) {
                    user_subscriptions(
                        where: { is_active: { _eq: true } }
                        order_by: { created_at: desc }
                        limit: 1
                    ) {
                        plan
                    }
                }
            }
        `;
        
        const response = await fetch(`${BACKEND_URL}/api/graphql`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                query,
                variables: { userId: currentUser.id }
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        if (result.errors) {
            throw new Error(result.errors[0].message);
        }
        
        if (result.data?.users_by_pk?.user_subscriptions?.[0]) {
            currentPlan = result.data.users_by_pk.user_subscriptions[0].plan;
            console.log('✅ Current plan:', currentPlan);
        }
    } catch (error) {
        console.error('❌ Failed to load current membership:', error);
    }
}

// 加载会员类型数据
async function loadMemberTypes() {
    try {
        const query = `
            query GetMemberTypes {
                member_types(order_by: { fee_per_month: asc }) {
                    id
                    name
                    draw_fish_limit
                    can_self_talk
                    can_group_chat
                    can_promote_owner
                    group_chat_daily_limit
                    fee_per_month
                    fee_per_year
                }
            }
        `;
        
        const response = await fetch(`${BACKEND_URL}/api/graphql`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ query })
        });
        
        if (!response.ok) {
            const text = await response.text();
            console.error('❌ HTTP error:', response.status, response.statusText);
            console.error('Response text:', text.substring(0, 200));
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        if (result.errors) {
            throw new Error(result.errors[0].message);
        }
        
        memberTypes = result.data.member_types || [];
        
        // 过滤掉管理员计划
        memberTypes = memberTypes.filter(type => type.id !== 'admin');
        
        console.log('✅ Loaded member types:', memberTypes);
        console.log('🔍 Raw values:', memberTypes.map(t => ({ 
            id: t.id, 
            draw_fish_limit: t.draw_fish_limit,
            fee_per_month: t.fee_per_month, 
            fee_per_year: t.fee_per_year,
            type_draw_limit: typeof t.draw_fish_limit,
            type_month: typeof t.fee_per_month,
            type_year: typeof t.fee_per_year
        })));
        
        // 转换 fee_per_month 和 fee_per_year 为数字，保留 draw_fish_limit
        memberTypes = memberTypes.map(type => {
            // fee_per_month 是 numeric 类型，可能是字符串、数字或 null
            let monthlyPrice = 0;
            if (type.fee_per_month !== null && type.fee_per_month !== undefined) {
                const parsed = parseFloat(type.fee_per_month);
                if (!isNaN(parsed) && parsed >= 0) {
                    monthlyPrice = parsed;
                }
            }
            
            // fee_per_year 从数据库获取
            let yearlyPrice = 0;
            if (type.fee_per_year !== null && type.fee_per_year !== undefined) {
                const parsed = parseFloat(type.fee_per_year);
                if (!isNaN(parsed) && parsed >= 0) {
                    yearlyPrice = parsed;
                }
            }
            
            // draw_fish_limit 是 String 类型，直接保留
            const drawFishLimit = type.draw_fish_limit || null;
            
            console.log(`💰 ${type.id}: draw_fish_limit=${drawFishLimit}, fee_per_month=${type.fee_per_month} -> monthly_price=${monthlyPrice}, fee_per_year=${type.fee_per_year} -> yearly_price=${yearlyPrice}`);
            
            return {
                ...type,
                draw_fish_limit: drawFishLimit,
                monthly_price: monthlyPrice,
                yearly_price: yearlyPrice
            };
        });
        
        // 检查是否有任何价格数据
        const hasAnyPrice = memberTypes.some(type => type.monthly_price > 0 || (type.fee_per_month !== null && type.fee_per_month !== undefined));
        
        // 如果没有价格数据，使用默认值（但保留从数据库获取的其他数据）
        if (!hasAnyPrice && memberTypes.length > 0) {
            console.warn('⚠️ No price data found in database, using defaults');
            memberTypes = memberTypes.map(type => {
                const defaults = {
                    free: { monthly: 0, yearly: 0 },
                    plus: { monthly: 9.99, yearly: 99.99 },
                    premium: { monthly: 19.99, yearly: 199.99 }
                };
                const def = defaults[type.id] || defaults.free;
                return {
                    ...type,
                    monthly_price: def.monthly,
                    yearly_price: def.yearly
                };
            });
        }
    } catch (error) {
        console.error('❌ Failed to load member types:', error);
        // 使用默认数据
        memberTypes = [
            {
                id: 'free',
                name: 'Free',
                draw_fish_limit: '1',
                can_self_talk: false,
                can_group_chat: false,
                can_promote_owner: false,
                monthly_price: 0,
                yearly_price: 0
            },
            {
                id: 'plus',
                name: 'Plus',
                draw_fish_limit: '5',
                can_self_talk: true,
                can_group_chat: true,
                can_promote_owner: true,
                monthly_price: 9.99,
                yearly_price: 99.99
            },
            {
                id: 'premium',
                name: 'Premium',
                draw_fish_limit: '20',
                can_self_talk: true,
                can_group_chat: true,
                can_promote_owner: true,
                monthly_price: 19.99,
                yearly_price: 199.99
            }
        ];
    }
}

// 渲染套餐卡片
function renderPlanCards() {
    const container = document.getElementById('plans-grid');
    if (!container) {
        console.error('❌ Plans grid container not found');
        return;
    }
    
    container.innerHTML = '';
    
    memberTypes.forEach(plan => {
        const card = createPlanCard(plan);
        container.appendChild(card);
    });
}

// 创建套餐卡片
function createPlanCard(plan) {
    const card = document.createElement('div');
    card.className = `plan-card ${plan.id}`;
    
    const isCurrentPlan = currentUser && currentPlan === plan.id;
    const isUpgrade = currentUser && shouldShowUpgrade(plan.id);
    const needsPayment = plan.id !== 'free';
    
    // 获取会员等级对应的钻石图标
    const iconData = typeof getMembershipIcon === 'function' ? getMembershipIcon(plan.id) : null;
    const badgeIconUrl = iconData ? iconData.svgUrl : '';
    
    // Plus 使用 emoji，其他使用 SVG
    const isPlus = plan.id === 'plus';
    const badgeIcon = isPlus ? '💎' : `<img src="${badgeIconUrl}" alt="${plan.name}" class="plan-badge-icon" style="width: 48px; height: 48px; min-width: 48px; min-height: 48px; max-width: 48px; max-height: 48px; object-fit: contain; display: block;">`;
    
    // 生成唯一ID用于价格切换器
    const priceToggleId = `price-toggle-${plan.id}`;
    const paymentMethodId = `payment-method-${plan.id}`;
    
    card.innerHTML = `
        <div class="plan-badge ${plan.id}">
            ${isPlus ? `<span class="plan-badge-emoji" style="font-size: 48px; line-height: 48px; display: inline-block; width: 48px; height: 48px; text-align: center;">${badgeIcon}</span>` : badgeIcon}
            <span class="plan-badge-text">${plan.name}</span>
        </div>
        
        <div class="plan-price">
            <div class="plan-price-wrapper">
                <div class="plan-price-amount" id="price-amount-${plan.id}">$${plan.monthly_price.toFixed(2)}</div>
                ${plan.yearly_price > 0 ? `
                    <div class="plan-price-toggle">
                        <div class="price-toggle-labels">
                            <span class="price-toggle-label monthly" id="label-monthly-${plan.id}">Monthly</span>
                            <label class="price-toggle-switch">
                                <input type="checkbox" id="${priceToggleId}" class="price-toggle-input" onchange="handlePriceToggle('${plan.id}', ${plan.monthly_price}, ${plan.yearly_price})">
                                <span class="price-toggle-slider"></span>
                            </label>
                            <span class="price-toggle-label yearly" id="label-yearly-${plan.id}">Yearly</span>
                        </div>
                    </div>
                ` : ''}
            </div>
            ${plan.yearly_price > 0 ? `
                <div class="plan-price-savings" id="price-savings-${plan.id}" style="display: none;">
                    <span style="color: #4CD964; font-weight: 700; font-size: 14px;">
                        Save ${Math.round((1 - plan.yearly_price / (plan.monthly_price * 12)) * 100)}%
                    </span>
                </div>
            ` : ''}
        </div>
        
        <ul class="plan-features">
            <li>
                <span class="feature-icon">✅</span>
                <span class="feature-text">Draw your fish${plan.draw_fish_limit && plan.draw_fish_limit !== 'unlimited' ? ` (${plan.draw_fish_limit} per day)` : plan.draw_fish_limit === 'unlimited' ? ' (unlimited)' : ''}</span>
            </li>
            <li>
                <span class="feature-icon">✅</span>
                <span class="feature-text">AI fish Group Chat${plan.group_chat_daily_limit && plan.group_chat_daily_limit !== 'unlimited' ? ` (${plan.group_chat_daily_limit} per day)` : plan.group_chat_daily_limit === 'unlimited' ? ' (unlimited)' : ''}</span>
            </li>
            <li>
                <span class="feature-icon">${plan.id === 'free' ? '❌' : '✅'}</span>
                <span class="feature-text">Fish talk about you</span>
            </li>
            <li>
                <span class="feature-icon">✅</span>
                <span class="feature-text">Join fish chat${plan.group_chat_daily_limit && plan.group_chat_daily_limit !== 'unlimited' ? ` (${plan.group_chat_daily_limit} per day)` : plan.group_chat_daily_limit === 'unlimited' ? ' (unlimited)' : ''}</span>
            </li>
        </ul>
        
        ${needsPayment && !isCurrentPlan ? `
            <div class="payment-method-selector" id="${paymentMethodId}">
                <label class="payment-method-label">💳 Choose Payment Method</label>
                <div class="payment-methods">
                    <div class="payment-method-option">
                        <input type="radio" id="stripe-${plan.id}" name="payment-${plan.id}" value="stripe" class="payment-method-radio" checked>
                        <label for="stripe-${plan.id}" class="payment-method-button">
                            <svg class="payment-method-icon stripe-icon" viewBox="0 0 60 25" xmlns="http://www.w3.org/2000/svg">
                                <path fill="#635BFF" d="M59.64 14.28h-8.06c.19 1.93 1.6 2.55 3.2 2.55 1.64 0 2.96-.37 4.05-.95v3.32a8.33 8.33 0 0 1-4.56 1.1c-4.01 0-6.83-2.5-6.83-7.48 0-4.19 2.39-7.52 6.3-7.52 3.92 0 5.96 3.28 5.96 7.5 0 .4-.04 1.26-.06 1.48zm-5.92-5.62c-1.03 0-2.17.73-2.17 2.58h4.25c0-1.85-1.07-2.58-2.08-2.58zM40.95 20.3c-1.44 0-2.32-.6-2.9-1.04l-.02 4.63-4.12.87V5.57h3.76l.08 1.02a4.7 4.7 0 0 1 3.23-1.29c2.9 0 5.62 2.6 5.62 7.4 0 5.23-2.7 7.6-5.65 7.6zM40 8.95c-.95 0-1.54.34-1.97.81l.02 6.12c.4.44.98.78 1.95.78 1.52 0 2.54-1.65 2.54-3.87 0-2.15-1.04-3.84-2.54-3.84zM28.24 5.57h4.13v14.44h-4.13V5.57zm0-4.7L32.37 0v3.36l-4.13.88V.88zm-4.32 9.35v9.79H19.8V5.57h3.7l.12 1.22c1-1.77 3.07-1.41 3.62-1.22v3.79c-.52-.17-2.29-.43-3.32.86zm-8.55 4.72c0 2.43 2.6 1.68 3.12 1.46v3.36c-.55.3-1.54.54-2.89.54a4.15 4.15 0 0 1-4.27-4.24l.01-13.17 4.02-.86v3.54h3.14V9.1h-3.13v5.85zm-4.91.7c0 2.97-2.31 4.66-5.73 4.66a11.2 11.2 0 0 1-4.46-.93v-3.93c1.38.75 3.1 1.31 4.46 1.31.92 0 1.53-.24 1.53-1C6.26 13.77 0 14.51 0 9.95 0 7.04 2.28 5.3 5.62 5.3c1.36 0 2.72.2 4.09.75v3.88a9.23 9.23 0 0 0-4.1-1.06c-.86 0-1.44.25-1.44.93 0 1.85 6.29.97 6.29 5.88z"/>
                            </svg>
                            <span>Stripe</span>
                        </label>
                    </div>
                    <div class="payment-method-option">
                        <input type="radio" id="paypal-${plan.id}" name="payment-${plan.id}" value="paypal" class="payment-method-radio">
                        <label for="paypal-${plan.id}" class="payment-method-button">
                            <svg class="payment-method-icon paypal-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path fill="#003087" d="M20.067 8.478c.492.88.556 2.014.3 3.327-.74 3.806-3.276 5.12-6.514 5.12h-.5a.805.805 0 0 0-.794.683l-.858 5.437a.682.682 0 0 1-.674.58H7.778a.421.421 0 0 1-.416-.49l1.313-8.326.844-5.336.006-.022a.805.805 0 0 1 .794-.683h2.172c1.959 0 3.464-.407 4.47-1.208.854-.68 1.431-1.58 1.756-2.747a6.17 6.17 0 0 0-.614 2.665z"/>
                                <path fill="#009cde" d="M7.778 2.634h7.174c1.546 0 2.683.318 3.456.969.766.645 1.147 1.588 1.147 2.829 0 .286-.014.549-.043.79-.34 3.454-2.866 5.21-7.511 5.21H9.868l-1.313 8.326a.421.421 0 0 1-.416.49h-3.55a.421.421 0 0 1-.416-.489l2.605-16.536A.805.805 0 0 1 7.778 2.634z"/>
                            </svg>
                            <span>PayPal</span>
                        </label>
                    </div>
                </div>
            </div>
        ` : ''}
        
        <button 
            class="plan-button ${isCurrentPlan ? 'current' : isUpgrade ? 'upgrade ' + plan.id : ''}" 
            data-plan-id="${plan.id}"
            data-billing-period="monthly"
            data-payment-method="stripe"
            ${isCurrentPlan ? 'disabled' : ''}
            onclick="handlePlanButtonClick('${plan.id}')"
        >
            ${isCurrentPlan ? 'Current Plan' : isUpgrade ? 'Upgrade Now ✨' : plan.id === 'free' ? 'Get Started' : 'Upgrade Now ✨'}
        </button>
    `;
    
    // 添加支付方式选择监听
    if (needsPayment && !isCurrentPlan) {
        setTimeout(() => {
            const stripeRadio = document.getElementById(`stripe-${plan.id}`);
            const paypalRadio = document.getElementById(`paypal-${plan.id}`);
            const button = card.querySelector('.plan-button');
            
            if (stripeRadio && paypalRadio && button) {
                stripeRadio.addEventListener('change', () => {
                    button.setAttribute('data-payment-method', 'stripe');
                });
                paypalRadio.addEventListener('change', () => {
                    button.setAttribute('data-payment-method', 'paypal');
                });
            }
        }, 100);
    }
    
    return card;
}

// 处理价格切换（按月/按年）
function handlePriceToggle(planId, monthlyPrice, yearlyPrice) {
    const toggle = document.getElementById(`price-toggle-${planId}`);
    const priceAmount = document.getElementById(`price-amount-${planId}`);
    const priceSavings = document.getElementById(`price-savings-${planId}`);
    const planButton = document.querySelector(`.plan-card.${planId} .plan-button`);
    const monthlyLabel = document.getElementById(`label-monthly-${planId}`);
    const yearlyLabel = document.getElementById(`label-yearly-${planId}`);
    
    if (!toggle || !priceAmount) return;
    
    if (toggle.checked) {
        // 切换到年度
        priceAmount.textContent = `$${yearlyPrice.toFixed(2)}`;
        if (priceSavings) priceSavings.style.display = 'block';
        if (planButton) planButton.setAttribute('data-billing-period', 'yearly');
        if (monthlyLabel) monthlyLabel.style.color = '#666';
        if (yearlyLabel) yearlyLabel.style.color = '#4CD964';
    } else {
        // 切换到月度
        priceAmount.textContent = `$${monthlyPrice.toFixed(2)}`;
        if (priceSavings) priceSavings.style.display = 'none';
        if (planButton) planButton.setAttribute('data-billing-period', 'monthly');
        if (monthlyLabel) monthlyLabel.style.color = '#4CD964';
        if (yearlyLabel) yearlyLabel.style.color = '#666';
    }
}

// 判断是否应该显示升级按钮
function shouldShowUpgrade(planId) {
    if (!currentUser) return false;
    if (planId === 'free') return false;
    
    const planOrder = { free: 0, plus: 1, premium: 2 };
    const currentOrder = planOrder[currentPlan] || 0;
    const targetOrder = planOrder[planId] || 0;
    
    return targetOrder > currentOrder;
}

// 处理套餐按钮点击
async function handlePlanButtonClick(planId) {
    if (!currentUser) {
        // 未登录，跳转到登录页面
        if (window.authUI && window.authUI.showLoginModal) {
            window.authUI.showLoginModal();
        } else {
            window.location.href = 'login.html';
        }
        return;
    }
    
    if (planId === 'free') {
        // Free计划，不需要支付
        alert('Free plan is already available to all users!');
        return;
    }
    
    // 检查是否已经是该计划
    if (currentPlan === planId) {
        alert('You are already on this plan!');
        return;
    }
    
    // 检查是否是降级
    const planOrder = { free: 0, plus: 1, premium: 2 };
    const currentOrder = planOrder[currentPlan] || 0;
    const targetOrder = planOrder[planId] || 0;
    
    if (targetOrder < currentOrder) {
        if (!confirm('Are you sure you want to downgrade? Your current features will be limited.')) {
            return;
        }
    }
    
    // 获取选择的计费周期和支付方式
    const planButton = document.querySelector(`.plan-card.${planId} .plan-button`);
    const billingPeriod = planButton ? (planButton.getAttribute('data-billing-period') || 'monthly') : 'monthly';
    const paymentMethod = planButton ? (planButton.getAttribute('data-payment-method') || 'stripe') : 'stripe';
    
    console.log(`💳 Selected payment method: ${paymentMethod}`);
    
    // 根据支付方式调用不同的API
    try {
        if (paymentMethod === 'paypal') {
            // PayPal支付流程
            showLoading('Creating PayPal subscription...');
            
            const response = await fetch('/api/payment?action=paypal-create-subscription', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    userId: currentUser.id,
                    planId: planId,
                    billingPeriod: billingPeriod
                })
            });
            
            const result = await response.json();
            
            if (!response.ok) {
                throw new Error(result.error || 'Failed to create PayPal subscription');
            }
            
            if (result.url) {
                // 重定向到PayPal
                window.location.href = result.url;
            } else {
                throw new Error('No PayPal URL returned');
            }
        } else {
            // Stripe支付流程
            showLoading('Creating checkout session...');
            
            const response = await fetch('/api/payment?action=create-checkout', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    userId: currentUser.id,
                    planId: planId,
                    billingPeriod: billingPeriod
                })
            });
            
            const result = await response.json();
            
            if (!response.ok) {
                throw new Error(result.error || 'Failed to create checkout session');
            }
            
            if (result.url) {
                // 重定向到Stripe Checkout
                window.location.href = result.url;
            } else {
                throw new Error('No checkout URL returned');
            }
        }
    } catch (error) {
        console.error('❌ Checkout error:', error);
        hideLoading();
        showError('Failed to start checkout: ' + error.message);
    }
}

// 显示加载状态
function showLoading(message) {
    // 可以添加加载提示
    console.log('⏳', message);
}

// 隐藏加载状态
function hideLoading() {
    // 可以移除加载提示
}

// 显示错误
function showError(message) {
    alert('Error: ' + message);
}

// 页面加载完成后初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMembershipPage);
} else {
    initMembershipPage();
}

// 导出函数供全局使用
window.handlePlanButtonClick = handlePlanButtonClick;
window.handlePriceToggle = handlePriceToggle;

