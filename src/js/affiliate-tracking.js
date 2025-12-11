/**
 * 联盟推广者追踪 - 前端脚本
 * 需求: 2.1, 2.2
 * 
 * 功能:
 * 1. 捕获 URL 中的推广码参数 (?ref=CODE)
 * 2. 存储到 localStorage
 * 3. 注册时自动关联推广者
 */

(function() {
  'use strict';
  
  const STORAGE_KEY = 'affiliate_ref_code';
  const STORAGE_TIMESTAMP_KEY = 'affiliate_ref_timestamp';
  const EXPIRY_DAYS = 30; // 推广码有效期30天
  
  /**
   * 捕获 URL 中的推广码
   */
  function captureReferralCode() {
    const urlParams = new URLSearchParams(window.location.search);
    const refCode = urlParams.get('ref');
    
    if (refCode && refCode.length > 0) {
      // 存储推广码和时间戳
      localStorage.setItem(STORAGE_KEY, refCode.toUpperCase());
      localStorage.setItem(STORAGE_TIMESTAMP_KEY, Date.now().toString());
      console.log('[Affiliate] 捕获推广码:', refCode);
      
      // 可选：清理 URL 中的 ref 参数（不刷新页面）
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('ref');
      window.history.replaceState({}, document.title, newUrl.toString());
    }
  }
  
  /**
   * 获取存储的推广码（检查是否过期）
   */
  function getStoredReferralCode() {
    const code = localStorage.getItem(STORAGE_KEY);
    const timestamp = localStorage.getItem(STORAGE_TIMESTAMP_KEY);
    
    if (!code || !timestamp) {
      return null;
    }
    
    // 检查是否过期
    const storedTime = parseInt(timestamp, 10);
    const expiryTime = storedTime + (EXPIRY_DAYS * 24 * 60 * 60 * 1000);
    
    if (Date.now() > expiryTime) {
      // 已过期，清除
      clearReferralCode();
      console.log('[Affiliate] 推广码已过期');
      return null;
    }
    
    return code;
  }
  
  /**
   * 清除存储的推广码
   */
  function clearReferralCode() {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(STORAGE_TIMESTAMP_KEY);
  }
  
  /**
   * 关联推荐人（注册后调用）
   */
  async function linkReferral(userId) {
    const refCode = getStoredReferralCode();
    
    if (!refCode) {
      return { success: false, reason: 'no_code' };
    }
    
    try {
      const response = await fetch(`/api/affiliate-api?action=link`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId
        },
        body: JSON.stringify({ referralCode: refCode })
      });
      
      const result = await response.json();
      
      if (result.success) {
        console.log('[Affiliate] 成功关联推荐人:', result.affiliate_id);
        clearReferralCode(); // 关联成功后清除
      } else {
        console.log('[Affiliate] 关联失败:', result.error);
      }
      
      return result;
    } catch (error) {
      console.error('[Affiliate] 关联请求失败:', error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * 验证推广码是否有效
   */
  async function validateReferralCode(code) {
    try {
      const response = await fetch(`/api/affiliate-api?action=validate&code=${encodeURIComponent(code)}`);
      return await response.json();
    } catch (error) {
      console.error('[Affiliate] 验证推广码失败:', error);
      return { valid: false, error: error.message };
    }
  }
  
  // 页面加载时捕获推广码
  captureReferralCode();
  
  // 导出到全局
  window.AffiliateTracking = {
    getStoredReferralCode,
    clearReferralCode,
    linkReferral,
    validateReferralCode
  };
  
  /**
   * 监听认证状态变化，自动关联推广码
   * 解决 OAuth 登录时推广码不生效的问题
   */
  function setupAuthListener() {
    if (!window.supabaseAuth || !window.supabaseAuth.onAuthStateChange) {
      // 等待 supabaseAuth 初始化
      setTimeout(setupAuthListener, 100);
      return;
    }
    
    window.supabaseAuth.onAuthStateChange(async (event, session) => {
      // 只在登录成功时处理
      if (event === 'SIGNED_IN' && session?.user) {
        const refCode = getStoredReferralCode();
        if (refCode) {
          console.log('[Affiliate] 登录成功，检测到推广码:', refCode);
          try {
            const result = await linkReferral(session.user.id);
            if (result.success) {
              console.log('[Affiliate] ✅ 成功关联推广者:', result.affiliate_id);
            } else {
              console.log('[Affiliate] 关联结果:', result.error || result.reason);
            }
          } catch (error) {
            console.error('[Affiliate] 关联失败:', error);
          }
        }
      }
    });
    
    console.log('[Affiliate] 认证监听器已设置');
  }
  
  // 设置认证监听器
  setupAuthListener();
  
  console.log('[Affiliate] 追踪模块已加载');
})();
