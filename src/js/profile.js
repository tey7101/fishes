// Profile page functionality v2.5
console.log('📄 Profile.js v2.5 已加载');

/**
 * 显示账号保存弹窗（匿名用户绑定邮箱/社交账号）
 */
function showSaveAccountModal() {
    const overlay = document.createElement('div');
    overlay.className = 'save-account-overlay';
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background: rgba(0, 0, 0, 0.7);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        backdrop-filter: blur(4px);
    `;
    
    const modal = document.createElement('div');
    modal.style.cssText = `
        background: white;
        padding: 30px;
        border-radius: 20px;
        max-width: 420px;
        width: 90%;
        text-align: center;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        animation: modalBounce 0.3s ease;
    `;
    
    modal.innerHTML = `
        <div style="font-size: 48px; margin-bottom: 16px;">💾</div>
        <h2 style="color: #1f2937; margin-bottom: 12px; font-size: 22px;">Save Your Account</h2>
        <p style="color: #6b7280; margin-bottom: 24px; line-height: 1.6;">
            Sign in to save your account permanently and sync your fish across all devices (PC, phone, tablet).
        </p>
        <div style="display: flex; flex-direction: column; gap: 12px;">
            <button id="save-email-btn" style="
                padding: 14px 24px;
                background: white;
                color: #1f2937;
                border: 2px solid #e5e7eb;
                border-radius: 12px;
                font-size: 16px;
                font-weight: 600;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
                transition: all 0.2s ease;
            ">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6366F1" stroke-width="2">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                    <polyline points="22,6 12,13 2,6"></polyline>
                </svg>
                Sign in with Email
            </button>
            <button id="save-google-btn" style="
                padding: 14px 24px;
                background: white;
                color: #1f2937;
                border: 2px solid #e5e7eb;
                border-radius: 12px;
                font-size: 16px;
                font-weight: 600;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
                transition: all 0.2s ease;
            ">
                <svg width="20" height="20" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Sign in with Google
            </button>
            <button id="save-discord-btn" style="
                padding: 14px 24px;
                background: white;
                color: #1f2937;
                border: 2px solid #e5e7eb;
                border-radius: 12px;
                font-size: 16px;
                font-weight: 600;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
                transition: all 0.2s ease;
            ">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="#5865F2">
                    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z"/>
                </svg>
                Sign in with Discord
            </button>
            <button id="cancel-save-btn" style="
                padding: 12px 24px;
                background: transparent;
                color: #6b7280;
                border: none;
                font-size: 14px;
                cursor: pointer;
            ">
                Maybe Later
            </button>
        </div>
    `;
    
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    
    // 绑定事件 - 使用 signInWithOAuth 替代 linkIdentity（因为 Supabase 默认禁用 manual linking）
    document.getElementById('save-email-btn').onclick = () => {
        document.body.removeChild(overlay);
        window.location.href = 'login.html?action=upgrade';
    };
    
    document.getElementById('save-google-btn').onclick = async () => {
        if (window.supabaseAuth && window.supabaseAuth.signInWithOAuth) {
            document.body.removeChild(overlay);
            const { error } = await window.supabaseAuth.signInWithOAuth('google');
            if (error) {
                alert('Sign in failed: ' + error.message);
            }
        }
    };
    
    document.getElementById('save-discord-btn').onclick = async () => {
        if (window.supabaseAuth && window.supabaseAuth.signInWithOAuth) {
            document.body.removeChild(overlay);
            const { error } = await window.supabaseAuth.signInWithOAuth('discord');
            if (error) {
                alert('Sign in failed: ' + error.message);
            }
        }
    };
    
    document.getElementById('cancel-save-btn').onclick = () => {
        document.body.removeChild(overlay);
    };
    
    overlay.onclick = (e) => {
        if (e.target === overlay) {
            document.body.removeChild(overlay);
        }
    };
}

// Get user profile data from Hasura
async function getUserProfileFromHasura(userId) {
    try {
        const query = `
            query GetUserProfile($userId: String!) {
                users_by_pk(id: $userId) {
                    id
                    nick_name
                    email
                    avatar_url
                    created_at
                    reputation_score
                    user_language
                    about_me
                    fish_talk
                    user_subscriptions(
                        where: { is_active: { _eq: true } }
                        order_by: { created_at: desc }
                        limit: 1
                    ) {
                        plan
                        is_active
                        created_at
                        member_type {
                            id
                            name
                        }
                    }
                    fishes_aggregate {
                        aggregate {
                            count
                            sum {
                                upvotes
                            }
                        }
                    }
                }
                fish_favorites_aggregate(where: {user_id: {_eq: $userId}}) {
                    aggregate {
                        count
                    }
                }
            }
        `;

        const response = await fetch('/api/graphql', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                query,
                variables: { userId }
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();

        if (result.errors) {
            console.error('GraphQL errors:', result.errors);
            throw new Error(result.errors[0].message);
        }

        if (!result.data.users_by_pk) {
            throw new Error('User not found');
        }

        const user = result.data.users_by_pk;
        
        // Get favorite count from separate query
        const favoriteCount = result.data.fish_favorites_aggregate?.aggregate?.count || 0;
        
        // Get membership info
        // Query already filtered for is_active = true and sorted by created_at desc, limit 1
        const subscriptions = user.user_subscriptions || [];
        const activeSubscription = subscriptions.length > 0 ? subscriptions[0] : null;
        
        // Debug: 输出订阅信息
        console.log('🔍 Active subscription:', activeSubscription ? {
            plan: activeSubscription.plan,
            is_active: activeSubscription.is_active,
            created_at: activeSubscription.created_at,
            member_type_id: activeSubscription.member_type?.id,
            member_type_name: activeSubscription.member_type?.name
        } : 'No active subscription found');
        
        // Determine membership tier
        // Priority: plan field > member_type.id > default to 'free'
        let membershipTier = 'free';
        let membershipName = 'Free';
        
        if (activeSubscription) {
            // Use plan field if available (most reliable)
            if (activeSubscription.plan) {
                membershipTier = activeSubscription.plan.toLowerCase().trim();
                console.log('✅ Using plan field for tier:', membershipTier);
            } 
            // Fallback to member_type.id
            else if (activeSubscription.member_type?.id) {
                membershipTier = activeSubscription.member_type.id.toLowerCase().trim();
                console.log('✅ Using member_type.id for tier:', membershipTier);
            }
            
            // Get membership name
            if (activeSubscription.member_type?.name) {
                membershipName = activeSubscription.member_type.name;
            } else {
                // Fallback name based on tier
                const tierNames = {
                    'free': 'Free',
                    'plus': 'Plus',
                    'premium': 'Premium',
                    'test_plus': 'Test Plus',
                    'test_premium': 'Test Premium'
                };
                membershipName = tierNames[membershipTier] || 'Free';
            }
        } else {
            console.log('⚠️ No active subscription found, using free tier');
        }
        
        // Debug logging
        console.log('📊 Profile data:', {
            userId: user.id,
            fishCount: user.fishes_aggregate.aggregate.count || 0,
            favoriteCount: favoriteCount,
            membershipTier: membershipTier,
            membershipName: membershipName,
            subscriptionPlan: activeSubscription?.plan,
            subscriptionIsActive: activeSubscription?.is_active
        });
        
        // Transform to match expected profile format
        return {
            userId: user.id,
            displayName: user.nick_name,
            artistName: user.nick_name,
            nickName: user.nick_name || '', // 用户昵称
            email: user.email,
            avatarUrl: user.avatar_url,
            createdAt: user.created_at,
            fishCount: user.fishes_aggregate.aggregate.count || 0,
            totalScore: user.fishes_aggregate.aggregate.sum?.upvotes || 0,
            totalUpvotes: user.fishes_aggregate.aggregate.sum?.upvotes || 0,
            reputationScore: user.reputation_score || 0,
            favoriteCount: favoriteCount,
            userLanguage: user.user_language || '',
            aboutMe: user.about_me || '',
            fishTalk: user.fish_talk || false,
            membershipTier: membershipTier,
            membershipName: membershipName
        };
    } catch (error) {
        console.error('Error fetching profile from Hasura:', error);
        throw error;
    }
}

// Alias for backward compatibility
async function getUserProfile(userId) {
    return await getUserProfileFromHasura(userId);
}

// Update action button links based on the profile being viewed
function updateActionButtons(profile, profileUserId, isCurrentUser, isLoggedIn = true) {
    const viewFishBtn = document.getElementById('view-fish-btn');
    const visitTankBtn = document.getElementById('visit-tank-btn');
    const shareProfileBtn = document.querySelector('.profile-actions button[onclick="shareProfile()"]');
    const displayName = getDisplayName(profile);

    // 隐藏"View My Fish"按钮
    if (viewFishBtn) {
        viewFishBtn.style.display = 'none';
    }
    
    // 隐藏"Share Profile"按钮
    if (shareProfileBtn) {
        shareProfileBtn.style.display = 'none';
    }

    if (isCurrentUser) {
        // For current user, show their private tank
        visitTankBtn.href = 'tank.html?view=my';
        visitTankBtn.textContent = 'My Tank';

        // Show edit profile button for current user only if logged in
        if (isLoggedIn) {
            showEditProfileButton();
        } else {
            hideEditProfileButton();
        }
    } else {
        // For other users, hide the tank button (or link to their public fish)
        visitTankBtn.style.display = 'none';
        
        // Hide edit profile button for other users
        hideEditProfileButton();
    }
}

// Helper function to get display name for buttons
function getDisplayName(profile) {
    // Use the profile data directly, with artistName as fallback
    if (profile && profile.displayName && profile.displayName !== 'Anonymous User') {
        return profile.displayName;
    }
    
    if (profile && profile.artistName && profile.artistName !== 'Anonymous User') {
        return profile.artistName;
    }

    // Fallback to just "User" if no display name or artist name
    return 'User';
}

// Display user profile
function displayProfile(profile, searchedUserId = null) {
    // Store current profile data for editing
    currentProfile = profile;

    // Get avatar initial
    const nameForInitial = profile.displayName || profile.artistName || 'User';
    const initial = nameForInitial.charAt(0).toUpperCase();

    // Format dates safely - handle Firestore timestamp format
    let createdDate = 'Unknown';
    if (profile.createdAt) {
        let date;
        
        // Handle Firestore timestamp format
        if (profile.createdAt._seconds) {
            // Convert Firestore timestamp to JavaScript Date
            date = new Date(profile.createdAt._seconds * 1000);
        } else {
            // Handle regular date string/number
            date = new Date(profile.createdAt);
        }
        
        if (!isNaN(date.getTime())) {
            createdDate = date.toLocaleDateString();
        }
    }

    // Check if this is the current user's profile
    const token = localStorage.getItem('userToken');
    const userData = JSON.parse(localStorage.getItem('userData') || '{}');
    const userIdFromStorage = localStorage.getItem('userId');
    const currentUserId = userIdFromStorage || userData.uid || userData.userId || userData.id || userData.email;

    // Use the searched userId if provided, otherwise try to get it from profile
    const profileUserId = searchedUserId || profile.userId || profile.userEmail || profile.id;
    const isCurrentUser = currentUserId && (currentUserId === profileUserId);
    const isLoggedIn = !!(token && userData);

    // Update profile display - use membership icon instead of initial
    const membershipTier = profile.membershipTier || 'free';
    
    // Get membership name with proper fallback
    let membershipName = profile.membershipName;
    if (!membershipName) {
        const tierNames = {
            'free': 'Free',
            'plus': 'Plus',
            'premium': 'Premium',
            'admin': 'Admin',
            'test_plus': 'Test Plus',
            'test_premium': 'Test Premium'
        };
        membershipName = tierNames[membershipTier] || 'Free';
    }
    
    // Debug: 输出会员等级信息
    console.log('🎯 Displaying profile with membership:', {
        membershipTier: membershipTier,
        membershipName: membershipName,
        profileData: profile
    });
    
    // Clear avatar and add membership icon
    const avatarElement = document.getElementById('profile-avatar');
    if (!avatarElement) {
        console.error('❌ profile-avatar element not found');
        return;
    }
    
    avatarElement.innerHTML = '';
    
    if (typeof createMembershipBadge === 'function') {
        console.log('✅ Using createMembershipBadge for tier:', membershipTier);
        const membershipBadge = createMembershipBadge(membershipTier, { size: 'large' });
        avatarElement.appendChild(membershipBadge);
        
        // 验证图标是否正确创建
        const img = membershipBadge.querySelector('img');
        if (img) {
            console.log('✅ Membership badge created with image:', img.src);
        } else {
            console.warn('⚠️ Membership badge created but no image found');
        }
    } else {
        // Fallback to SVG icons if membership-icons.js is not loaded
        console.log('⚠️ createMembershipBadge not available, using fallback for tier:', membershipTier);
        const svgMap = {
            'free': 'https://cdn.fishart.online/fishart_web/icon/free.svg',
            'plus': 'https://cdn.fishart.online/fishart_web/icon/plus.svg',
            'premium': 'https://cdn.fishart.online/fishart_web/icon/premium.svg'
        };
        const svgUrl = svgMap[membershipTier] || svgMap['free'];
        console.log('📦 Using fallback SVG URL:', svgUrl);
        const img = document.createElement('img');
        img.src = svgUrl;
        img.alt = membershipName;
        img.style.cssText = 'width: 80px; height: 80px; object-fit: contain;';
        avatarElement.appendChild(img);
    }
    
    const profileName = profile.displayName || profile.artistName || 'Anonymous User';
    
    // 直接显示用户名，不添加"(You)"等后缀
    document.getElementById('profile-name').textContent = profileName;
    
    // Display membership info
    const membershipBadgeElement = document.getElementById('membership-badge');
    const membershipTextElement = document.getElementById('membership-text');
    const upgradeBtn = document.getElementById('upgrade-btn');
    
    if (membershipBadgeElement && typeof createMembershipIcon === 'function') {
        membershipBadgeElement.innerHTML = '';
        const smallBadge = createMembershipIcon(membershipTier);
        membershipBadgeElement.appendChild(smallBadge);
    } else if (membershipBadgeElement) {
        // Fallback to SVG icons if membership-icons.js is not loaded
        const svgMap = {
            'free': 'https://cdn.fishart.online/fishart_web/icon/free.svg',
            'plus': 'https://cdn.fishart.online/fishart_web/icon/plus.svg',
            'premium': 'https://cdn.fishart.online/fishart_web/icon/premium.svg'
        };
        const svgUrl = svgMap[membershipTier] || svgMap['free'];
        const img = document.createElement('img');
        img.src = svgUrl;
        img.alt = membershipName;
        img.style.cssText = 'width: 20px; height: 20px; object-fit: contain;';
        membershipBadgeElement.appendChild(img);
    }
    
    if (membershipTextElement) {
        console.log('🔧 Setting membership text to:', membershipName);
        membershipTextElement.textContent = membershipName;
        console.log('✅ Membership text element now shows:', membershipTextElement.textContent);
    } else {
        console.error('❌ membership-text element not found!');
    }
    
    // Show upgrade button for free and plus members (only for current user)
    if (upgradeBtn && isCurrentUser && (membershipTier === 'free' || membershipTier === 'plus')) {
        upgradeBtn.style.display = 'inline-block';
        upgradeBtn.onclick = () => {
            // Navigate to membership upgrade page
            window.location.href = 'membership.html';
        };
    } else if (upgradeBtn) {
        upgradeBtn.style.display = 'none';
    }
    
    // Hide email field since profile endpoint doesn't return it
    const emailElement = document.getElementById('profile-email');
    if (emailElement) {
        emailElement.style.display = 'none';
    }
    
    document.getElementById('profile-joined').textContent = `Joined: ${createdDate}`;

    // Update statistics
    document.getElementById('fish-count').textContent = profile.fishCount || 0;
    document.getElementById('total-upvotes').textContent = profile.totalUpvotes || 0;
    
    // Update favorite count if element exists
    const favoriteCountElement = document.getElementById('favorite-count');
    if (favoriteCountElement) {
        favoriteCountElement.textContent = profile.favoriteCount || 0;
    }

    // Note: Score color removed as we now only use upvotes

    // Update action button links
    updateActionButtons(profile, profileUserId, isCurrentUser, isLoggedIn);
    
    // 给Fish Created统计卡片添加点击跳转功能
    const statItems = document.querySelectorAll('.stat-item');
    if (statItems.length > 0 && profileUserId) {
        // 第一个是 Fish Created (My fish)
        statItems[0].style.cursor = 'pointer';
        statItems[0].onclick = () => {
            // 跳转到 rank.html 并显示 My Fish 分类
            window.location.href = `rank.html?myfish=true`;
        };
        
        // 第二个是 Favorites（如果存在）
        if (statItems.length > 1) {
            statItems[1].style.cursor = 'pointer';
            statItems[1].onclick = () => {
                // 跳转到 rank.html 并显示收藏的鱼
                window.location.href = `rank.html?favorites=true`;
            };
        }
    }

    // Show profile content
    document.getElementById('profile-content').style.display = 'block';
    document.getElementById('profile-empty').style.display = 'none';
    
    // Load comments if MessageUI is available
    if (typeof MessageUI !== 'undefined' && profileUserId) {
        loadUserComments(profileUserId);
    }
    
    // Load subscription info if user is viewing own profile
    if (isCurrentUser && profileUserId) {
        loadUserSubscription(profileUserId);
    }
    
    // 检查是否为匿名用户，显示升级区域
    checkAndShowAnonymousUpgrade(isCurrentUser);
    
    // Handle #comments hash - scroll to comments section if present
    handleCommentsHashOnLoad();
}

/**
 * 检查是否为匿名用户，显示升级区域
 */
async function checkAndShowAnonymousUpgrade(isCurrentUser) {
    const upgradeSection = document.getElementById('anonymous-upgrade-section');
    if (!upgradeSection) return;
    
    // 只对当前用户显示
    if (!isCurrentUser) {
        upgradeSection.style.display = 'none';
        return;
    }
    
    // 检查是否为匿名用户
    if (window.supabaseAuth && window.supabaseAuth.isAnonymousUser) {
        try {
            const user = await window.supabaseAuth.getCurrentUser();
            const isAnonymous = window.supabaseAuth.isAnonymousUser(user);
            
            if (isAnonymous) {
                upgradeSection.style.display = 'block';
                
                // 绑定升级按钮事件 - 显示账号保存弹窗
                const upgradeBtn = document.getElementById('profile-upgrade-btn');
                if (upgradeBtn) {
                    upgradeBtn.onclick = () => {
                        showSaveAccountModal();
                    };
                }
            } else {
                upgradeSection.style.display = 'none';
            }
        } catch (error) {
            console.error('检查匿名用户状态失败:', error);
            upgradeSection.style.display = 'none';
        }
    } else {
        upgradeSection.style.display = 'none';
    }
}

// Show loading state
function showLoading() {
    document.getElementById('loading').style.display = 'block';
    document.getElementById('error').style.display = 'none';
    document.getElementById('profile-content').style.display = 'none';
    document.getElementById('profile-empty').style.display = 'none';
}

// Hide loading state
function hideLoading() {
    document.getElementById('loading').style.display = 'none';
}

// Show error message
function showError(message) {
    const errorElement = document.getElementById('error');
    errorElement.textContent = message;
    errorElement.style.display = 'block';
    document.getElementById('profile-content').style.display = 'none';
    document.getElementById('profile-empty').style.display = 'none';
}

// Add enter key support for search
document.addEventListener('DOMContentLoaded', function () {
    console.log('🚀 Profile.js DOMContentLoaded 事件触发');
    
    // 检查网络连接状态
    const isOnline = navigator.onLine;
    if (!isOnline) {
        console.warn('⚠️ Network appears to be offline');
    }
    
    // Check if there's a user ID in the URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const searchedUserId = urlParams.get('userId');
    
    console.log('🔍 URL 参数检查:', {
        searchedUserId: searchedUserId || '无',
        fullUrl: window.location.href
    });
    
    if (searchedUserId) {
        console.log('📋 从 URL 加载用户 profile:', searchedUserId);
        // Load specific user's profile from URL
        getUserProfile(searchedUserId).then(profile => {
            displayProfile(profile, searchedUserId);
        }).catch(error => {
            console.error('Error loading user profile from URL:', error);
            showError('User not found or error loading profile. Please check your network connection.');
        });
        return;
    }
    
    console.log('👤 准备加载当前登录用户的 profile...');
    
    // Check authentication state for current user - 优先使用Supabase
    async function checkAndLoadProfile() {
        let userId = null;
        let userData = null;
        
        console.log('🔍 开始检查用户登录状态...');
        
        // 优先使用Supabase检查登录状态
        if (window.supabaseAuth && typeof window.supabaseAuth.getCurrentUser === 'function') {
            try {
                const user = await window.supabaseAuth.getCurrentUser();
                if (user && user.id) {
                    userId = user.id;
                    userData = {
                        id: user.id,
                        email: user.email,
                        name: user.user_metadata?.name || user.user_metadata?.nick_name || user.email?.split('@')[0] || 'User',
                        avatar_url: user.user_metadata?.avatar_url,
                        created_at: user.created_at
                    };
                    console.log('✅ 使用Supabase获取用户信息:', userId);
                } else {
                    console.log('⚠️ Supabase getCurrentUser 返回空或无效用户');
                }
            } catch (error) {
                console.warn('⚠️ Supabase获取用户信息失败:', error);
            }
        } else {
            console.log('⚠️ window.supabaseAuth 未定义或 getCurrentUser 不可用');
        }
        
        // 如果Supabase没有用户，回退到localStorage
        if (!userId) {
            console.log('🔄 尝试从 localStorage 获取用户信息...');
            const token = localStorage.getItem('userToken');
            const userDataStr = localStorage.getItem('userData');
            const userIdFromStorage = localStorage.getItem('userId');
            
            console.log('   localStorage 检查:');
            console.log('   - userToken:', token ? '存在' : '不存在');
            console.log('   - userData:', userDataStr ? '存在' : '不存在');
            console.log('   - userId:', userIdFromStorage ? userIdFromStorage : '不存在');
            
            if (token && userDataStr) {
                try {
                    const parsedUserData = JSON.parse(userDataStr);
                    userId = userIdFromStorage || 
                             parsedUserData.uid || 
                             parsedUserData.userId || 
                             parsedUserData.id || 
                             parsedUserData.email;
                    userData = parsedUserData;
                    console.log('✅ 使用localStorage获取用户信息:', userId);
                } catch (error) {
                    console.error('❌ 解析 userData 失败:', error);
                }
            } else if (userIdFromStorage) {
                userId = userIdFromStorage;
                console.log('📦 仅找到 userId:', userId);
            }
        }
        
        console.log('📊 最终用户检查结果:');
        console.log('   userId:', userId || '无');
        console.log('   userData:', userData ? '存在' : '无');
        
        // 加载用户profile
        if (userId) {
            console.log('✅ 找到用户ID，开始加载 profile...');
            try {
                // 尝试从API加载
                const profile = await getUserProfile(userId);
                console.log('✅ 成功获取 profile，准备显示...');
                displayProfile(profile, userId);
            } catch (error) {
                console.error('❌ 加载 profile 失败:', error);
                // 回退到显示基本信息
                if (userData) {
                    console.log('📦 回退到使用缓存的用户数据');
                    const fallbackProfile = {
                        userId: userId,
                        displayName: userData.name || userData.nick_name || userData.display_name || userData.email?.split('@')[0] || 'User',
                        email: userData.email,
                        avatarUrl: userData.avatar_url || userData.avatarUrl,
                        createdAt: userData.created_at || userData.createdAt || new Date().toISOString(),
                        fishCount: userData.fishCount || 0,
                        totalUpvotes: userData.totalUpvotes || 0,
                        reputationScore: userData.reputationScore || 0,
                        favoriteCount: userData.favoriteCount || 0,
                        membershipTier: userData.membershipTier || 'free',
                        membershipName: userData.membershipName || 'Free'
                    };
                    console.log('📦 回退 profile 数据:', fallbackProfile);
                    displayProfile(fallbackProfile, userId);
                    
                    // 显示网络提示
                    if (!isOnline) {
                        const errorDiv = document.getElementById('error');
                        if (errorDiv) {
                            errorDiv.textContent = '⚠️ Network unavailable. Showing cached profile data. Some features may be limited.';
                            errorDiv.style.display = 'block';
                            errorDiv.style.background = '#fff3cd';
                            errorDiv.style.color = '#856404';
                            errorDiv.style.border = '1px solid #ffc107';
                        }
                    }
                } else {
                    console.error('❌ 没有缓存数据，但有 userId，显示空状态');
                    // 即使没有缓存数据，也显示一个最小的 profile
                    const minimalProfile = {
                        userId: userId,
                        displayName: userId.split('-')[0] || 'User',
                        email: '',
                        avatarUrl: '',
                        createdAt: new Date().toISOString(),
                        fishCount: 0,
                        totalUpvotes: 0,
                        reputationScore: 0,
                        favoriteCount: 0,
                        membershipTier: 'free',
                        membershipName: 'Free'
                    };
                    displayProfile(minimalProfile, userId);
                    
                    const errorDiv = document.getElementById('error');
                    if (errorDiv) {
                        errorDiv.textContent = '⚠️ Could not load full profile. Some information may be missing.';
                        errorDiv.style.display = 'block';
                        errorDiv.style.background = '#fff3cd';
                        errorDiv.style.color = '#856404';
                        errorDiv.style.border = '1px solid #ffc107';
                    }
                }
            }
        } else {
            // 没有用户ID，显示空状态
            console.log('❌ 没有找到用户ID，显示空状态');
            document.getElementById('profile-empty').style.display = 'block';
        }
    }
    
    // 等待Supabase初始化（最多等待3秒）
    if (window.supabaseAuth) {
        checkAndLoadProfile();
    } else {
        // 如果Supabase还没初始化，等待一下
        let retries = 0;
        const maxRetries = 30; // 最多等待3秒
        const checkInterval = setInterval(() => {
            if (window.supabaseAuth || retries >= maxRetries) {
                clearInterval(checkInterval);
                checkAndLoadProfile();
            }
            retries++;
        }, 100);
    }
});

// Share profile URL
function shareProfile() {
    // Get the user ID to share - could be from URL params or localStorage
    const urlParams = new URLSearchParams(window.location.search);
    const searchedUserId = urlParams.get('userId');
    const userIdFromStorage = localStorage.getItem('userId');
    const userData = JSON.parse(localStorage.getItem('userData') || '{}');
    const currentUserId = userIdFromStorage || userData.uid || userData.userId || userData.id || userData.email;
    
    // Determine which user profile to share
    const profileUserId = searchedUserId || currentUserId;
    
    let shareUrl;
    if (profileUserId) {
        // Create URL with the specific user ID
        const baseUrl = window.location.origin + window.location.pathname;
        shareUrl = `${baseUrl}?userId=${encodeURIComponent(profileUserId)}`;
    } else {
        // Fallback to current URL
        shareUrl = window.location.href;
    }
    
    // Get profile name for the title
    const profileNameElement = document.getElementById('profile-name');
    let profileName = 'Fish Artist';
    if (profileNameElement && currentProfile) {
        const displayName = currentProfile.displayName || currentProfile.artistName || 'Anonymous User';
        profileName = displayName !== 'Anonymous User' ? displayName : 'Fish Artist';
    }
    
    if (navigator.share) {
        navigator.share({
            title: `${profileName}'s Profile - Fish Artist`,
            url: shareUrl
        }).catch(console.error);
    } else {
        // Fallback: copy to clipboard
        navigator.clipboard.writeText(shareUrl).then(function () {
            alert('Profile URL copied to clipboard!');
        }).catch(function () {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = shareUrl;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            alert('Profile URL copied to clipboard!');
        });
    }
}

// Edit profile functionality
let isEditMode = false;
let currentProfile = null;

function showEditProfileButton() {
    const profileActions = document.querySelector('.profile-actions');
    let editBtn = document.getElementById('edit-profile-btn');

    if (!editBtn) {
        editBtn = document.createElement('button');
        editBtn.id = 'edit-profile-btn';
        editBtn.textContent = 'Settings';
        editBtn.className = 'action-btn';
        editBtn.onclick = toggleEditProfile;
        profileActions.appendChild(editBtn);
    }

    editBtn.style.display = 'inline-block';
}

function hideEditProfileButton() {
    const editBtn = document.getElementById('edit-profile-btn');
    if (editBtn) {
        editBtn.style.display = 'none';
    }
}

function toggleEditProfile() {
    showEditProfileModal();
}

// Show edit profile modal
function showEditProfileModal() {
    // Get current values
    const currentName = currentProfile.nickName || currentProfile.displayName || currentProfile.artistName || '';
    const currentLanguage = currentProfile.userLanguage || '';
    const currentAboutMe = currentProfile.aboutMe || '';
    const currentFishTalk = currentProfile.fishTalk || false;

    // Supported languages
    const languages = [
        { value: '', label: 'Default (English)' },
        { value: 'English', label: 'English' },
        { value: 'French', label: 'French' },
        { value: 'Spanish', label: 'Spanish' },
        { value: 'Chinese', label: 'Chinese (简体中文)' },
        { value: 'Traditional Chinese', label: 'Traditional Chinese (繁體中文)' },
        { value: 'Japanese', label: 'Japanese' },
        { value: 'Korean', label: 'Korean' }
    ];

    // Create modal overlay
    const modalOverlay = document.createElement('div');
    modalOverlay.id = 'edit-profile-modal-overlay';
    modalOverlay.className = 'modal-overlay';
    modalOverlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000;
    `;

    // Create modal content
    // 在移动端使用响应式宽度，避免占满屏幕
    const isMobile = window.innerWidth <= 768;
    const modalContent = document.createElement('div');
    modalContent.className = 'modal-content';
    modalContent.style.cssText = `
        background: white;
        padding: 30px;
        border-radius: 10px;
        max-width: ${isMobile ? 'calc(100vw - 40px)' : '500px'};
        width: ${isMobile ? 'calc(100vw - 40px)' : '90%'};
        max-height: 90vh;
        overflow-y: auto;
        box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        box-sizing: border-box;
    `;

    modalContent.innerHTML = `
        <h2 style="margin-top: 0; margin-bottom: 20px; color: #333;">Settings</h2>
        <form id="edit-profile-form">
            <div style="margin-bottom: 20px;">
                <label for="edit-feeder-name" style="display: block; margin-bottom: 8px; font-weight: 600; color: #555;">
                    Nickname
                </label>
                <input 
                    type="text" 
                    id="edit-feeder-name" 
                    value="${escapeHtml(currentName)}" 
                    class="edit-input" 
                    maxlength="50" 
                    placeholder="Enter your nickname"
                    style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px; font-size: 14px; box-sizing: border-box; background: white; color: #000000;"
                >
            </div>
            <div style="margin-bottom: 20px;">
                <label for="edit-about-me" style="display: block; margin-bottom: 8px; font-weight: 600; color: #555;">
                    About Me
                </label>
                <textarea 
                    id="edit-about-me" 
                    class="edit-textarea"
                    maxlength="200" 
                    rows="2"
                    placeholder="A brief introduction about yourself, your fish will talk about you..."
                    style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px; font-size: 14px; box-sizing: border-box; background: white; color: #000000; resize: vertical; min-height: 50px; font-family: inherit;"
                >${escapeHtml(currentAboutMe)}</textarea>
            </div>
            <div style="margin-bottom: 20px;">
                <div style="display: flex; align-items: center; justify-content: space-between; padding: 8px 0;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <img src="icons/chat.svg" alt="Chat" style="width: 20px; height: 20px; object-fit: contain;">
                        <span style="font-weight: 600; color: #555;">Fish Talk</span>
                    </div>
                    <label style="position: relative; display: inline-block; width: 50px; height: 26px; margin: 0;">
                        <input type="checkbox" id="fish-talk-switch-profile" style="opacity: 0; width: 0; height: 0;">
                        <span style="position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #ccc; transition: .4s; border-radius: 26px;"></span>
                        <span style="position: absolute; content: ''; height: 20px; width: 20px; left: 3px; bottom: 3px; background-color: white; transition: .4s; border-radius: 50%;"></span>
                    </label>
                </div>
            </div>
            <div style="margin-bottom: 25px;">
                <label for="edit-user-language" style="display: block; margin-bottom: 8px; font-weight: 600; color: #555;">
                    Language
                </label>
                <select 
                    id="edit-user-language" 
                    class="edit-select"
                    style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px; font-size: 14px; box-sizing: border-box; background: white; color: #000000;"
                >
                    <option value="" ${currentLanguage === '' ? 'selected' : ''} style="color: #000000;">Default (English)</option>
                    <option value="English" ${currentLanguage === 'English' ? 'selected' : ''} style="color: #000000;">English</option>
                    <option value="French" ${currentLanguage === 'French' ? 'selected' : ''} style="color: #000000;">French</option>
                    <option value="Spanish" ${currentLanguage === 'Spanish' ? 'selected' : ''} style="color: #000000;">Spanish</option>
                    <option value="简体中文" ${currentLanguage === '简体中文' || currentLanguage === 'Chinese' ? 'selected' : ''} style="color: #000000;">简体中文</option>
                    <option value="繁體中文" ${currentLanguage === '繁體中文' || currentLanguage === 'Traditional Chinese' ? 'selected' : ''} style="color: #000000;">繁體中文</option>
                    <option value="Japanese" ${currentLanguage === 'Japanese' ? 'selected' : ''} style="color: #000000;">Japanese</option>
                    <option value="Korean" ${currentLanguage === 'Korean' ? 'selected' : ''} style="color: #000000;">Korean</option>
                </select>
            </div>
            <div style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 25px;">
                <button 
                    type="button" 
                    onclick="closeEditProfileModal()" 
                    class="cancel-btn"
                    style="padding: 10px 20px; border: 1px solid #ddd; background: white; border-radius: 5px; cursor: pointer; font-size: 14px;"
                >
                    Cancel
                </button>
                <button 
                    type="button" 
                    onclick="saveProfileFromModal()" 
                    class="save-btn"
                    style="padding: 10px 20px; border: none; background: #007bff; color: white; border-radius: 5px; cursor: pointer; font-size: 14px; font-weight: 600;"
                >
                    Save
                </button>
            </div>
        </form>
    `;

    modalOverlay.appendChild(modalContent);
    document.body.appendChild(modalOverlay);

    // Initialize Fish Talk toggle
    initializeFishTalkToggle();

    // Close modal when clicking overlay
    modalOverlay.addEventListener('click', function(e) {
        if (e.target === modalOverlay) {
            closeEditProfileModal();
        }
    });

    // Focus first input
    setTimeout(() => {
        const input = document.getElementById('edit-feeder-name');
        if (input) {
            input.focus();
        }
    }, 100);
}

// Initialize Fish Talk toggle in profile modal
function initializeFishTalkToggle() {
    const toggleSwitch = document.getElementById('fish-talk-switch-profile');
    const toggleContainer = toggleSwitch?.parentElement?.parentElement;
    
    if (!toggleSwitch || !toggleContainer) {
        console.warn('Fish Talk toggle elements not found in profile modal');
        return;
    }

    // Load from database fish_talk field, fallback to localStorage
    const dbFishTalk = currentProfile?.fishTalk;
    const savedPreference = localStorage.getItem('groupChatEnabled');
    const isEnabled = dbFishTalk !== undefined ? dbFishTalk : (savedPreference === 'true');
    
    // Set initial state
    toggleSwitch.checked = isEnabled;
    updateProfileToggleStyle(toggleSwitch, isEnabled);

    // Handle toggle click
    toggleContainer.addEventListener('click', async function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        const newState = !toggleSwitch.checked;
        
        // 如果尝试启用 Fish Talk，需要检查登录状态
        if (newState) {
            // 检查用户是否已登录
            let isLoggedIn = false;
            try {
                if (window.supabaseAuth && typeof window.supabaseAuth.isLoggedIn === 'function') {
                    isLoggedIn = await window.supabaseAuth.isLoggedIn();
                } else if (window.supabaseAuth && typeof window.supabaseAuth.getCurrentUser === 'function') {
                    const user = await window.supabaseAuth.getCurrentUser();
                    isLoggedIn = !!user;
                }
            } catch (error) {
                console.error('检查登录状态时出错:', error);
                isLoggedIn = false;
            }
            
            // 如果未登录，阻止启用并显示登录提示
            if (!isLoggedIn) {
                console.log('❌ 未登录用户无法启用 Fish Talk');
                // 恢复开关状态
                toggleSwitch.checked = false;
                updateProfileToggleStyle(toggleSwitch, false);
                
                // 显示登录提示
                if (window.authUI && window.authUI.showLoginModal) {
                    window.authUI.showLoginModal();
                } else {
                    // Fallback: 使用 alert
                    alert('Please sign in to use Fish Talk feature');
                }
                return;
            }
        }
        
        // 已登录或禁用操作，继续执行
        toggleSwitch.checked = newState;
        updateProfileToggleStyle(toggleSwitch, newState);
        
        // Save preference immediately to localStorage
        localStorage.setItem('groupChatEnabled', newState ? 'true' : 'false');
        
        // Update current profile data
        if (currentProfile) {
            currentProfile.fishTalk = newState;
        }
        
        // Trigger custom event for same-tab sync
        window.dispatchEvent(new CustomEvent('groupChatEnabledChanged', {
            detail: { enabled: newState }
        }));
        
        console.log(`Fish Talk ${newState ? 'enabled' : 'disabled'} (from profile settings)`);
    });
}

// Update Fish Talk toggle visual style in profile modal
function updateProfileToggleStyle(toggleSwitch, enabled) {
    const slider = toggleSwitch.nextElementSibling;
    const thumb = slider ? slider.nextElementSibling : null;
    
    if (slider && thumb) {
        if (enabled) {
            slider.style.backgroundColor = '#6366F1';
            thumb.style.transform = 'translateX(24px)';
        } else {
            slider.style.backgroundColor = '#ccc';
            thumb.style.transform = 'translateX(0)';
        }
    }
}

// Close edit profile modal
function closeEditProfileModal() {
    const modal = document.getElementById('edit-profile-modal-overlay');
    if (modal) {
        modal.remove();
    }
}

function exitEditMode() {
    // Restore original display
    const profileName = document.getElementById('profile-name');
    const profileAvatar = document.getElementById('profile-avatar');
    const token = localStorage.getItem('userToken');
    const userData = JSON.parse(localStorage.getItem('userData') || '{}');
    const userIdFromStorage = localStorage.getItem('userId');
    const currentUserId = userIdFromStorage || userData.uid || userData.userId || userData.id || userData.email;

    // Use the searched userId if provided, otherwise try to get it from profile
    const urlParams = new URLSearchParams(window.location.search);
    const searchedUserId = urlParams.get('userId');
    const profileUserId = searchedUserId || currentProfile.userId || currentProfile.userEmail || currentProfile.id;
    const isCurrentUser = currentUserId && (currentUserId === profileUserId);
    const isLoggedIn = !!(token && userData);

    const displayName = currentProfile.displayName || currentProfile.artistName || 'Anonymous User';
    
    // 直接显示用户名，不添加任何后缀
    profileName.textContent = displayName;

    // Update avatar with membership icon instead of initial
    profileAvatar.innerHTML = '';
    const membershipTier = currentProfile.membershipTier || 'free';
    
    if (typeof createMembershipBadge === 'function') {
        const membershipBadge = createMembershipBadge(membershipTier, { size: 'large' });
        profileAvatar.appendChild(membershipBadge);
    } else if (typeof createMembershipIcon === 'function') {
        const membershipIcon = createMembershipIcon(membershipTier);
        const iconElement = membershipIcon.querySelector('div');
        if (iconElement) {
            iconElement.style.width = '80px';
            iconElement.style.height = '80px';
        }
        profileAvatar.appendChild(membershipIcon);
    } else {
        // 回退：使用SVG图标
        const svgMap = {
            'free': 'https://cdn.fishart.online/fishart_web/icon/free.svg',
            'plus': 'https://cdn.fishart.online/fishart_web/icon/plus.svg',
            'premium': 'https://cdn.fishart.online/fishart_web/icon/premium.svg'
        };
        const svgUrl = svgMap[membershipTier] || svgMap['free'];
        const img = document.createElement('img');
        img.src = svgUrl;
        img.alt = membershipTier;
        img.style.cssText = 'width: 80px; height: 80px; object-fit: contain;';
        profileAvatar.appendChild(img);
    }

    // Restore edit button
    const editBtn = document.getElementById('edit-profile-btn');
    editBtn.innerHTML = 'Settings';
    editBtn.style.display = 'inline-block';
    editBtn.onclick = toggleEditProfile;
}

function cancelEdit() {
    isEditMode = false;
    exitEditMode();
}

// Save profile from modal
async function saveProfileFromModal() {
    const nameInput = document.getElementById('edit-feeder-name');
    const languageSelect = document.getElementById('edit-user-language');
    const aboutMeTextarea = document.getElementById('edit-about-me');
    const fishTalkSwitch = document.getElementById('fish-talk-switch-profile');
    
    const newNickName = nameInput.value.trim();
    const newUserLanguage = languageSelect.value.trim();
    const newAboutMe = aboutMeTextarea ? aboutMeTextarea.value.trim() : '';
    const newFishTalk = fishTalkSwitch ? fishTalkSwitch.checked : false;

    // Check if user is logged in and get fresh token
    let token = localStorage.getItem('userToken');
    if (!token) {
        alert('You must be logged in to edit your profile');
        return;
    }
    
    // 尝试获取最新的token
    try {
        if (window.supabaseAuth && typeof window.supabaseAuth.getCurrentUser === 'function') {
            const user = await window.supabaseAuth.getCurrentUser();
            if (user && window.supabaseAuth.getSession) {
                const session = await window.supabaseAuth.getSession();
                if (session?.data?.session?.access_token) {
                    token = session.data.session.access_token;
                    localStorage.setItem('userToken', token);
                    console.log('🔄 已更新token');
                }
            }
        }
    } catch (error) {
        console.warn('⚠️ 获取最新token失败，使用缓存token:', error);
    }

    try {
        // Show loading state on save button
        const saveBtn = document.querySelector('#edit-profile-modal-overlay .save-btn');
        const cancelBtn = document.querySelector('#edit-profile-modal-overlay .cancel-btn');

        if (saveBtn) {
            saveBtn.textContent = 'Saving...';
            saveBtn.disabled = true;
        }
        if (cancelBtn) {
            cancelBtn.disabled = true;
        }

        // Get current user ID
        const userData = JSON.parse(localStorage.getItem('userData') || '{}');
        const userIdFromStorage = localStorage.getItem('userId');
        const userId = userIdFromStorage || userData.uid || userData.userId || userData.id || userData.email;

        // Update profile via API endpoint (uses admin secret, avoids JWT issues)
        const backendUrl = window.BACKEND_URL || '';
        const requestBody = {
            nick_name: newNickName,
            user_language: newUserLanguage,
            about_me: newAboutMe,
            fish_talk: newFishTalk
        };
        
        console.log('📝 发送profile更新请求:', {
            url: `${backendUrl}/api/profile/${encodeURIComponent(userId)}`,
            method: 'PUT',
            body: requestBody,
            hasToken: !!token,
            tokenLength: token ? token.length : 0,
            tokenPrefix: token ? token.substring(0, 30) + '...' : 'null'
        });
        
        const response = await fetch(`${backendUrl}/api/profile/${encodeURIComponent(userId)}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorText = await response.text();
            let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
            try {
                const errorJson = JSON.parse(errorText);
                errorMessage = errorJson.error || errorJson.message || errorMessage;
            } catch (e) {
                errorMessage = errorText || errorMessage;
            }
            throw new Error(errorMessage);
        }

        const result = await response.json();

        if (!result.success) {
            throw new Error(result.error || '更新失败');
        }

        // Update local profile data
        if (result.user) {
            currentProfile.nickName = result.user.nick_name || newNickName;
            currentProfile.userLanguage = result.user.user_language || newUserLanguage;
            currentProfile.displayName = result.user.nick_name || newNickName || currentProfile.displayName;
            currentProfile.aboutMe = result.user.about_me || newAboutMe || '';
            currentProfile.fishTalk = result.user.fish_talk !== undefined ? result.user.fish_talk : newFishTalk;
        } else {
            currentProfile.nickName = newNickName;
            currentProfile.userLanguage = newUserLanguage;
            currentProfile.displayName = newNickName || currentProfile.displayName;
            currentProfile.aboutMe = newAboutMe || '';
            currentProfile.fishTalk = newFishTalk;
        }

        // Update profile name display immediately
        const profileNameElement = document.getElementById('profile-name');
        if (profileNameElement) {
            const displayName = currentProfile.displayName || currentProfile.nickName || currentProfile.artistName || 'Anonymous User';
            profileNameElement.textContent = displayName;
            
            // Update avatar with membership icon instead of initial
            const profileAvatar = document.getElementById('profile-avatar');
            if (profileAvatar) {
                // 清空并重新显示会员图标
                profileAvatar.innerHTML = '';
                const membershipTier = currentProfile.membershipTier || 'free';
                
                if (typeof createMembershipBadge === 'function') {
                    const membershipBadge = createMembershipBadge(membershipTier, { size: 'large' });
                    profileAvatar.appendChild(membershipBadge);
                } else if (typeof createMembershipIcon === 'function') {
                    // 使用 createMembershipIcon 作为回退
                    const membershipIcon = createMembershipIcon(membershipTier);
                    // 调整图标大小以适应profile-avatar
                    const iconElement = membershipIcon.querySelector('div');
                    if (iconElement) {
                        iconElement.style.width = '80px';
                        iconElement.style.height = '80px';
                    }
                    profileAvatar.appendChild(membershipIcon);
                } else {
                    // 最后的回退：使用SVG图标
                    const svgMap = {
                        'free': 'https://cdn.fishart.online/fishart_web/icon/free.svg',
                        'plus': 'https://cdn.fishart.online/fishart_web/icon/plus.svg',
                        'premium': 'https://cdn.fishart.online/fishart_web/icon/premium.svg'
                    };
                    const svgUrl = svgMap[membershipTier] || svgMap['free'];
                    const img = document.createElement('img');
                    img.src = svgUrl;
                    img.alt = membershipTier;
                    img.style.cssText = 'width: 80px; height: 80px; object-fit: contain;';
                    profileAvatar.appendChild(img);
                }
            }
        }

        // Update navigation bar user name
        const userNameElement = document.querySelector('.user-name');
        if (userNameElement && newNickName) {
            userNameElement.textContent = newNickName;
            console.log('✅ 已更新导航栏用户名:', newNickName);
        }

        // Update auth UI to refresh user menu with latest profile data
        if (window.authUI && window.authUI.updateAuthUI) {
            try {
                // 重新获取用户信息并更新UI
                if (window.supabaseAuth && typeof window.supabaseAuth.getCurrentUser === 'function') {
                    const user = await window.supabaseAuth.getCurrentUser();
                    if (user) {
                        // 从数据库获取最新的用户信息
                        const backendUrl = window.BACKEND_URL || '';
                        const profileResponse = await fetch(`${backendUrl}/api/profile/${encodeURIComponent(user.id)}`, {
                            method: 'GET',
                            headers: {
                                'Authorization': `Bearer ${token}`
                            }
                        });
                        
                        if (profileResponse.ok) {
                            const profileData = await profileResponse.json();
                            if (profileData.user) {
                                // 更新user_metadata中的显示名称
                                const updatedUser = {
                                    ...user,
                                    user_metadata: {
                                        ...user.user_metadata,
                                        // 使用 nick_name
                                        name: profileData.user.nick_name || user.user_metadata?.name,
                                        nick_name: profileData.user.nick_name || user.user_metadata?.nick_name
                                    }
                                };
                                // 更新auth UI
                                await window.authUI.updateAuthUI(updatedUser);
                                console.log('✅ 已更新Auth UI用户信息');
                            }
                        }
                    }
                }
            } catch (error) {
                console.warn('⚠️ 更新Auth UI失败，但profile已更新:', error);
                // 即使更新Auth UI失败，也直接更新导航栏用户名
                if (userNameElement && newNickName) {
                    userNameElement.textContent = newNickName;
                }
            }
        } else if (userNameElement && newNickName) {
            // 如果authUI不可用，直接更新导航栏用户名
            userNameElement.textContent = newNickName;
        }

        // Sync Fish Talk state to localStorage and trigger events
        localStorage.setItem('groupChatEnabled', newFishTalk ? 'true' : 'false');
        window.dispatchEvent(new CustomEvent('groupChatEnabledChanged', {
            detail: { enabled: newFishTalk }
        }));

        // Close modal
        closeEditProfileModal();

        // Show success message
        showSuccessMessage('Profile updated successfully!');

    } catch (error) {
        console.error('Error updating profile:', error);
        alert(`Error updating profile: ${error.message}`);

        // Restore button states
        const saveBtn = document.querySelector('#edit-profile-modal-overlay .save-btn');
        const cancelBtn = document.querySelector('#edit-profile-modal-overlay .cancel-btn');

        if (saveBtn) {
            saveBtn.textContent = 'Save';
            saveBtn.disabled = false;
        }
        if (cancelBtn) {
            cancelBtn.disabled = false;
        }
    }
}

// Legacy function for backward compatibility
async function saveProfile() {
    // Redirect to modal-based editing
    showEditProfileModal();
}

// Helper function to show success message
function showSuccessMessage(message) {
    // Create and show a temporary success message
    const successDiv = document.createElement('div');
    successDiv.textContent = message;
    successDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #28a745;
        color: white;
        padding: 15px 20px;
        border-radius: 5px;
        font-size: 14px;
        z-index: 1000;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    `;

    document.body.appendChild(successDiv);

    // Remove after 3 seconds
    setTimeout(() => {
        if (successDiv.parentNode) {
            successDiv.parentNode.removeChild(successDiv);
        }
    }, 3000);
}

// Show signup prompt for anonymous users with local data
function showSignupPrompt() {
    // Check if prompt has already been shown recently to avoid being too intrusive
    const promptShown = sessionStorage.getItem('signupPromptShown');
    if (promptShown) {
        return;
    }

    // Create info bar at the top of the page
    const infoBar = document.createElement('div');
    infoBar.id = 'signup-info-bar';
    infoBar.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        background: linear-gradient(135deg, #007bff, #0056b3);
        color: white;
        padding: 12px 20px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        z-index: 1000;
        font-size: 14px;
        line-height: 1.4;
        animation: slideDown 0.3s ease-out;
    `;

    // Add CSS animation
    if (!document.getElementById('signup-info-bar-styles')) {
        const style = document.createElement('style');
        style.id = 'signup-info-bar-styles';
        style.textContent = `
            @keyframes slideDown {
                from { transform: translateY(-100%); opacity: 0; }
                to { transform: translateY(0); opacity: 1; }
            }
            .signup-info-content {
                max-width: 1200px;
                margin: 0 auto;
                display: flex;
                align-items: center;
                justify-content: space-between;
                flex-wrap: wrap;
                gap: 15px;
            }
            .signup-info-text {
                flex: 1;
                min-width: 250px;
            }
            .signup-info-actions {
                display: flex;
                gap: 8px;
                flex-wrap: wrap;
            }
            .signup-info-btn {
                background: rgba(255,255,255,0.2);
                color: white;
                border: 1px solid rgba(255,255,255,0.3);
                padding: 6px 12px;
                border-radius: 4px;
                cursor: pointer;
                font-size: 13px;
                transition: all 0.2s ease;
                white-space: nowrap;
            }
            .signup-info-btn:hover {
                background: rgba(255,255,255,0.3);
                border-color: rgba(255,255,255,0.5);
            }
            .signup-info-btn.primary {
                background: #28a745;
                border-color: #28a745;
            }
            .signup-info-btn.primary:hover {
                background: #218838;
            }
            .signup-info-close {
                background: rgba(255,255,255,0.1);
                border: none;
                color: white;
                padding: 4px 8px;
                border-radius: 3px;
                cursor: pointer;
                font-size: 16px;
                line-height: 1;
                margin-left: 10px;
            }
            .signup-info-close:hover {
                background: rgba(255,255,255,0.2);
            }
            @media (max-width: 768px) {
                .signup-info-content {
                    flex-direction: column;
                    text-align: center;
                }
            }
        `;
        document.head.appendChild(style);
    }

    infoBar.innerHTML = `
        <div class="signup-info-content">
            <div class="signup-info-text">
                <strong> Save Your Fish Data!</strong> It's stored locally rn.
                Sign up or log in to preserve it across devices.
            </div>
            <div class="signup-info-actions">
                <button id="signup-info-login" class="signup-info-btn">Log In</button>
                <button id="signup-info-signup" class="signup-info-btn primary">Sign Up</button>
                <button id="signup-info-dismiss" class="signup-info-btn">Dismiss</button>
                <button id="signup-info-close" class="signup-info-close">&times;</button>
            </div>
        </div>
    `;

    // Insert at the beginning of the body
    document.body.insertBefore(infoBar, document.body.firstChild);

    // Adjust page content to account for the info bar
    document.body.style.paddingTop = '60px';

    // Add event listeners
    document.getElementById('signup-info-login').onclick = () => {
        sessionStorage.setItem('signupPromptShown', 'true');
        removeInfoBar();
        window.location.href = 'login.html';
    };

    document.getElementById('signup-info-signup').onclick = () => {
        sessionStorage.setItem('signupPromptShown', 'true');
        removeInfoBar();
        window.location.href = 'login.html?signup=true';
    };

    document.getElementById('signup-info-dismiss').onclick = () => {
        sessionStorage.setItem('signupPromptShown', 'true');
        removeInfoBar();
    };

    document.getElementById('signup-info-close').onclick = () => {
        sessionStorage.setItem('signupPromptShown', 'true');
        removeInfoBar();
    };

    // Auto-dismiss after 30 seconds
    setTimeout(() => {
        if (document.getElementById('signup-info-bar')) {
            sessionStorage.setItem('signupPromptShown', 'true');
            removeInfoBar();
        }
    }, 30000);

    function removeInfoBar() {
        const bar = document.getElementById('signup-info-bar');
        if (bar) {
            bar.style.animation = 'slideUp 0.3s ease-in forwards';
            setTimeout(() => {
                if (bar.parentNode) {
                    bar.parentNode.removeChild(bar);
                }
                document.body.style.paddingTop = '';
            }, 300);
        }
    }

    // Add slide up animation
    const style = document.getElementById('signup-info-bar-styles');
    if (style && !style.textContent.includes('slideUp')) {
        style.textContent += `
            @keyframes slideUp {
                from { transform: translateY(0); opacity: 1; }
                to { transform: translateY(-100%); opacity: 0; }
            }
        `;
    }
}

// ===== 背景气泡效果 =====
function createBackgroundBubbles() {
    const container = document.querySelector('.background-bubbles');
    if (!container) return;
    
    const bubbleCount = 15;
    
    for (let i = 0; i < bubbleCount; i++) {
        const bubble = document.createElement('div');
        bubble.className = 'bubble';
        
        // 随机大小
        const size = Math.random() * 40 + 20;
        bubble.style.width = size + 'px';
        bubble.style.height = size + 'px';
        
        // 随机水平位置
        bubble.style.left = Math.random() * 100 + '%';
        
        // 随机动画延迟
        bubble.style.animationDelay = Math.random() * 5 + 's';
        
        // 随机动画持续时间
        bubble.style.animationDuration = (Math.random() * 3 + 4) + 's';
        
        container.appendChild(bubble);
    }
}

// 页面加载时初始化气泡效果
createBackgroundBubbles();

/**
 * 加载用户收到的评论
 * @param {string} userId - 用户ID
 */
async function loadUserComments(userId) {
    try {
        const commentsSection = document.getElementById('profile-comments-section');
        const commentsContainer = document.getElementById('profile-comments-container');
        const commentsCount = document.getElementById('profile-comments-count');
        
        if (!commentsSection || !commentsContainer) {
            console.warn('⚠️ Comments section or container not found');
            return;
        }

        // 显示评论区域
        commentsSection.style.display = 'block';
        console.log('✅ Comments section displayed');
        
        // 显示加载状态
        commentsContainer.innerHTML = '<div class="comments-loading" style="text-align: center; padding: 20px; color: #666;">Loading comments...</div>';

        // 使用 MessageUI 渲染评论
        if (typeof MessageUI !== 'undefined') {
            await MessageUI.renderCommentsSection('profile-comments-container', 'to_owner', userId, {
                showForm: false,
                showFishInfo: true,
                showDeleteBtn: true,
                title: 'Received Comments'
            });

            // 检查是否有评论
            const comments = commentsContainer.querySelectorAll('.comment-card');
            if (comments.length === 0) {
                // 如果没有评论，显示空状态
                commentsContainer.innerHTML = `
                    <div class="comments-empty" style="text-align: center; padding: 40px 20px; color: #999;">
                        <div style="font-size: 48px; margin-bottom: 16px;">📭</div>
                        <div style="font-size: 16px; font-weight: 600; margin-bottom: 8px;">No comments yet</div>
                        <div style="font-size: 14px;">You haven't received any comments.</div>
                    </div>
                `;
            }
            
            // 更新评论数量
            if (commentsCount) {
                commentsCount.textContent = comments.length;
            }
            console.log(`✅ Loaded ${comments.length} comments`);
        } else {
            console.warn('⚠️ MessageUI not available');
            commentsContainer.innerHTML = `
                <div class="comments-empty" style="text-align: center; padding: 40px 20px; color: #999;">
                    <div style="font-size: 48px; margin-bottom: 16px;">⚠️</div>
                    <div style="font-size: 16px; font-weight: 600; margin-bottom: 8px;">Comment system unavailable</div>
                    <div style="font-size: 14px;">Please refresh the page to try again.</div>
                </div>
            `;
        }
    } catch (error) {
        console.error('❌ Load user comments error:', error);
        const commentsContainer = document.getElementById('profile-comments-container');
        if (commentsContainer) {
            commentsContainer.innerHTML = `
                <div class="comment-error" style="text-align: center; padding: 40px 20px; color: #e74c3c;">
                    <div style="font-size: 48px; margin-bottom: 16px;">❌</div>
                    <div style="font-size: 16px; font-weight: 600; margin-bottom: 8px;">Failed to load comments</div>
                    <div style="font-size: 14px;">${error.message || 'Unknown error'}</div>
                    <button onclick="location.reload()" style="margin-top: 16px; padding: 8px 16px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">Refresh Page</button>
                </div>
            `;
        }
    }
}

/**
 * 处理 #comments hash - 在页面加载时滚动到评论区域
 */
function handleCommentsHashOnLoad() {
    // 检查URL hash
    if (window.location.hash === '#comments') {
        console.log('🎯 Hash #comments detected, scrolling to comments section');
        setTimeout(() => {
            const commentsSection = document.getElementById('profile-comments-section');
            if (commentsSection) {
                // 确保评论区域可见
                commentsSection.style.display = 'block';
                
                // 滚动到评论区域
                commentsSection.scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'start' 
                });
                
                // 展开所有评论分组
                const groupTitles = commentsSection.querySelectorAll('.comments-group-title.collapsed');
                groupTitles.forEach(title => {
                    const group = title.closest('.comments-group');
                    const list = group.querySelector('.comments-group-list');
                    const icon = title.querySelector('.group-icon');
                    
                    if (list && list.style.display === 'none') {
                        list.style.display = 'flex';
                        title.classList.remove('collapsed');
                        if (icon) icon.textContent = '▼';
                    }
                });
                
                console.log('✅ Scrolled to comments section and expanded groups');
            } else {
                console.warn('⚠️ Comments section not found for scrolling');
            }
        }, 500); // 等待评论加载完成
    }
}

// 监听 hash 变化
window.addEventListener('hashchange', function() {
    if (window.location.hash === '#comments') {
        handleCommentsHashOnLoad();
    }
});

// Export showEditProfileModal globally for use in other modules
window.showEditProfileModal = showEditProfileModal;

/**
 * 加载用户订阅信息
 * @param {string} userId - 用户ID
 */
async function loadUserSubscription(userId) {
    const subscriptionSection = document.getElementById('profile-subscription-section');
    const subscriptionContainer = document.getElementById('profile-subscription-container');
    
    if (!subscriptionSection || !subscriptionContainer) return;
    
    try {
        const query = `
            query GetSubscription($userId: String!) {
                user_subscriptions(
                    where: { user_id: {_eq: $userId}, is_active: {_eq: true} }
                    order_by: {created_at: desc}
                    limit: 1
                ) {
                    id
                    plan
                    payment_provider
                    current_period_end
                    stripe_subscription_id
                    paypal_subscription_id
                }
            }
        `;
        
        const response = await fetch('/api/graphql', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query, variables: { userId } })
        });
        
        const result = await response.json();
        const subscription = result.data?.user_subscriptions?.[0];
        
        subscriptionSection.style.display = 'block';
        subscriptionContainer.innerHTML = renderSubscriptionCard(subscription, userId);
        
        // 绑定取消按钮事件
        const cancelBtn = document.getElementById('cancel-subscription-btn');
        if (cancelBtn) {
            cancelBtn.onclick = () => handleCancelSubscription(userId);
        }
    } catch (error) {
        console.error('Failed to load subscription:', error);
    }
}

/**
 * 渲染订阅卡片
 * @param {object} subscription - 订阅信息
 * @param {string} userId - 用户ID
 * @returns {string} HTML 字符串
 */
function renderSubscriptionCard(subscription, userId) {
    if (!subscription || subscription.plan === 'free') {
        return `
            <div class="subscription-card">
                <div class="subscription-status">
                    <div class="subscription-info">
                        <div class="subscription-plan">
                            <img src="https://cdn.fishart.online/fishart_web/icon/free.svg" alt="Free" style="width: 24px; height: 24px; vertical-align: middle; margin-right: 8px;">
                            Free Plan
                        </div>
                        <div class="subscription-details">Upgrade to unlock premium features</div>
                    </div>
                </div>
                <div class="subscription-actions" style="text-align: center;">
                    <button class="subscription-btn upgrade-btn" onclick="window.location.href='membership.html'">
                        Upgrade Now
                    </button>
                </div>
            </div>
        `;
    }
    
    const planName = subscription.plan.charAt(0).toUpperCase() + subscription.plan.slice(1);
    const badge = subscription.plan === 'premium' ? '👑' : '⭐';
    const nextBilling = subscription.current_period_end 
        ? new Date(subscription.current_period_end).toLocaleDateString() 
        : 'N/A';
    
    return `
        <div class="subscription-card">
            <div class="subscription-status">
                <div class="subscription-badge">${badge}</div>
                <div class="subscription-info">
                    <div class="subscription-plan">${planName} Plan</div>
                    <div class="subscription-details">
                        Provider: ${subscription.payment_provider || 'Unknown'}<br>
                        Next billing: ${nextBilling}
                    </div>
                </div>
            </div>
            <div class="subscription-actions" style="text-align: center;">
                <button id="cancel-subscription-btn" class="subscription-btn cancel-btn">
                    Cancel Subscription
                </button>
                <button class="subscription-btn upgrade-btn" onclick="window.location.href='membership.html'">
                    Change Plan
                </button>
            </div>
        </div>
    `;
}

/**
 * 处理取消订阅
 * @param {string} userId - 用户ID
 */
async function handleCancelSubscription(userId) {
    if (!confirm('Are you sure you want to cancel your subscription? You will continue to have access until the end of your billing period.')) {
        return;
    }
    
    try {
        const response = await fetch('/api/payment?action=manage-subscription', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, action: 'cancel' })
        });
        
        const result = await response.json();
        
        if (response.ok) {
            alert('Subscription canceled successfully. You will have access until the end of your billing period.');
            loadUserSubscription(userId); // 刷新显示
        } else {
            alert('Failed to cancel subscription: ' + (result.error || result.message));
        }
    } catch (error) {
        alert('Error: ' + error.message);
    }
}