/**
 * Our Tank List Page Logic
 * 
 * 好友鱼缸列表页面的核心逻辑
 */

// 全局状态
let currentUser = null;
let tanks = [];

// DOM 元素
const tankListEl = document.getElementById('tank-list');
const loadingEl = document.getElementById('loading');
const emptyStateEl = document.getElementById('empty-state');
const createTankBtn = document.getElementById('create-tank-btn');
const joinTankBtn = document.getElementById('join-tank-btn');
const createModal = document.getElementById('create-modal');
const joinModal = document.getElementById('join-modal');
const createForm = document.getElementById('create-form');
const joinForm = document.getElementById('join-form');

// 等待 Supabase 客户端初始化完成
// supabase-init.js 导出 window.supabaseAuth.client
async function waitForSupabase(timeout = 10000) {
    const startTime = Date.now();
    
    // 等待 supabaseConfigReady 事件
    if (window.supabaseConfigReady === false) {
        await new Promise(resolve => {
            if (window.supabaseConfigReady) {
                resolve();
            } else {
                window.addEventListener('supabaseConfigReady', resolve, { once: true });
                setTimeout(resolve, timeout);
            }
        });
    }
    
    // 等待 window.supabaseAuth.client 可用
    while (!window.supabaseAuth?.client) {
        if (Date.now() - startTime > timeout) {
            console.warn(`⚠️ Supabase initialization timeout after ${timeout}ms`);
            return null;
        }
        await new Promise(resolve => setTimeout(resolve, 100));
        if ((Date.now() - startTime) % 2000 < 100) {
            console.log(`⏳ 等待Supabase初始化... (${((Date.now() - startTime) / 1000).toFixed(1)}秒)`);
        }
    }
    
    console.log(`✅ [Our Tank List] Supabase initialized (${Date.now() - startTime}ms)`);
    return window.supabaseAuth.client;
}

// 初始化
document.addEventListener('DOMContentLoaded', async () => {
    console.log('[Our Tank List] Initializing...');
    
    // 等待 Supabase 初始化
    const supabaseClient = await waitForSupabase();
    if (!supabaseClient) {
        console.error('[Our Tank List] Supabase not initialized');
        showError('初始化失败，请刷新页面');
        return;
    }
    
    // 检查用户登录状态
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) {
        console.log('[Our Tank List] User not logged in, redirecting...');
        window.location.href = 'login.html?redirect=' + encodeURIComponent(window.location.href);
        return;
    }
    
    currentUser = session.user;
    console.log('[Our Tank List] User logged in:', currentUser.id);
    
    // 绑定事件
    bindEvents();
    
    // 加载鱼缸列表
    await loadTanks();
    
    // 检查 URL 中的邀请码参数（支持邀请链接）
    checkInviteCodeFromUrl();
});

/**
 * Check URL for invite code and auto-join
 * Formats:
 * - our-tank-list.html?code=ABC123
 * - our-tank-list.html?invite=ABC123
 */
async function checkInviteCodeFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    const inviteCode = urlParams.get('code') || urlParams.get('invite');
    
    if (inviteCode && inviteCode.length === 6) {
        console.log('[Our Tank List] Detected invite code:', inviteCode);
        
        // Clear URL params first
        const newUrl = window.location.pathname;
        window.history.replaceState({}, document.title, newUrl);
        
        // Try to auto-join the tank
        try {
            const session = await getSession();
            const response = await fetch('/api/our-tank-api?action=join', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`
                },
                body: JSON.stringify({ code: inviteCode.toUpperCase() })
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.message || data.error || 'Failed to join');
            }
            
            // Successfully joined (or already a member), redirect to tank
            const tankId = data.tankId || data.tank?.id;
            if (tankId) {
                console.log('[Our Tank List] Auto-joined tank, redirecting to:', tankId);
                window.location.href = `tank.html?ourTank=${tankId}`;
                return;
            }
            
            // Fallback: reload list
            showToast('Successfully joined tank!');
            await loadTanks();
            
        } catch (error) {
            console.error('[Our Tank List] Auto-join error:', error);
            // Fallback: show join modal with code filled in
            openJoinModal();
            const inviteCodeInput = document.getElementById('invite-code');
            if (inviteCodeInput) {
                inviteCodeInput.value = inviteCode.toUpperCase();
            }
            showToast('Please click Join to continue');
        }
    }
}

// 绑定事件
function bindEvents() {
    createTankBtn.addEventListener('click', openCreateModal);
    joinTankBtn.addEventListener('click', openJoinModal);
    createForm.addEventListener('submit', handleCreateTank);
    joinForm.addEventListener('submit', handleJoinTank);
    
    // 点击模态框外部关闭
    createModal.addEventListener('click', (e) => {
        if (e.target === createModal) closeCreateModal();
    });
    joinModal.addEventListener('click', (e) => {
        if (e.target === joinModal) closeJoinModal();
    });
    
    // ESC 键关闭模态框
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeCreateModal();
            closeJoinModal();
        }
    });
}

// 加载鱼缸列表
async function loadTanks() {
    showLoading();
    
    try {
        const session = await getSession();
        const response = await fetch('/api/our-tank-api?action=list', {
            headers: {
                'Authorization': `Bearer ${session.access_token}`
            }
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || data.error || 'Failed to load tanks');
        }
        
        tanks = data.tanks || [];
        
        // 渲染列表
        renderTankList();
        
    } catch (error) {
        console.error('[Our Tank List] Load error:', error);
        showError('加载失败: ' + error.message);
    }
}

// 渲染鱼缸列表
function renderTankList() {
    hideLoading();
    
    if (tanks.length === 0) {
        tankListEl.style.display = 'none';
        emptyStateEl.style.display = 'block';
        return;
    }
    
    emptyStateEl.style.display = 'none';
    tankListEl.style.display = 'grid';
    
    tankListEl.innerHTML = tanks.map(tank => `
        <div class="tank-card" onclick="openTank('${tank.id}')">
            ${tank.hasUnread ? '<div class="unread-badge">NEW</div>' : ''}
            <div class="tank-header-row">
                <div class="tank-name">
                    ${escapeHtml(tank.name)}
                    ${tank.isOwner ? '<span class="owner-badge">👑 Owner</span>' : ''}
                </div>
                ${tank.isOwner ? `
                <div class="tank-actions">
                    <button class="delete-btn" onclick="event.stopPropagation(); openDeleteModal('${tank.id}', '${escapeHtml(tank.name)}')" title="Delete Tank">🗑️</button>
                </div>
                ` : ''}
            </div>
            ${tank.description ? `<div class="tank-description">${escapeHtml(tank.description)}</div>` : ''}
            <div class="tank-stats">
                <span>👥 ${tank.memberCount || 0} members</span>
                <span>🐟 ${tank.fishCount || 0} fish</span>
            </div>
            <div class="invite-code-row">
                <span>Code: <code>${tank.code}</code></span>
                <button class="share-btn" onclick="event.stopPropagation(); toggleShareMenu(event, '${tank.code}', '${escapeHtml(tank.name)}')">🔗 Share</button>
                <div class="share-menu" id="share-menu-${tank.code}">
                    <div class="share-menu-item" onclick="event.stopPropagation(); shareToTwitter('${tank.code}', '${escapeHtml(tank.name)}')">
                        <img src="https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/x.svg" alt="X"> X (Twitter)
                    </div>
                    <div class="share-menu-item" onclick="event.stopPropagation(); shareToFacebook('${tank.code}', '${escapeHtml(tank.name)}')">
                        <img src="https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/facebook.svg" alt="Facebook"> Facebook
                    </div>
                    <div class="share-menu-item" onclick="event.stopPropagation(); shareToInstagram('${tank.code}', '${escapeHtml(tank.name)}')">
                        <img src="https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/instagram.svg" alt="Instagram"> Instagram
                    </div>
                    <div class="share-menu-item" onclick="event.stopPropagation(); shareToWhatsApp('${tank.code}', '${escapeHtml(tank.name)}')">
                        <img src="https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/whatsapp.svg" alt="WhatsApp"> WhatsApp
                    </div>
                    <div class="share-menu-item" onclick="event.stopPropagation(); copyShareLink('${tank.code}', '${escapeHtml(tank.name)}')">
                        📋 Copy Link
                    </div>
                </div>
            </div>

        </div>
    `).join('');
}

// 打开鱼缸
function openTank(tankId) {
    window.location.href = `tank.html?ourTank=${tankId}`;
}

// 生成分享链接
function getShareUrl(code) {
    const baseUrl = window.location.origin;
    return `${baseUrl}/our-tank-list.html?code=${code}`;
}

// 切换分享菜单
function toggleShareMenu(event, code, tankName) {
    event.stopPropagation();
    
    // 关闭其他打开的菜单
    document.querySelectorAll('.share-menu.active').forEach(menu => {
        menu.classList.remove('active');
    });
    
    const menu = document.getElementById(`share-menu-${code}`);
    if (menu) {
        menu.classList.toggle('active');
    }
}

// 点击其他地方关闭菜单
document.addEventListener('click', () => {
    document.querySelectorAll('.share-menu.active').forEach(menu => {
        menu.classList.remove('active');
    });
});

// 分享到 Twitter/X
function shareToTwitter(code, tankName) {
    const url = getShareUrl(code);
    const text = `🐟 I just created an AI doodle fish tank called "${tankName}"!\n\nDraw a fish, watch it come to life — and yep… they gossip about their owners 🗣️\n\nCome raise some AI fish with me!`;
    const shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
    window.open(shareUrl, '_blank', 'width=600,height=400');
    closeAllShareMenus();
}

// 分享到 Facebook
function shareToFacebook(code, tankName) {
    const url = getShareUrl(code);
    const quote = `🐟 I just created an AI doodle fish tank called "${tankName}"! Draw a fish, watch it come to life — and yep… they gossip about their owners 🗣️ Come raise some AI fish with me!`;
    const shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(quote)}`;
    window.open(shareUrl, '_blank', 'width=600,height=400');
    closeAllShareMenus();
}

// 分享到 Instagram (复制文案，因为 Instagram 不支持直接分享链接)
async function shareToInstagram(code, tankName) {
    const url = getShareUrl(code);
    const text = `🐟 I just created an AI doodle fish tank called "${tankName}"!\n\nDraw a fish, watch it come to life — and yep… they gossip about their owners 🗣️\n\nCome raise some AI fish with me!\n\n👉 ${url}\n\n#FishTalk #AIArt #Doodle #FunApp`;
    try {
        await navigator.clipboard.writeText(text);
        showToast('Caption copied! Paste it in your Instagram post or story 📸');
    } catch (error) {
        const input = document.createElement('textarea');
        input.value = text;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
        showToast('Caption copied! Paste it in your Instagram post or story 📸');
    }
    closeAllShareMenus();
}

// 分享到 WhatsApp
function shareToWhatsApp(code, tankName) {
    const url = getShareUrl(code);
    const text = `🐟 I just created an AI doodle fish tank called "${tankName}"!\n\nDraw a fish, watch it come to life — and yep… they gossip about their owners 🗣️\n\nCome raise some AI fish with me!\n\n👉 ${url}`;
    const shareUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(shareUrl, '_blank');
    closeAllShareMenus();
}

// 复制分享链接（带文案）
async function copyShareLink(code, tankName) {
    const url = getShareUrl(code);
    const text = `🐟 I just created an AI doodle fish tank called "${tankName}"!\n\nDraw a fish, watch it come to life — and yep… they gossip about their owners 🗣️\n\nCome raise some AI fish with me!\n\n👉 ${url}`;
    try {
        await navigator.clipboard.writeText(text);
        showToast('Invite message copied!');
    } catch (error) {
        const input = document.createElement('textarea');
        input.value = text;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
        showToast('Invite message copied!');
    }
    closeAllShareMenus();
}

// 关闭所有分享菜单
function closeAllShareMenus() {
    document.querySelectorAll('.share-menu.active').forEach(menu => {
        menu.classList.remove('active');
    });
}

// 打开创建模态框
function openCreateModal() {
    createModal.classList.add('active');
    document.getElementById('tank-name').focus();
}

// 关闭创建模态框
function closeCreateModal() {
    createModal.classList.remove('active');
    createForm.reset();
}

// 打开加入模态框
function openJoinModal() {
    joinModal.classList.add('active');
    document.getElementById('invite-code').focus();
}

// 关闭加入模态框
function closeJoinModal() {
    joinModal.classList.remove('active');
    joinForm.reset();
}

// 处理创建鱼缸
async function handleCreateTank(e) {
    e.preventDefault();
    console.log('[Our Tank List] handleCreateTank called');
    
    const name = document.getElementById('tank-name').value.trim();
    const description = document.getElementById('tank-description').value.trim();
    
    console.log('[Our Tank List] Create tank data:', { name, description });
    
    if (!name) {
        showToast('Please enter tank name');
        return;
    }
    
    try {
        const session = await getSession();
        console.log('[Our Tank List] Got session, calling API...');
        
        const response = await fetch('/api/our-tank-api?action=create', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`
            },
            body: JSON.stringify({ name, description })
        });
        
        console.log('[Our Tank List] API response status:', response.status);
        const data = await response.json();
        console.log('[Our Tank List] API response data:', data);
        
        if (!response.ok) {
            throw new Error(data.message || data.error || 'Failed to create tank');
        }
        
        showToast('Tank created successfully!');
        closeCreateModal();
        
        // 刷新列表
        await loadTanks();
        
    } catch (error) {
        console.error('[Our Tank List] Create error:', error);
        showToast('Create failed: ' + error.message);
    }
}

// 处理加入鱼缸
async function handleJoinTank(e) {
    e.preventDefault();
    
    const code = document.getElementById('invite-code').value.trim().toUpperCase();
    
    if (!code || code.length !== 6) {
        showToast('Please enter 6-digit invite code');
        return;
    }
    
    try {
        const session = await getSession();
        const response = await fetch('/api/our-tank-api?action=join', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`
            },
            body: JSON.stringify({ code })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || data.error || 'Failed to join tank');
        }
        
        showToast('Successfully joined tank!');
        closeJoinModal();
        
        // 刷新列表
        await loadTanks();
        
    } catch (error) {
        console.error('[Our Tank List] Join error:', error);
        showToast('Join failed: ' + error.message);
    }
}

// 获取当前会话
async function getSession() {
    // 使用 supabaseAuth.client 获取会话
    const client = window.supabaseAuth?.client;
    if (!client) {
        throw new Error('Supabase client not initialized');
    }
    const { data: { session } } = await client.auth.getSession();
    if (!session) {
        window.location.href = 'login.html';
        throw new Error('Not logged in');
    }
    return session;
}

// 显示加载状态
function showLoading() {
    loadingEl.style.display = 'block';
    tankListEl.style.display = 'none';
    emptyStateEl.style.display = 'none';
}

// 隐藏加载状态
function hideLoading() {
    loadingEl.style.display = 'none';
}

// 显示错误
function showError(message) {
    hideLoading();
    emptyStateEl.innerHTML = `
        <div class="emoji">😢</div>
        <h3>出错了</h3>
        <p>${escapeHtml(message)}</p>
        <button class="action-btn primary" onclick="loadTanks()" style="margin-top: 20px;">重试</button>
    `;
    emptyStateEl.style.display = 'block';
}

// 显示 Toast 提示
function showToast(message) {
    // 创建简单的 toast 提示
    const existingToast = document.querySelector('.our-tank-toast');
    if (existingToast) {
        existingToast.remove();
    }
    
    const toast = document.createElement('div');
    toast.className = 'our-tank-toast';
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 12px 24px;
        border-radius: 8px;
        z-index: 10000;
        font-size: 14px;
        animation: fadeInUp 0.3s ease;
    `;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// HTML 转义
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 删除模态框相关
const deleteModal = document.getElementById('delete-modal');

// 打开删除确认模态框
function openDeleteModal(tankId, tankName) {
    document.getElementById('delete-tank-id').value = tankId;
    document.getElementById('delete-tank-name').textContent = tankName;
    deleteModal.classList.add('active');
}

// 关闭删除模态框
function closeDeleteModal() {
    deleteModal.classList.remove('active');
    document.getElementById('delete-tank-id').value = '';
    document.getElementById('delete-tank-name').textContent = '';
}

// 确认删除鱼缸
async function confirmDeleteTank() {
    const tankId = document.getElementById('delete-tank-id').value;
    if (!tankId) return;
    
    try {
        const session = await getSession();
        const response = await fetch('/api/our-tank-api?action=delete', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`
            },
            body: JSON.stringify({ tankId })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || data.error || 'Failed to delete tank');
        }
        
        showToast('Tank deleted successfully!');
        closeDeleteModal();
        
        // 刷新列表
        await loadTanks();
        
    } catch (error) {
        console.error('[Our Tank List] Delete error:', error);
        showToast('Delete failed: ' + error.message);
    }
}

// 绑定删除模态框事件
if (deleteModal) {
    deleteModal.addEventListener('click', (e) => {
        if (e.target === deleteModal) closeDeleteModal();
    });
}

// 导出全局函数
window.openTank = openTank;
window.toggleShareMenu = toggleShareMenu;
window.shareToTwitter = shareToTwitter;
window.shareToFacebook = shareToFacebook;
window.shareToInstagram = shareToInstagram;
window.shareToWhatsApp = shareToWhatsApp;
window.copyShareLink = copyShareLink;
window.closeCreateModal = closeCreateModal;
window.closeJoinModal = closeJoinModal;
window.closeDeleteModal = closeDeleteModal;
window.openDeleteModal = openDeleteModal;
window.confirmDeleteTank = confirmDeleteTank;
window.loadTanks = loadTanks;
