/**
 * Supabase 认证配置
 * 替换原有的Firebase认证系统
 */

// 注意：在浏览器环境中使用CDN引入的@supabase/supabase-js
// <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>

// Supabase客户端（将在配置加载后初始化）
// 使用 supabaseClient 避免与 CDN 脚本的 window.supabase 冲突
let supabaseClient = null;

// 初始化Supabase客户端
async function initializeSupabaseClient() {
  // 等待配置加载
  if (!window.supabaseConfigReady) {
    await new Promise(resolve => {
      window.addEventListener('supabaseConfigReady', resolve, { once: true });
    });
  }
  
  // 等待Supabase SDK加载（最多等待10秒）
  let retries = 0;
  const maxRetries = 200; // 10秒 (200 * 50ms)
  while (!window.supabase?.createClient && retries < maxRetries) {
    await new Promise(resolve => setTimeout(resolve, 50));
    retries++;
    
    // 每2秒输出一次加载状态
    if (retries % 40 === 0) {
      console.log(`⏳ 等待Supabase SDK加载... (${retries * 50 / 1000}秒)`);
    }
  }
  
  const SUPABASE_URL = window.SUPABASE_URL;
  const SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY;
  
  // 如果Supabase被禁用，跳过初始化
  if (window.SUPABASE_DISABLED) {
    console.warn('⚠️ Supabase is disabled - authentication features unavailable');
    console.warn('💡 To enable: configure SUPABASE_URL and SUPABASE_ANON_KEY in .env file');
    return null;
  }
  
  if (!window.supabase?.createClient) {
    console.error('⚠️ Supabase SDK not loaded after 10 seconds');
    console.error('💡 Possible solutions:');
    console.error('   1. Check your internet connection');
    console.error('   2. Disable browser tracking prevention (Edge/Safari)');
    console.error('   3. Check browser console for CORS/CDN errors');
    console.error('   4. Try refreshing the page');
    return null;
  }
  
  supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  console.log('✅ Supabase client initialized');
  return supabaseClient;
}

// 立即开始初始化
initializeSupabaseClient();

// ====================================
// 认证相关函数
// ====================================

/**
 * 用户注册
 * @param {string} email - 邮箱
 * @param {string} password - 密码
 * @returns {Promise<{data, error}>}
 */
async function signUp(email, password) {
  if (!supabaseClient) return { data: null, error: new Error('Supabase未初始化') };
  
  try {
    const { data, error } = await supabaseClient.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/index.html`
      }
    });
    
    if (error) throw error;
    
    // 检测重复注册：
    // 1. identities 为空数组（Supabase 默认安全行为）
    // 2. created_at 时间早于当前时间超过 1 分钟（说明是已存在的用户）
    if (data.user) {
      const identitiesEmpty = data.user.identities && data.user.identities.length === 0;
      const createdAt = new Date(data.user.created_at);
      const now = new Date();
      const isOldUser = (now - createdAt) > 60000; // 超过 1 分钟
      
      if (identitiesEmpty || isOldUser) {
        console.warn('⚠️ 邮箱已被注册:', email);
        return { 
          data: null, 
          error: new Error('This email is already registered. Please sign in instead.') 
        };
      }
    }
    
    console.log('✅ 注册成功:', data.user?.email);
    return { data, error: null };
  } catch (error) {
    console.error('❌ 注册失败:', error.message);
    return { data: null, error };
  }
}

/**
 * 用户登录
 * @param {string} email - 邮箱
 * @param {string} password - 密码
 * @returns {Promise<{data, error}>}
 */
async function signIn(email, password) {
  if (!supabaseClient) return { data: null, error: new Error('Supabase未初始化') };
  
  try {
    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email,
      password
    });
    
    if (error) throw error;
    
    console.log('✅ 登录成功:', data.user?.email);
    return { data, error: null };
  } catch (error) {
    console.error('❌ 登录失败:', error.message);
    return { data: null, error };
  }
}

/**
 * 用户登出
 * @returns {Promise<{error}>}
 */
async function signOut() {
  if (!supabaseClient) return { error: new Error('Supabase未初始化') };
  
  try {
    const { error } = await supabaseClient.auth.signOut();
    if (error) throw error;
    
    console.log('✅ 登出成功');
    return { error: null };
  } catch (error) {
    console.error('❌ 登出失败:', error.message);
    return { error };
  }
}

/**
 * 社交账号登录 (OAuth)
 * @param {string} provider - 提供商: 'google', 'twitter', 'facebook', 'discord', 'apple', 'reddit'
 * @returns {Promise<{data, error}>}
 */
async function signInWithOAuth(provider) {
  if (!supabaseClient) return { data: null, error: new Error('Supabase未初始化') };
  
  const validProviders = ['google', 'twitter', 'facebook', 'discord', 'apple', 'reddit'];
  if (!validProviders.includes(provider)) {
    return { 
      data: null, 
      error: new Error(`不支持的提供商: ${provider}。支持的提供商: ${validProviders.join(', ')}`) 
    };
  }
  
  try {
    // 🔧 在 OAuth 登录前，检查当前是否为匿名用户，保存其 ID 用于数据迁移
    const currentUser = await getCurrentUser();
    if (currentUser && isAnonymousUser(currentUser)) {
      console.log('🔄 检测到匿名用户，保存 ID 用于数据迁移:', currentUser.id);
      localStorage.setItem('pendingAnonymousUserId', currentUser.id);
    }
    
    // 获取正确的回调 URL
    // 在生产环境，使用当前域名；在开发环境，使用当前端口
    const isLocalhost = window.location.hostname === 'localhost' || 
                       window.location.hostname === '127.0.0.1';
    
    // 使用当前页面的 origin（自动包含正确的端口）
    const redirectOrigin = window.location.origin;
    
    const redirectTo = `${redirectOrigin}/index.html`;
    
    console.log(`🔄 OAuth redirectTo: ${redirectTo}`);
    
    const { data, error } = await supabaseClient.auth.signInWithOAuth({
      provider: provider,
      options: {
        redirectTo: redirectTo,
        skipBrowserRedirect: false
      }
    });
    
    if (error) throw error;
    
    console.log(`✅ 正在使用 ${provider} 登录...`);
    return { data, error: null };
  } catch (error) {
    console.error(`❌ ${provider} 登录失败:`, error.message);
    return { data: null, error };
  }
}

/**
 * 获取当前登录用户
 * @param {boolean} forceRefresh - 强制刷新（跳过缓存）
 * @returns {Promise<User|null>}
 */
async function getCurrentUser(forceRefresh = false) {
  if (!supabaseClient) return null;
  
  // 优先使用缓存
  if (window.authCache && !forceRefresh) {
    const cachedUser = window.authCache.getCachedUser();
    if (cachedUser) {
      return cachedUser;
    }
  }
  
  try {
    const { data: { user }, error } = await supabaseClient.auth.getUser();
    if (error) throw error;
    
    return user;
  } catch (error) {
    console.error('❌ 获取用户失败:', error.message);
    return null;
  }
}

/**
 * 获取当前会话
 * @param {boolean} forceRefresh - 强制刷新（跳过缓存）
 * @returns {Promise<Session|null>}
 */
async function getSession(forceRefresh = false) {
  if (!supabaseClient) return null;
  
  // 优先使用缓存
  if (window.authCache && !forceRefresh) {
    const cachedSession = window.authCache.getCachedSession();
    if (cachedSession) {
      return cachedSession;
    }
  }
  
  try {
    const { data: { session }, error } = await supabaseClient.auth.getSession();
    if (error) throw error;
    
    return session;
  } catch (error) {
    console.error('❌ 获取会话失败:', error.message);
    return null;
  }
}

/**
 * 监听认证状态变化
 * @param {Function} callback - 回调函数 (event, session) => {}
 * @returns {Object} 取消订阅的对象
 */
function onAuthStateChange(callback) {
  if (!supabaseClient) {
    console.warn('⚠️ Supabase未初始化，无法监听认证状态');
    return { data: { subscription: { unsubscribe: () => {} } } };
  }
  
  const { data } = supabaseClient.auth.onAuthStateChange(async (event, session) => {
    console.log('🔔 认证状态变化:', event, session?.user?.email);
    
    // 更新缓存
    if (window.authCache) {
      if (session && session.user) {
        // 直接更新缓存，避免触发新的认证状态变化
        window.authCache.cache.user = session.user;
        window.authCache.cache.session = session;
        window.authCache.cache.timestamp = Date.now();
        window.authCache.cache.isValid = true;
        window.authCache.saveToStorage();
        window.authCache.syncLegacyStorage(session.user, session);
      } else if (event === 'SIGNED_OUT') {
        window.authCache.clear();
      }
    }
    
    // 🔧 检查是否需要迁移匿名用户数据
    if (event === 'SIGNED_IN' && session?.user) {
      const pendingAnonymousUserId = localStorage.getItem('pendingAnonymousUserId');
      if (pendingAnonymousUserId && pendingAnonymousUserId !== session.user.id) {
        console.log('🔄 检测到需要迁移匿名用户数据');
        console.log('  匿名用户 ID:', pendingAnonymousUserId);
        console.log('  新用户 ID:', session.user.id);
        
        // 执行数据迁移
        try {
          await migrateAnonymousUserData(pendingAnonymousUserId, session.user.id);
          console.log('✅ 匿名用户数据迁移完成');
        } catch (error) {
          console.error('❌ 匿名用户数据迁移失败:', error);
        }
        
        // 清除待迁移的匿名用户 ID
        localStorage.removeItem('pendingAnonymousUserId');
      }
    }
    
    callback(event, session);
  });
  
  return data;
}

/**
 * 发送密码重置邮件
 * @param {string} email - 邮箱
 * @returns {Promise<{data, error}>}
 */
async function resetPasswordForEmail(email) {
  if (!supabaseClient) return { data: null, error: new Error('Supabase未初始化') };
  
  try {
    const { data, error } = await supabaseClient.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password.html`
    });
    
    if (error) throw error;
    
    console.log('✅ 密码重置邮件已发送');
    return { data, error: null };
  } catch (error) {
    console.error('❌ 发送密码重置邮件失败:', error.message);
    return { data: null, error };
  }
}

/**
 * 更新密码
 * @param {string} newPassword - 新密码
 * @returns {Promise<{data, error}>}
 */
async function updatePassword(newPassword) {
  if (!supabaseClient) return { data: null, error: new Error('Supabase未初始化') };
  
  try {
    const { data, error } = await supabaseClient.auth.updateUser({
      password: newPassword
    });
    
    if (error) throw error;
    
    console.log('✅ 密码更新成功');
    return { data, error: null };
  } catch (error) {
    console.error('❌ 密码更新失败:', error.message);
    return { data: null, error };
  }
}

/**
 * 获取访问令牌（用于API调用）
 * @returns {Promise<string|null>}
 */
async function getAccessToken() {
  const session = await getSession();
  return session?.access_token || null;
}

/**
 * 匿名登录
 * 创建一个临时匿名用户，无需邮箱或密码
 * @returns {Promise<{data, error}>}
 */
async function signInAnonymously() {
  if (!supabaseClient) return { data: null, error: new Error('Supabase not initialized') };
  
  try {
    const { data, error } = await supabaseClient.auth.signInAnonymously();
    
    if (error) throw error;
    
    console.log('✅ Anonymous login successful:', data.user?.id);
    return { data, error: null };
  } catch (error) {
    console.error('❌ Anonymous login failed:', error.message);
    return { data: null, error };
  }
}

/**
 * 升级匿名账号 - 邮箱方式
 * @param {string} email - 邮箱
 * @param {string} password - 密码
 * @returns {Promise<{data, error}>}
 */
async function upgradeWithEmail(email, password) {
  if (!supabaseClient) return { data: null, error: new Error('Supabase not initialized') };
  
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return { data: null, error: new Error('User not logged in') };
    }
    
    if (!isAnonymousUser(currentUser)) {
      return { data: null, error: new Error('Current user is not anonymous') };
    }
    
    const { data, error } = await supabaseClient.auth.updateUser({
      email: email,
      password: password
    });
    
    if (error) {
      if (error.message.includes('already registered') || 
          error.message.includes('already exists') ||
          error.message.includes('duplicate')) {
        throw new Error('This email is already registered');
      }
      throw error;
    }
    
    console.log('✅ Account upgraded (email):', email);
    return { data, error: null };
  } catch (error) {
    console.error('❌ Account upgrade failed:', error.message);
    return { data: null, error };
  }
}

/**
 * 升级匿名账号 - OAuth 方式
 * @param {string} provider - OAuth 提供商
 * @returns {Promise<{data, error}>}
 */
async function upgradeWithOAuth(provider) {
  if (!supabaseClient) return { data: null, error: new Error('Supabase not initialized') };
  
  const validProviders = ['google', 'twitter', 'facebook', 'discord', 'apple', 'reddit'];
  if (!validProviders.includes(provider)) {
    return { data: null, error: new Error(`Unsupported provider: ${provider}`) };
  }
  
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return { data: null, error: new Error('User not logged in') };
    }
    
    if (!isAnonymousUser(currentUser)) {
      return { data: null, error: new Error('Current user is not anonymous') };
    }
    
    // 使用当前页面的 origin（自动包含正确的端口）
    const redirectOrigin = window.location.origin;
    const redirectTo = `${redirectOrigin}/index.html`;
    
    const { data, error } = await supabaseClient.auth.linkIdentity({
      provider: provider,
      options: { redirectTo: redirectTo }
    });
    
    if (error) throw error;
    
    console.log(`✅ Upgrading with ${provider}...`);
    return { data, error: null };
  } catch (error) {
    console.error(`❌ ${provider} upgrade failed:`, error.message);
    return { data: null, error };
  }
}

// ====================================
// 辅助函数
// ====================================

/**
 * 检查用户是否为匿名用户
 * @param {Object} user - 用户对象
 * @returns {boolean}
 */
function isAnonymousUser(user) {
  if (!user) return false;
  return user.is_anonymous === true || 
         (!user.email && (!user.identities || user.identities.length === 0));
}

/**
 * 迁移匿名用户数据到新用户
 * 当匿名用户通过 OAuth 登录后，将其创建的鱼迁移到新账号
 * @param {string} anonymousUserId - 匿名用户 ID
 * @param {string} newUserId - 新用户 ID
 * @returns {Promise<void>}
 */
async function migrateAnonymousUserData(anonymousUserId, newUserId) {
  if (!anonymousUserId || !newUserId) {
    console.warn('⚠️ 迁移数据失败：缺少用户 ID');
    return;
  }
  
  if (anonymousUserId === newUserId) {
    console.log('ℹ️ 用户 ID 相同，无需迁移');
    return;
  }
  
  console.log('🔄 开始迁移匿名用户数据...');
  console.log('  从:', anonymousUserId);
  console.log('  到:', newUserId);
  
  try {
    // 调用后端 API 迁移鱼数据
    const response = await fetch(`${window.BACKEND_URL || ''}/api/fish-api?action=migrate-user`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        fromUserId: anonymousUserId,
        toUserId: newUserId
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`迁移 API 返回错误: ${response.status} - ${errorText}`);
    }
    
    const result = await response.json();
    console.log('✅ 数据迁移结果:', result);
    
    if (result.success) {
      console.log(`✅ 成功迁移 ${result.migratedCount || 0} 条鱼数据`);
    } else {
      console.warn('⚠️ 迁移可能未完全成功:', result.message);
    }
  } catch (error) {
    console.error('❌ 数据迁移失败:', error);
    // 不抛出错误，避免影响登录流程
  }
}

/**
 * 获取用户显示信息
 * @param {Object} user - 用户对象
 * @returns {Object} { name, isAnonymous, upgradePrompt }
 */
function getUserDisplayInfo(user) {
  if (!user) {
    return { name: 'Not logged in', isAnonymous: false, upgradePrompt: false };
  }
  
  const isAnon = isAnonymousUser(user);
  
  if (isAnon) {
    // 匿名用户显示 User+ID后4位
    const shortId = user.id ? user.id.slice(-4) : '0000';
    return { name: `User${shortId}`, isAnonymous: true, upgradePrompt: true };
  }
  
  const name = user.user_metadata?.name || 
               user.user_metadata?.nick_name ||
               user.email?.split('@')[0] || 
               'User';
  
  return { name: name, isAnonymous: false, upgradePrompt: false };
}

/**
 * 检查用户是否已登录
 * @param {boolean} useCache - 使用缓存（默认 true）
 * @returns {Promise<boolean>}
 */
async function isLoggedIn(useCache = true) {
  // 优先使用缓存（同步检查）
  if (useCache && window.authCache) {
    return window.authCache.isLoggedIn();
  }
  
  // 异步检查
  const user = await getCurrentUser();
  return !!user;
}

/**
 * 要求用户登录（如果未登录则跳转）
 * @param {string} redirectUrl - 登录后返回的URL
 */
async function requireAuth(redirectUrl) {
  const loggedIn = await isLoggedIn();
  if (!loggedIn) {
    const returnUrl = redirectUrl || window.location.href;
    window.location.href = `/login.html?returnUrl=${encodeURIComponent(returnUrl)}`;
  }
}

/**
 * 获取用户显示名称
 * @returns {Promise<string>}
 */
async function getUserDisplayName() {
  const user = await getCurrentUser();
  if (!user) return 'Anonymous';
  
  // 优先使用 user_metadata 中的 name
  if (user.user_metadata?.name) {
    return user.user_metadata.name;
  }
  
  // 否则使用邮箱前缀
  if (user.email) {
    return user.email.split('@')[0];
  }
  
  return 'User';
}

// ====================================
// 导出到全局
// ====================================

// 导出认证函数（立即可用，即使客户端还在初始化）
window.supabaseAuth = {
  // 客户端（getter，确保获取最新的客户端实例）
  get client() {
    return supabaseClient;
  },
  
  // 认证函数
  signUp,
  signIn,
  signInWithOAuth,
  signInAnonymously,
  signOut,
  getCurrentUser,
  getUser: getCurrentUser, // 别名，兼容性
  getSession,
  onAuthStateChange,
  resetPasswordForEmail,
  updatePassword,
  getAccessToken,
  
  // 账号升级函数
  upgradeWithEmail,
  upgradeWithOAuth,
  
  // 辅助函数
  isLoggedIn,
  isAnonymousUser,
  getUserDisplayInfo,
  requireAuth,
  getUserDisplayName
};

// 兼容性：保留一些旧的全局变量名
window.getCurrentUser = getCurrentUser;
window.isLoggedIn = isLoggedIn;

console.log('✅ Supabase auth module loaded');



