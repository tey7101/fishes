// Fish Tank Only JS
// This file contains only the logic for displaying and animating the fish tank.
// Now supports both Global Tank (default) and Private Tank (view=my) modes

// =====================================================
// View Mode Detection
// =====================================================
// Use existing urlParams if already declared (e.g., by fish-utils.js), otherwise create new
const tankUrlParams = window.urlParams || new URLSearchParams(window.location.search);
const OUR_TANK_ID = tankUrlParams.get('ourTank') || null; // For 'our' mode
// Determine view mode: 'our' if ourTank param exists, otherwise check 'view' param
const VIEW_MODE = OUR_TANK_ID ? 'our' : (tankUrlParams.get('view') || 'global'); // 'global', 'my', or 'our'
console.log(`🎯 Tank View Mode: ${VIEW_MODE}${OUR_TANK_ID ? `, Tank ID: ${OUR_TANK_ID}` : ''}`);

// Canvas and fishes will be initialized in DOMContentLoaded
// Don't access DOM elements here as they may not exist yet
let swimCanvas = null;
let swimCtx = null;
const fishes = [];

// Export fishes array and view mode to window for external access
window.fishes = fishes;
window.currentUser = null;
window.VIEW_MODE = VIEW_MODE;

// Initialize Fish Dialogue System (Phase 0) - will be initialized in DOMContentLoaded
let fishDialogueManager = null;

// Initialize Tank Layout Manager (Community Chat System) - will be initialized in DOMContentLoaded
let tankLayoutManager = null;
let communityChatManager = null;

// Food system
const foodPellets = [];
const FOOD_SIZE = 8; // Increased size for better visibility
const FOOD_FALL_SPEED = .01;
const FOOD_DETECTION_RADIUS = 200; // Moderate detection radius
const FOOD_LIFESPAN = 15000; // 15 seconds
const FOOD_ATTRACTION_FORCE = 0.003; // Moderate attraction force

// Food pellet creation and management
function createFoodPellet(x, y) {
    return {
        x: x,
        y: y,
        vy: 0, // Initial vertical velocity
        createdAt: Date.now(),
        consumed: false,
        size: FOOD_SIZE
    };
}

function dropFoodPellet(x, y) {
    // Create a small cluster of food pellets for more realistic feeding
    const pelletCount = Math.floor(Math.random() * 3) + 2; // 2-4 pellets
    for (let i = 0; i < pelletCount; i++) {
        const offsetX = (Math.random() - 0.5) * 20; // Spread pellets around click point
        const offsetY = (Math.random() - 0.5) * 10;
        foodPellets.push(createFoodPellet(x + offsetX, y + offsetY));
    }

    // Add visual feedback for feeding
    createFeedingEffect(x, y);
}

function createFeedingEffect(x, y) {
    // Create a colorful splash effect when food is dropped
    const effect = {
        x: x,
        y: y,
        particles: [],
        createdAt: Date.now(),
        duration: 500,
        type: 'feeding'
    };

    // Create purple splash particles
    const colors = ['#6366F1', '#A5B4FC', '#C7D2FE', '#EEF2FF'];
    for (let i = 0; i < 12; i++) {
        const angle = (Math.PI * 2 * i) / 12;
        const velocity = Math.random() * 3 + 2;
        effect.particles.push({
            x: x,
            y: y,
            vx: Math.cos(angle) * velocity,
            vy: Math.sin(angle) * velocity,
            life: 1,
            color: colors[Math.floor(Math.random() * colors.length)],
            size: Math.random() * 4 + 2
        });
    }

    // Store effect for rendering
    if (!window.feedingEffects) window.feedingEffects = [];
    window.feedingEffects.push(effect);
}

function updateFoodPellets() {
    for (let i = foodPellets.length - 1; i >= 0; i--) {
        const pellet = foodPellets[i];

        // Remove consumed or expired pellets
        if (pellet.consumed || Date.now() - pellet.createdAt > FOOD_LIFESPAN) {
            foodPellets.splice(i, 1);
            continue;
        }

        // Apply gravity
        pellet.vy += FOOD_FALL_SPEED; // Slower gravity acceleration
        pellet.y += pellet.vy;

        // Stop at bottom of tank
        // 🔧 修复：使用逻辑高度
        const logicalHeight = swimCanvas.logicalHeight || swimCanvas.height;
        if (pellet.y > logicalHeight - pellet.size) {
            pellet.y = logicalHeight - pellet.size;
            pellet.vy = 0;
        }

        // Check for fish consumption
        for (let fish of fishes) {
            if (fish.isDying || fish.isEntering) continue;

            const fishCenterX = fish.x + fish.width / 2;
            const fishCenterY = fish.y + fish.height / 2;
            const dx = pellet.x - fishCenterX;
            const dy = pellet.y - fishCenterY;
            const distance = Math.sqrt(dx * dx + dy * dy);

            // If fish is close enough, consume the pellet
            if (distance < fish.width / 2 + pellet.size) {
                pellet.consumed = true;
                // Add a small visual effect when food is consumed
                createFoodConsumptionEffect(pellet.x, pellet.y);
                break;
            }
        }
    }
}

function createFoodConsumptionEffect(x, y) {
    // Create a small particle effect when food is consumed
    const effect = {
        x: x,
        y: y,
        particles: [],
        createdAt: Date.now(),
        duration: 500
    };

    // Create small particles
    for (let i = 0; i < 5; i++) {
        effect.particles.push({
            x: x,
            y: y,
            vx: (Math.random() - 0.5) * 4,
            vy: (Math.random() - 0.5) * 4,
            life: 1
        });
    }

    // Store effect for rendering (we'll add this to the animation loop)
    if (!window.foodEffects) window.foodEffects = [];
    window.foodEffects.push(effect);
}

function renderFoodPellets() {
    if (foodPellets.length === 0) return;

    for (const pellet of foodPellets) {
        if (pellet.consumed) continue;

        const x = pellet.x;
        const y = pellet.y;
        const size = pellet.size;

        swimCtx.save();

        // 绘制鱼食颗粒 - 椭圆形状带渐变
        // 主体渐变（橙红色到棕色，像真实鱼食）
        const gradient = swimCtx.createRadialGradient(
            x - size * 0.2, y - size * 0.3, 0,
            x, y, size
        );
        gradient.addColorStop(0, '#FFB347');   // 亮橙色高光
        gradient.addColorStop(0.4, '#FF8C42'); // 橙色
        gradient.addColorStop(0.8, '#D2691E'); // 巧克力色
        gradient.addColorStop(1, '#8B4513');   // 深棕色边缘

        // 画椭圆形鱼食（稍微扁一点更像真实颗粒）
        swimCtx.beginPath();
        swimCtx.ellipse(x, y, size, size * 0.7, 0, 0, Math.PI * 2);
        swimCtx.fillStyle = gradient;
        swimCtx.fill();

        // 添加高光点（让颗粒看起来有光泽）
        swimCtx.beginPath();
        swimCtx.ellipse(x - size * 0.25, y - size * 0.2, size * 0.3, size * 0.2, -0.5, 0, Math.PI * 2);
        swimCtx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        swimCtx.fill();

        // 添加小高光点
        swimCtx.beginPath();
        swimCtx.arc(x - size * 0.35, y - size * 0.35, size * 0.12, 0, Math.PI * 2);
        swimCtx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        swimCtx.fill();

        swimCtx.restore();
    }
}

function renderFoodEffects() {
    if (!window.foodEffects) return;

    for (let i = window.foodEffects.length - 1; i >= 0; i--) {
        const effect = window.foodEffects[i];
        const elapsed = Date.now() - effect.createdAt;
        const progress = elapsed / effect.duration;

        if (progress >= 1) {
            window.foodEffects.splice(i, 1);
            continue;
        }

        swimCtx.save();
        swimCtx.globalAlpha = 1 - progress;
        swimCtx.fillStyle = '#FFD700'; // Gold color for consumption effect

        for (const particle of effect.particles) {
            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.vx *= 0.98; // Slight drag
            particle.vy *= 0.98;

            swimCtx.beginPath();
            swimCtx.arc(particle.x, particle.y, 1, 0, Math.PI * 2);
            swimCtx.fill();
        }

        swimCtx.restore();
    }
}

function renderFeedingEffects() {
    if (!window.feedingEffects) return;

    for (let i = window.feedingEffects.length - 1; i >= 0; i--) {
        const effect = window.feedingEffects[i];
        const elapsed = Date.now() - effect.createdAt;
        const progress = elapsed / effect.duration;

        if (progress >= 1) {
            window.feedingEffects.splice(i, 1);
            continue;
        }

        swimCtx.save();
        swimCtx.globalAlpha = 1 - progress;

        for (const particle of effect.particles) {
            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.vx *= 0.96; // Slight drag
            particle.vy *= 0.96;

            // Use particle's own color
            swimCtx.fillStyle = particle.color || '#4CAF50';
            swimCtx.beginPath();
            swimCtx.arc(particle.x, particle.y, particle.size || 2, 0, Math.PI * 2);
            swimCtx.fill();
        }

        swimCtx.restore();
    }
}

// Calculate optimal fish size based on tank size
function calculateFishSize() {
    // 🔧 关键修复：使用逻辑尺寸而非实际像素尺寸
    const tankWidth = swimCanvas.logicalWidth || swimCanvas.width;
    const tankHeight = swimCanvas.logicalHeight || swimCanvas.height;
    const isMobile = window.innerWidth <= 768;

    // Scale fish size based on tank dimensions
    // Use smaller dimension to ensure fish fit well on all screen ratios
    const baseDimension = Math.min(tankWidth, tankHeight);

    // Fish width should be roughly 8-12% of the smaller tank dimension
    // 🔧 移动端使用更大的比例，确保鱼在小屏幕上清晰可见
    const basePercentage = isMobile ? 0.20 : 0.1;
    const fishWidth = Math.floor(baseDimension * basePercentage);
    const fishHeight = Math.floor(fishWidth * 0.6); // Maintain 3:5 aspect ratio

    // 🔧 移动端和桌面端使用不同的尺寸范围
    // - Mobile: 60px - 160px wide (适中大小)
    // - Desktop: 30px - 150px wide
    const minWidth = isMobile ? 60 : 30;
    const maxWidth = isMobile ? 160 : 150;
    const minHeight = isMobile ? 36 : 18;
    const maxHeight = isMobile ? 96 : 90;
    
    const finalWidth = Math.max(minWidth, Math.min(maxWidth, fishWidth));
    const finalHeight = Math.max(minHeight, Math.min(maxHeight, fishHeight));

    // 🔍 调试：记录鱼尺寸计算结果
    const result = {
        width: finalWidth,
        height: finalHeight
    };
    console.log('🔍 Fish size calculated:', {
        tankDimensions: `${tankWidth}x${tankHeight}`,
        isMobile,
        baseDimension,
        basePercentage,
        calculatedSize: `${fishWidth}x${fishHeight}`,
        finalSize: `${finalWidth}x${finalHeight}`,
        viewMode: VIEW_MODE
    });
    
    return result;
}

// Rescale all existing fish to maintain consistency
function rescaleAllFish() {
    const newSize = calculateFishSize();

    fishes.forEach(fish => {
        // Store original image source
        const originalCanvas = fish.fishCanvas;

        // Create a temporary canvas to extract the original image
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = originalCanvas.width;
        tempCanvas.height = originalCanvas.height;
        tempCanvas.getContext('2d').drawImage(originalCanvas, 0, 0);

        // Create new resized canvas
        const resizedCanvas = document.createElement('canvas');
        resizedCanvas.width = newSize.width;
        resizedCanvas.height = newSize.height;
        const resizedCtx = resizedCanvas.getContext('2d');

        // Scale the fish image to new size
        resizedCtx.imageSmoothingEnabled = true;
        resizedCtx.imageSmoothingQuality = 'high';
        resizedCtx.drawImage(tempCanvas, 0, 0, newSize.width, newSize.height);

        // Update fish properties
        const oldWidth = fish.width;
        const oldHeight = fish.height;
        fish.fishCanvas = resizedCanvas;
        fish.width = newSize.width;
        fish.height = newSize.height;

        // Adjust position to prevent fish from going off-screen
        // 🔧 修复：使用逻辑尺寸
        const logicalWidth = swimCanvas.logicalWidth || swimCanvas.width;
        const logicalHeight = swimCanvas.logicalHeight || swimCanvas.height;
        fish.x = Math.max(0, Math.min(logicalWidth - newSize.width, fish.x));
        fish.y = Math.max(0, Math.min(logicalHeight - newSize.height, fish.y));
    });
}

// Helper to crop whitespace (transparent or white) from a canvas
function cropCanvasToContent(srcCanvas) {
    const ctx = srcCanvas.getContext('2d');
    const w = srcCanvas.width;
    const h = srcCanvas.height;
    const imgData = ctx.getImageData(0, 0, w, h);
    let minX = w, minY = h, maxX = 0, maxY = 0;
    let found = false;
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const i = (y * w + x) * 4;
            const r = imgData.data[i];
            const g = imgData.data[i + 1];
            const b = imgData.data[i + 2];
            const a = imgData.data[i + 3];
            if (a > 16 && !(r > 240 && g > 240 && b > 240)) {
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
                found = true;
            }
        }
    }
    if (!found) return srcCanvas;
    const cropW = maxX - minX + 1;
    const cropH = maxY - minY + 1;
    const cropped = document.createElement('canvas');
    cropped.width = cropW;
    cropped.height = cropH;
    cropped.getContext('2d').drawImage(srcCanvas, minX, minY, cropW, cropH, 0, 0, cropW, cropH);
    return cropped;
}

function makeDisplayFishCanvas(img, width = 80, height = 48) {
    // 使用高分辨率渲染（2倍）以提高清晰度
    const devicePixelRatio = window.devicePixelRatio || 2;
    const scaleFactor = Math.max(2, devicePixelRatio); // 至少2倍，确保清晰度
    
    const displayCanvas = document.createElement('canvas');
    // 设置实际显示尺寸
    displayCanvas.width = width;
    displayCanvas.height = height;
    
    // 创建高分辨率canvas用于渲染
    const highResCanvas = document.createElement('canvas');
    highResCanvas.width = width * scaleFactor;
    highResCanvas.height = height * scaleFactor;
    const highResCtx = highResCanvas.getContext('2d');
    
    // Enable high-quality image smoothing
    highResCtx.imageSmoothingEnabled = true;
    highResCtx.imageSmoothingQuality = 'high';
    
    // 在临时canvas上绘制原图
    const temp = document.createElement('canvas');
    temp.width = img.width;
    temp.height = img.height;
    const tempCtx = temp.getContext('2d');
    tempCtx.imageSmoothingEnabled = true;
    tempCtx.imageSmoothingQuality = 'high';
    tempCtx.drawImage(img, 0, 0);
    
    // 裁剪到内容区域
    const cropped = cropCanvasToContent(temp);
    
    // 在高分辨率canvas上绘制
    highResCtx.clearRect(0, 0, highResCanvas.width, highResCanvas.height);
    const scale = Math.min(
        (width * scaleFactor) / cropped.width, 
        (height * scaleFactor) / cropped.height
    );
    const drawW = cropped.width * scale;
    const drawH = cropped.height * scale;
    const dx = (highResCanvas.width - drawW) / 2;
    const dy = (highResCanvas.height - drawH) / 2;
    
    // 在高分辨率canvas上绘制
    highResCtx.drawImage(
        cropped, 
        0, 0, cropped.width, cropped.height, 
        dx, dy, drawW, drawH
    );
    
    // 将高分辨率canvas缩放回显示尺寸（使用高质量缩放）
    const displayCtx = displayCanvas.getContext('2d');
    displayCtx.imageSmoothingEnabled = true;
    displayCtx.imageSmoothingQuality = 'high';
    displayCtx.clearRect(0, 0, width, height);
    displayCtx.drawImage(highResCanvas, 0, 0, width, height);
    
    return displayCanvas;
}

function createFishObject({
    fishCanvas,
    x,
    y,
    direction = 1,
    phase = 0,
    amplitude = 24,
    speed = 2,
    vx = 0,
    vy = 0,
    width = 80,
    height = 48,
    artist = 'Anonymous',
    createdAt = null,
    docId = null,
    peduncle = .4,
    upvotes = 0,
    userId = null,
    imageUrl = null, // 添加原始图片 URL
    // Community Chat System properties
    id = null,
    fishName = null,
    personality = null,
    // Legacy battle properties
    health = 100,
    level = 1,
    experience = 0,
    attack = 10,
    defense = 5
}) {
    return {
        fishCanvas,
        x,
        y,
        direction,
        phase,
        amplitude,
        speed,
        vx,
        vy,
        width,
        height,
        artist,
        createdAt,
        docId,
        peduncle,
        upvotes,
        userId,
        imageUrl, // 保存原始图片 URL
        // Community Chat System properties
        id,
        fishName,
        personality,
        // Legacy battle properties
        health,
        level,
        experience,
        attack,
        defense
    };
}

function loadFishImageToTank(imgUrl, fishData, onDone) {
    console.log(`[TRACE] loadFishImageToTank called for ${imgUrl.substring(0, 50)}...`);
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    
    img.onerror = function() {
        console.error(`Failed to load fish image: ${imgUrl}`);
        if (onDone) onDone();
    };
    
    img.onload = function () {
        console.log(`[TRACE] img.onload fired for ${imgUrl.substring(0, 50)}...`);
        // Check for duplicate fish before loading
        const fishId = fishData.docId || fishData.id;
        if (fishId) {
            // Check if this fish already exists in the tank
            const existingFish = fishes.find(f => {
                if (f.isDying) return false;
                const existingId = f.docId || f.id;
                return existingId === fishId;
            });
            
            if (existingFish) {
                console.log(`🐠 Skipping duplicate fish (ID: ${fishId}) - already in tank`);
                if (onDone) onDone(existingFish);
                return;
            }
        }
        
        // Calculate dynamic size based on current tank and fish count
        const fishSize = calculateFishSize();
        const displayCanvas = makeDisplayFishCanvas(img, fishSize.width, fishSize.height);
        if (displayCanvas && displayCanvas.width && displayCanvas.height) {
            // 🔧 关键修复：使用逻辑尺寸而非实际像素尺寸
            const logicalWidth = swimCanvas.logicalWidth || swimCanvas.width;
            const logicalHeight = swimCanvas.logicalHeight || swimCanvas.height;
            const maxX = Math.max(0, logicalWidth - fishSize.width);
            const maxY = Math.max(0, logicalHeight - fishSize.height);
            
            // 🔧 大幅增加X坐标的随机性和变化
            // 使用多种随机策略组合，避免鱼的起始位置看起来一样
            const xRandomStrategy = Math.random();
            const xJitter = (Math.random() - 0.5) * 50; // 额外的±25像素抖动
            let x;
            
            if (xRandomStrategy < 0.2) {
                // 20%概率：靠近左边缘
                x = Math.floor(Math.random() * Math.min(100, maxX * 0.15)) + xJitter;
            } else if (xRandomStrategy < 0.4) {
                // 20%概率：左侧1/4到中间
                x = Math.floor(maxX * 0.15 + Math.random() * (maxX * 0.35)) + xJitter;
            } else if (xRandomStrategy < 0.6) {
                // 20%概率：中间区域
                x = Math.floor(maxX * 0.35 + Math.random() * (maxX * 0.3)) + xJitter;
            } else if (xRandomStrategy < 0.8) {
                // 20%概率：中间到右侧3/4
                x = Math.floor(maxX * 0.5 + Math.random() * (maxX * 0.35)) + xJitter;
            } else {
                // 20%概率：靠近右边缘
                x = Math.floor(maxX * 0.85 + Math.random() * (maxX * 0.15)) + xJitter;
            }
            
            // 确保X坐标在有效范围内
            x = Math.max(0, Math.min(maxX, x));
            
            // 🔧 改进：使用轮询算法均匀分配鱼到各行，而不是完全随机
            // 这样可以避免鱼扎堆在某些行
            let y, targetRowIndex;
            if (window.tankLayoutManager && window.tankLayoutManager.rows && window.tankLayoutManager.rows.length > 0) {
                const rows = window.tankLayoutManager.rows;
                targetRowIndex = nextFishRowIndex % rows.length;
                const targetRow = rows[targetRowIndex];
                
                // 🔧 确保Y坐标在行的范围内，避免超出边界
                const rowHeight = Math.max(1, targetRow.swimYMax - targetRow.swimYMin);
                const yOffset = Math.random() * rowHeight;
                // 不要使用 maxY 限制，因为行的范围本身已经是合理的
                y = targetRow.swimYMin + yOffset;
                // 只在必要时进行边界检查（防止超出画布）
                if (y + fishSize.height > logicalHeight) {
                    y = Math.max(0, logicalHeight - fishSize.height);
                    console.warn(`⚠️ Fish Y adjusted to fit in canvas: ${Math.floor(y)}`);
                }
                
                console.log(`🐠 Fish #${nextFishRowIndex} assigned to row ${targetRowIndex}/${rows.length}, Y: ${Math.floor(y)} (range: ${Math.floor(targetRow.swimYMin)}-${Math.floor(targetRow.swimYMax)})`);
                nextFishRowIndex++;
            } else {
                // 备用方案：如果layout manager不可用，使用旧的随机方式
                console.warn('⚠️ Layout manager not available, using random Y positioning');
                y = Math.floor(Math.random() * maxY);
                targetRowIndex = null;
            }
            
            const direction = Math.random() < 0.5 ? -1 : 1;
            const speed = fishData.speed || 2;
            const fishObj = createFishObject({
                fishCanvas: displayCanvas,
                x,
                y,
                direction: direction,
                phase: fishData.phase || 0,
                amplitude: fishData.amplitude || 24, // 🔧 修复：与createFishObject默认值保持一致
                speed: speed,
                vx: speed * direction * 0.1, // Initialize with base velocity
                vy: (Math.random() - 0.5) * 0.5, // Small random vertical velocity
                artist: fishData.artist || fishData.Artist || 'Anonymous',
                createdAt: fishData.createdAt || fishData.CreatedAt || null,
                docId: fishData.docId || null,
                peduncle: fishData.peduncle || .4,
                width: fishSize.width,
                height: fishSize.height,
                upvotes: fishData.upvotes || 0,
                userId: fishData.userId || fishData.UserId || fishData.user_id || null,
                imageUrl: imgUrl, // 保存原始图片 URL
                // Community Chat System properties
                id: fishData.id || fishData.docId || null,
                fishName: fishData.fish_name || null,
                personality: fishData.personality || null,
                // Legacy battle properties (kept for compatibility)
                health: fishData.health !== undefined ? fishData.health : 100,
                level: fishData.level || 1,
                experience: fishData.experience || 0,
                attack: fishData.attack || 10,
                defense: fishData.defense || 5
            });
            
            // 🔧 如果已经分配了行号，标记一下以便assignFishToRows知道
            if (targetRowIndex !== null && window.tankLayoutManager) {
                fishObj.preassignedRowIndex = targetRowIndex;
                const row = window.tankLayoutManager.rows[targetRowIndex];
                if (row) {
                    fishObj.yMin = row.swimYMin;
                    fishObj.yMax = row.swimYMax;
                }
            }
            
            // 🌟 新鱼特效标记
            if (fishData.isNewlyCreated) {
                fishObj.isNewlyCreated = true;
                fishObj.createdDisplayTime = Date.now();
                console.log(`✨ Fish marked as newly created with special glow effect`);
            }

            // Add entrance animation for new fish
            if (fishData.docId && fishes.length >= maxTankCapacity - 1) {
                fishObj.isEntering = true;
                fishObj.enterStartTime = Date.now();
                fishObj.enterDuration = 1000; // 1 second entrance
                fishObj.opacity = 0;
                fishObj.scale = 0.3;
            }

            fishes.push(fishObj);
            
            console.log(`[DEBUG v2] Fish #${fishes.length} added, checking layout manager...`, {
                hasLayoutManager: !!window.tankLayoutManager,
                hasRows: !!(window.tankLayoutManager && window.tankLayoutManager.rows),
                rowCount: window.tankLayoutManager ? window.tankLayoutManager.rows.length : 0
            });
            
            // 🔧 添加到fishes数组后，立即分配行号
            // 优先使用预分配的行号，否则使用负载均衡算法
            if (window.tankLayoutManager && window.tankLayoutManager.rows && window.tankLayoutManager.rows.length > 0) {
                const rows = window.tankLayoutManager.rows;
                let targetRowIndex;
                
                if (fishObj.preassignedRowIndex !== undefined && fishObj.preassignedRowIndex >= 0 && fishObj.preassignedRowIndex < rows.length) {
                    // 使用预分配的行号
                    targetRowIndex = fishObj.preassignedRowIndex;
                    console.log(`🐠 Fish #${fishes.length} using preassigned row ${targetRowIndex}`);
                } else {
                    // 使用负载均衡算法：找到当前鱼数最少的行
                    const rowCounts = new Array(rows.length).fill(0);
                    fishes.forEach(f => {
                        if (f.rowIndex !== undefined && f.rowIndex >= 0 && f.rowIndex < rows.length) {
                            rowCounts[f.rowIndex]++;
                        }
                    });
                    
                    const minCount = Math.min(...rowCounts);
                    const availableRows = rowCounts
                        .map((count, idx) => count === minCount ? idx : -1)
                        .filter(idx => idx >= 0);
                    targetRowIndex = availableRows[Math.floor(Math.random() * availableRows.length)];
                    
                    console.log(`🐠 Fish #${fishes.length} assigned to row ${targetRowIndex} (counts: [${rowCounts.join(',')}])`);
                }
                
                fishObj.rowIndex = targetRowIndex;
                const targetRow = rows[targetRowIndex];
                fishObj.yMin = targetRow.swimYMin;
                fishObj.yMax = targetRow.swimYMax;
                
                // 确保Y坐标在行范围内
                if (fishObj.y < targetRow.swimYMin || fishObj.y > targetRow.swimYMax) {
                    const oldY = fishObj.y;
                    fishObj.y = targetRow.swimYMin + Math.random() * (targetRow.swimYMax - targetRow.swimYMin);
                    console.log(`  └─ Y adjusted: ${Math.floor(oldY)} → ${Math.floor(fishObj.y)} (row range: ${Math.floor(targetRow.swimYMin)}-${Math.floor(targetRow.swimYMax)})`);
                }
                
                delete fishObj.preassignedRowIndex; // 清除临时标记
            } else {
                console.warn(`⚠️ Cannot assign row for fish #${fishes.length}: layout manager not ready`);
            }

            if (onDone) onDone(fishObj);
        } else {
            console.warn('Fish image did not load or is blank:', imgUrl);
        }
    };
    img.src = imgUrl;
}

// Using shared utility function from fish-utils.js

// Global variable to track the newest fish timestamp and listener
let newestFishTimestamp = null;
let newFishListener = null;
let maxTankCapacity = 20; // Dynamic tank capacity controlled by slider
let isUpdatingCapacity = false; // Prevent multiple simultaneous updates
let nextFishRowIndex = 0; // Track which row to assign next fish to for even distribution
let isLoadingFish = false; // Prevent multiple simultaneous fish loads

// Update page title based on view mode and sort type
function updatePageTitle(sortType) {
    if (VIEW_MODE === 'my') {
        document.title = 'My Private Fish Tank | FishTalk.app';
    } else {
        const titles = {
            'recent': `Fish Tank - ${maxTankCapacity} Most Recent`,
            'popular': `Fish Tank - ${maxTankCapacity} Most Popular`,
            'random': `Fish Tank - ${maxTankCapacity} Random Fish`
        };
        document.title = titles[sortType] || 'Fish Tank';
    }
}

// Debounce function to prevent rapid-fire calls
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Update current fish count display
function updateCurrentFishCount() {
    const currentCountElement = document.getElementById('current-fish-count');
    if (currentCountElement) {
        const aliveFishCount = fishes.filter(f => !f.isDying).length;
        const dyingFishCount = fishes.filter(f => f.isDying).length;
        if (dyingFishCount > 0) {
            currentCountElement.textContent = `(${aliveFishCount} swimming, ${dyingFishCount} leaving)`;
        } else {
            currentCountElement.textContent = `(${aliveFishCount} swimming)`;
        }
    }
}

// Handle tank capacity changes
async function updateTankCapacity(newCapacity) {
    // Prevent multiple simultaneous updates
    if (isUpdatingCapacity) {
        return;
    }

    isUpdatingCapacity = true;

    // Show loading indicator
    const loadingIndicator = document.getElementById('loading-indicator');
    if (loadingIndicator) {
        loadingIndicator.style.display = 'block';
        loadingIndicator.textContent = 'updating tank...';
    }

    const oldCapacity = maxTankCapacity;
    maxTankCapacity = newCapacity;
    
    console.log(`🔧 updateTankCapacity: ${oldCapacity} -> ${newCapacity}, maxTankCapacity is now ${maxTankCapacity}`);

    // Update the display
    const displayElement = document.getElementById('fish-count-display');
    if (displayElement) {
        displayElement.textContent = newCapacity;
    }
    
    // 🔧 同步更新下拉选择器的值
    const fishCountSelector = document.getElementById('fish-count-selector-sidebar');
    if (fishCountSelector) {
        fishCountSelector.value = newCapacity.toString();
        console.log(`🔧 Updated fish count selector to: ${newCapacity}`);
    }

    // Update current fish count display
    updateCurrentFishCount();

    // Update page title
    const sortSelect = document.getElementById('tank-sort') || document.getElementById('tank-sort-sidebar');
    if (sortSelect) {
        updatePageTitle(sortSelect.value);
    } else {
        // Fallback to URL parameter or default
        const sortParam = tankUrlParams.get('sort') || 'recent';
        updatePageTitle(sortParam);
    }

    // Update URL parameter
    const newUrl = new URL(window.location);
    newUrl.searchParams.set('capacity', newCapacity);
    window.history.replaceState({}, '', newUrl);

    // If capacity decreased, remove excess fish with death animation
    if (newCapacity < fishes.length) {
        const currentFishCount = fishes.filter(f => !f.isDying).length;
        const excessCount = Math.max(0, currentFishCount - newCapacity);

        // Get references to fish that are not already dying, sorted by creation date (oldest first)
        const aliveFish = fishes.filter(f => !f.isDying).sort((a, b) => {
            const dateA = a.createdAt;
            const dateB = b.createdAt;
            if (!dateA && !dateB) return 0;
            if (!dateA) return -1; // Fish without creation date go first
            if (!dateB) return 1;
            
            // Handle both Date objects and string timestamps
            const timeA = dateA instanceof Date ? dateA.getTime() : new Date(dateA).getTime();
            const timeB = dateB instanceof Date ? dateB.getTime() : new Date(dateB).getTime();
            
            return timeA - timeB; // Oldest first
        });

        // Remove the oldest fish first
        const fishToRemove = aliveFish.slice(0, excessCount);

        // Stagger the death animations to avoid overwhelming the system
        fishToRemove.forEach((fishObj, i) => {
            setTimeout(() => {
                // Find the current index of this fish object
                const currentIndex = fishes.indexOf(fishObj);
                if (currentIndex !== -1 && !fishObj.isDying) {
                    animateFishDeath(currentIndex);
                }
            }, i * 200); // 200ms delay between each death
        });
    }
    // If capacity increased, try to add more fish (if available from current sort)
    else if (newCapacity > fishes.length && newCapacity > oldCapacity) {
        if (VIEW_MODE === 'my') {
            // 私人鱼缸模式：重新加载鱼缸
            console.log('🔄 Private tank capacity increased, reloading fish...');
            await loadPrivateFish();
        } else {
            // 全局鱼缸模式：加载额外的鱼
            const sortSelect = document.getElementById('tank-sort') || document.getElementById('tank-sort-sidebar');
            const currentSort = sortSelect ? sortSelect.value : 'recent';
            const neededCount = newCapacity - fishes.length;

            // Load additional fish
            await loadAdditionalFish(currentSort, neededCount);
        }
    }

    // Hide loading indicator
    if (loadingIndicator) {
        loadingIndicator.style.display = 'none';
    }

    isUpdatingCapacity = false;
}

// Export to window for external access
window.updateTankCapacity = updateTankCapacity;
window.dropFoodPellet = dropFoodPellet;

// Load additional fish when capacity is increased
async function loadAdditionalFish(sortType, count) {
    try {
        // Get existing fish IDs to prevent duplicates
        const existingIds = new Set(fishes.map(f => f.docId).filter(id => id));

        // Get additional fish, accounting for potential duplicates
        const additionalFishDocs = await getFishBySort(sortType, count * 2); // Get more to account for duplicates

        let addedCount = 0;

        for (const doc of additionalFishDocs) {
            // Stop if we've reached the capacity or added enough fish
            if (fishes.length >= maxTankCapacity || addedCount >= count) {
                break;
            }

            // Handle different possible backend API formats
            let data, fishId;

            if (typeof doc.data === 'function') {
                // Firestore-style document with data() function
                data = doc.data();
                fishId = doc.id;
            } else if (doc.data && typeof doc.data === 'object') {
                // Backend returns {id: '...', data: {...}}
                data = doc.data;
                fishId = doc.id;
            } else if (doc.id && (doc.image || doc.Image)) {
                // Backend returns fish data directly as properties
                data = doc;
                fishId = doc.id;
            } else {
                // Unknown format, skip
                continue;
            }

            // Skip if data is still undefined or null
            if (!data) {
                continue;
            }

            const imageUrl = data.image || data.Image; // Try lowercase first, then uppercase

            // Skip if invalid image or already exists
            if (!imageUrl || typeof imageUrl !== 'string' || !imageUrl.startsWith('http')) {
                continue;
            }

            if (existingIds.has(fishId)) {
                continue;
            }

            // 🔧 修复：为loadAdditionalFish也预设游动参数默认值
            const normalizedAdditionalFishData = {
                ...data,
                docId: fishId,
                speed: data.speed || 2,
                phase: data.phase || 0,
                amplitude: data.amplitude || 24,
                peduncle: data.peduncle || 0.4
            };

            loadFishImageToTank(imageUrl, normalizedAdditionalFishData);

            addedCount++;
        }
    } catch (error) {
        console.error('Error loading additional fish:', error);
    }
}

// Animate a fish death (turn upside down, fade, and fall)
function animateFishDeath(fishIndex, onComplete) {
    if (fishIndex < 0 || fishIndex >= fishes.length) {
        if (onComplete) onComplete();
        return;
    }

    const dyingFish = fishes[fishIndex];
    const deathDuration = 2000; // 2 seconds
    const startTime = Date.now();

    // Store original values
    const originalDirection = dyingFish.direction;
    const originalY = dyingFish.y;
    const originalOpacity = 1;

    // Death animation properties
    dyingFish.isDying = true;
    dyingFish.deathStartTime = startTime;
    dyingFish.deathDuration = deathDuration;
    dyingFish.originalY = originalY;
    dyingFish.opacity = originalOpacity;

    // Set fish upside down
    dyingFish.direction = -Math.abs(dyingFish.direction); // Ensure it's negative (upside down)

    // Animation will be handled in the main animation loop
    // After the animation completes, remove the fish
    setTimeout(() => {
        const index = fishes.indexOf(dyingFish);
        if (index !== -1) {
            fishes.splice(index, 1);
        }
        if (onComplete) onComplete();
    }, deathDuration);
}

// Show a subtle notification when new fish arrive
function showNewFishNotification(artistName) {
    // Check if notifications are enabled
    const notificationsToggle = document.getElementById('notifications-toggle');
    if (!notificationsToggle || !notificationsToggle.checked) {
        return;
    }

    // Create retro notification element
    const notification = document.createElement('div');
    notification.textContent = `New fish from ${artistName}!`;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        color: #000000;
        background: #c0c0c0;
        border: 2px outset #808080;
        padding: 4px 8px;
        font-size: 11px;
        font-family: "MS Sans Serif", sans-serif;
        font-weight: bold;
        z-index: 1000;
        pointer-events: none;
    `;

    document.body.appendChild(notification);

    // Remove after 3 seconds (no animation)
    setTimeout(() => {
        if (document.body.contains(notification)) {
            document.body.removeChild(notification);
        }
    }, 3000);
}

/**
 * 通过ID加载单条鱼的数据
 * @param {string} fishId - 鱼的ID
 * @returns {Object|null} 鱼数据对象，如果未找到则返回null
 */
async function loadSingleFish(fishId) {
    if (!fishId) {
        console.warn('loadSingleFish: fishId is required');
        return null;
    }

    try {
        console.log(`🐠 [NEW FISH] Attempting to load fish with ID: ${fishId}`);
        
        // 添加重试机制，因为新创建的鱼可能需要一点时间才能在数据库中可用
        let fishData = null;
        let retryCount = 0;
        const maxRetries = 3;
        
        while (!fishData && retryCount < maxRetries) {
            if (retryCount > 0) {
                console.log(`🔄 [NEW FISH] Retry ${retryCount}/${maxRetries} for fish ${fishId}...`);
                await new Promise(resolve => setTimeout(resolve, 500)); // 等待500ms
            }
            
            fishData = await getFishById(fishId);
            retryCount++;
        }
        
        if (!fishData) {
            console.warn(`⚠️ [NEW FISH] Fish with ID ${fishId} not found after ${maxRetries} retries`);
            console.warn(`⚠️ [NEW FISH] Possible reasons: 1) Fish not yet in DB 2) Fish not approved 3) Network error`);
            return null;
        }

        console.log(`✅ [NEW FISH] Successfully loaded: "${fishData.fish_name || 'Unnamed'}" (ID: ${fishId})`);
        console.log(`✅ [NEW FISH] Image URL: ${fishData.image_url}`);
        return fishData;
    } catch (error) {
        console.error('❌ [NEW FISH] Error loading single fish:', error);
        return null;
    }
}

// Load initial fish into tank based on sort type
async function loadInitialFish(sortType = 'recent') {
    // 🔧 防止重复加载
    if (isLoadingFish) {
        console.log('⚠️ Already loading fish, skipping duplicate call');
        return;
    }
    
    isLoadingFish = true;
    console.log(`🔄 Starting loadInitialFish with sortType: ${sortType}, capacity: ${maxTankCapacity}`);
    
    // Show loading indicator
    const loadingIndicator = document.getElementById('loading-indicator');
    if (loadingIndicator) {
        loadingIndicator.style.display = 'block';
    }

    // Clear existing fish
    fishes.length = 0;
    
    // 🔧 重置行分配计数器，确保每次加载都能均匀分配
    nextFishRowIndex = 0;

    try {
        // 🆕 检查是否有新鱼ID（用户刚画的鱼）
        const urlParams = new URLSearchParams(window.location.search);
        const newFishId = urlParams.get('newFish');
        
        // 🔍 详细的URL调试信息
        console.log(`🔍 [URL DEBUG] Current URL: ${window.location.href}`);
        console.log(`🔍 [URL DEBUG] Search params: ${window.location.search}`);
        console.log(`🔍 [URL DEBUG] newFish parameter: ${newFishId}`);
        console.log(`🔍 [URL DEBUG] All URL params:`, Object.fromEntries(urlParams.entries()));
        
        let newFishData = null;
        
        if (newFishId) {
            console.log(`🌟 Detected newly created fish: ${newFishId}`);
            newFishData = await loadSingleFish(newFishId);
            
            if (newFishData) {
                console.log(`✨ Successfully loaded new fish, will add special effect`);
                // 标记为新创建的鱼，用于特效显示
                newFishData.isNewlyCreated = true;
                newFishData.docId = newFishId;
            } else {
                console.warn(`⚠️ Could not load new fish ${newFishId}, will load normally`);
            }
        }
        
        // 计算需要加载的鱼数量（如果有新鱼，则少加载一条）
        const fishToLoad = newFishData ? maxTankCapacity - 1 : maxTankCapacity;
        const loadAmount = Math.ceil(fishToLoad * 1.5); // 加载1.5倍的数量
        
        console.log(`🐠 [loadInitialFish] maxTankCapacity: ${maxTankCapacity}, fishToLoad: ${fishToLoad}, loadAmount: ${loadAmount}`);
        console.log(`🐠 Loading ${loadAmount} fish (target: ${fishToLoad}${newFishData ? ' + 1 new fish' : ''}) with sort type: ${sortType}`);
        
        // IMPORTANT: In global tank mode, do NOT pass userId to getFishBySort
        // This ensures we get fish from ALL users, not just the current user
        const allFishDocs = await getFishBySort(sortType, loadAmount, null, 'desc', null);
        console.log(`🐠 Received ${allFishDocs ? allFishDocs.length : 0} fish documents`);
        
        // 🆕 如果有新鱼，从加载的鱼中排除它（避免重复）
        let filteredAllFishDocs = allFishDocs;
        if (newFishData && allFishDocs) {
            filteredAllFishDocs = allFishDocs.filter(doc => {
                const docId = doc.id || doc.docId;
                return docId !== newFishId;
            });
            console.log(`🐠 Filtered out new fish from loaded docs: ${allFishDocs.length} -> ${filteredAllFishDocs.length}`);
        }
        
        // Debug: Check if we got fish from multiple users
        if (filteredAllFishDocs && filteredAllFishDocs.length > 0) {
            const userIds = new Set();
            filteredAllFishDocs.forEach(doc => {
                let data;
                if (typeof doc.data === 'function') {
                    data = doc.data();
                } else if (doc.data && typeof doc.data === 'object') {
                    data = doc.data;
                } else {
                    data = doc;
                }
                const fishUserId = data.user_id || data.UserId || data.userId || data.owner_id || data.ownerId;
                if (fishUserId) {
                    userIds.add(fishUserId);
                }
            });
            console.log(`🐠 [Global Tank] Loaded fish from ${userIds.size} different users:`, Array.from(userIds).slice(0, 5));
        }

        // Get current user ID to filter user's own fish
        let currentUserId = null;
        try {
            if (typeof getCurrentUserId === 'function') {
                currentUserId = await getCurrentUserId();
            }
        } catch (error) {
            console.warn('Failed to get current user ID:', error);
        }

        // New filtering logic: Limit user's own fish while ensuring enough total fish
        let filteredFishDocs = filteredAllFishDocs;
        if (currentUserId) {
            const userFishDocs = [];
            const otherFishDocs = [];

            // Debug: Log all fish user IDs to help diagnose the issue
            const allFishUserIds = new Set();
            
            filteredAllFishDocs.forEach(doc => {
                // Handle different possible backend API formats
                let data;
                if (typeof doc.data === 'function') {
                    data = doc.data();
                } else if (doc.data && typeof doc.data === 'object') {
                    data = doc.data;
                } else if (doc.id && (doc.image || doc.Image)) {
                    data = doc;
                } else {
                    otherFishDocs.push(doc);
                    return;
                }

                // Check if this fish belongs to the current user
                const fishUserId = data.user_id || data.UserId || data.userId || data.owner_id || data.ownerId;
                
                // Debug: Track all unique user IDs
                if (fishUserId) {
                    allFishUserIds.add(fishUserId);
                }
                
                if (fishUserId === currentUserId) {
                    userFishDocs.push(doc);
                } else {
                    otherFishDocs.push(doc);
                }
            });
            
            // Debug: Log statistics
            const stats = {
                totalFish: filteredAllFishDocs.length,
                currentUserId: currentUserId,
                userFishCount: userFishDocs.length,
                otherFishCount: otherFishDocs.length,
                uniqueUserIds: Array.from(allFishUserIds),
                uniqueUserCount: allFishUserIds.size
            };
            console.log(`🐠 [Global Tank] Fish filtering stats:`, stats);
            
            // Warn if we only got fish from very few users (might indicate a backend issue)
            if (stats.uniqueUserCount < 3 && stats.totalFish >= 10) {
                console.warn(`⚠️ [Global Tank] WARNING: Only ${stats.uniqueUserCount} users in ${stats.totalFish} fish. This might indicate a backend query issue. Expected more diverse users.`);
            }

            // New logic: Dynamically determine how many user fish to keep
            // Priority 1: Ensure we have enough total fish (target: maxTankCapacity)
            // Priority 2: Limit user's own fish to a reasonable number
            const maxUserFishAllowed = Math.max(3, Math.floor(maxTankCapacity * 0.2)); // 最多保留20%或3条，取较大值
            
            let userFishToKeep = [];
            if (userFishDocs.length > 0) {
                // Sort user's fish by creation date (newest first)
                userFishDocs.sort((a, b) => {
                    let aData, bData;
                    if (typeof a.data === 'function') {
                        aData = a.data();
                    } else if (a.data && typeof a.data === 'object') {
                        aData = a.data;
                    } else {
                        aData = a;
                    }

                    if (typeof b.data === 'function') {
                        bData = b.data();
                    } else if (b.data && typeof b.data === 'object') {
                        bData = b.data;
                    } else {
                        bData = b;
                    }

                    const aDate = aData.CreatedAt || aData.createdAt;
                    const bDate = bData.CreatedAt || bData.createdAt;

                    if (!aDate && !bDate) return 0;
                    if (!aDate) return 1;
                    if (!bDate) return -1;

                    const aTime = aDate instanceof Date ? aDate.getTime() : new Date(aDate).getTime();
                    const bTime = bDate instanceof Date ? bDate.getTime() : new Date(bDate).getTime();

                    return bTime - aTime; // Newest first
                });

                // 新逻辑：根据其他用户的鱼数量动态决定保留多少用户自己的鱼
                // 如果其他用户的鱼足够多，限制用户自己的鱼；如果不够，允许更多用户自己的鱼
                const availableOtherFish = otherFishDocs.length;
                
                if (availableOtherFish >= maxTankCapacity) {
                    // 其他用户的鱼已经足够，严格限制用户自己的鱼
                    userFishToKeep = userFishDocs.slice(0, Math.min(maxUserFishAllowed, userFishDocs.length));
                    console.log(`🐠 Enough other fish (${availableOtherFish}), limiting user fish to ${userFishToKeep.length}`);
                } else {
                    // 其他用户的鱼不够，需要用户自己的鱼来填充
                    const neededUserFish = Math.min(
                        maxTankCapacity - availableOtherFish,
                        userFishDocs.length
                    );
                    userFishToKeep = userFishDocs.slice(0, neededUserFish);
                    console.log(`🐠 Need more fish to reach ${maxTankCapacity}, keeping ${userFishToKeep.length} user fish (have ${availableOtherFish} other fish)`);
                }
            }
            
            // Combine filtered fish: other users' fish + limited user fish
            filteredFishDocs = [...otherFishDocs, ...userFishToKeep];
            
            // Take only the required amount
            if (filteredFishDocs.length > maxTankCapacity) {
                filteredFishDocs = filteredFishDocs.slice(0, maxTankCapacity);
            }
            
            console.log(`🐠 Final filtered: ${filteredFishDocs.length} fish (${userFishToKeep.length} from user, ${Math.min(otherFishDocs.length, maxTankCapacity - userFishToKeep.length)} from others)`);
        } else {
            // No user ID, just take the required amount
            if (filteredFishDocs.length > maxTankCapacity) {
                filteredFishDocs = filteredFishDocs.slice(0, maxTankCapacity);
            }
        }

        // Track the newest timestamp for the listener
        if (filteredFishDocs.length > 0) {
            const sortedByDate = filteredFishDocs.filter(doc => {
                // Handle different possible backend API formats for filtering
                let data;
                if (typeof doc.data === 'function') {
                    data = doc.data();
                } else if (doc.data && typeof doc.data === 'object') {
                    data = doc.data;
                } else if (doc.id && (doc.image || doc.Image)) {
                    data = doc;
                } else {
                    return false;
                }
                return data && (data.CreatedAt || data.createdAt);
            }).sort((a, b) => {
                // Handle backend response format - fish data may need extraction
                let aData, bData;
                if (typeof a.data === 'function') {
                    aData = a.data();
                } else if (a.data && typeof a.data === 'object') {
                    aData = a.data;
                } else {
                    aData = a;
                }

                if (typeof b.data === 'function') {
                    bData = b.data();
                } else if (b.data && typeof b.data === 'object') {
                    bData = b.data;
                } else {
                    bData = b;
                }

                const aDate = aData.CreatedAt || aData.createdAt;
                const bDate = bData.CreatedAt || bData.createdAt;

                // Handle both Date objects and ISO strings
                const aTime = aDate instanceof Date ? aDate.getTime() : new Date(aDate).getTime();
                const bTime = bDate instanceof Date ? bDate.getTime() : new Date(bDate).getTime();

                return bTime - aTime;
            });

            if (sortedByDate.length > 0) {
                const newestFish = sortedByDate[0];
                let newestData;
                if (typeof newestFish.data === 'function') {
                    newestData = newestFish.data();
                } else if (newestFish.data && typeof newestFish.data === 'object') {
                    newestData = newestFish.data;
                } else {
                    newestData = newestFish;
                }
                newestFishTimestamp = newestData.CreatedAt || newestData.createdAt;
            }
        }

        // Remove duplicates from filteredFishDocs before loading
        const uniqueFishDocs = [];
        const seenFishIds = new Set();
        
        filteredFishDocs.forEach((doc) => {
            // Handle different possible backend API formats
            let data, fishId;

            if (typeof doc.data === 'function') {
                // Firestore-style document with data() function
                data = doc.data();
                fishId = doc.id;
            } else if (doc.data && typeof doc.data === 'object') {
                // Backend returns {id: '...', data: {...}}
                data = doc.data;
                fishId = doc.id;
            } else if (doc.id && (doc.image || doc.Image)) {
                // Backend returns fish data directly as properties
                data = doc;
                fishId = doc.id;
            } else {
                // Unknown format
                console.warn('Skipping fish with unknown format:', doc);
                return;
            }

            // Skip if data is still undefined or null
            if (!data) {
                console.warn('Skipping fish with no data after extraction:', fishId, doc);
                return;
            }

            // Check for duplicate fish IDs
            if (fishId && seenFishIds.has(fishId)) {
                console.log(`🐠 Skipping duplicate fish from API (ID: ${fishId})`);
                return;
            }
            
            if (fishId) {
                seenFishIds.add(fishId);
            }
            
            uniqueFishDocs.push(doc);
        });
        
        console.log(`🐠 Filtered ${filteredFishDocs.length} fish docs to ${uniqueFishDocs.length} unique fish`);

        uniqueFishDocs.forEach((doc, index) => {
            // Handle different possible backend API formats
            let data, fishId;

            if (typeof doc.data === 'function') {
                // Firestore-style document with data() function
                data = doc.data();
                fishId = doc.id;
            } else if (doc.data && typeof doc.data === 'object') {
                // Backend returns {id: '...', data: {...}}
                data = doc.data;
                fishId = doc.id;
            } else if (doc.id && (doc.image || doc.Image)) {
                // Backend returns fish data directly as properties
                data = doc;
                fishId = doc.id;
            } else {
                // Unknown format
                console.warn('Skipping fish with unknown format:', doc);
                return;
            }

            // Skip if data is still undefined or null
            if (!data) {
                console.warn('Skipping fish with no data after extraction:', fishId, doc);
                return;
            }

            // Try multiple possible field names for image URL (support different API formats)
            const imageUrl = data.image || data.Image || data.image_url || data.imageUrl;
            
            if (!imageUrl || typeof imageUrl !== 'string' || !imageUrl.startsWith('http')) {
                console.warn('Skipping fish with invalid image:', fishId, data);
                return;
            }
            
            // 🔧 修复：为全局鱼缸也预设游动参数默认值，确保与私人鱼缸一致
            const normalizedGlobalFishData = {
                ...data,
                docId: fishId,
                // 确保游动参数与私人鱼缸完全一致
                speed: data.speed || 2,
                phase: data.phase || 0,
                amplitude: data.amplitude || 24,  // 与私人鱼缸相同的默认值
                peduncle: data.peduncle || 0.4
            };
            
            loadFishImageToTank(imageUrl, normalizedGlobalFishData);
        });
        
        // 🆕 最后加载新鱼（如果有），确保它在鱼缸中
        if (newFishData) {
            console.log(`🌟 [NEW FISH] Loading newly created fish with special effect`);
            console.log(`🌟 [NEW FISH] Fish data:`, {
                id: newFishData.id || newFishData.docId,
                name: newFishData.fish_name,
                artist: newFishData.artist,
                image_url: newFishData.image_url,
                is_approved: newFishData.is_approved
            });
            
            const imageUrl = newFishData.image_url || newFishData.Image || newFishData.image || newFishData.imageUrl;
            
            console.log(`🌟 [NEW FISH] Image URL: ${imageUrl}`);
            
            if (imageUrl && typeof imageUrl === 'string' && imageUrl.startsWith('http')) {
                // 标准化新鱼数据
                const normalizedNewFishData = {
                    ...newFishData,
                    speed: newFishData.speed || 2,
                    phase: newFishData.phase || 0,
                    amplitude: newFishData.amplitude || 24,
                    peduncle: newFishData.peduncle || 0.4,
                    isNewlyCreated: true  // 保持标记
                };
                
                console.log(`🌟 [NEW FISH] Calling loadFishImageToTank...`);
                loadFishImageToTank(imageUrl, normalizedNewFishData, (fishObj) => {
                    if (fishObj) {
                        console.log(`✨ [NEW FISH] Successfully added to tank! Fish object:`, {
                            id: fishObj.id,
                            docId: fishObj.docId,
                            isNewlyCreated: fishObj.isNewlyCreated,
                            createdDisplayTime: fishObj.createdDisplayTime
                        });
                    } else {
                        console.error(`❌ [NEW FISH] Failed to create fish object`);
                    }
                });
                console.log(`✨ [NEW FISH] Load request sent`);
            } else {
                console.error(`❌ [NEW FISH] Invalid image URL:`, {
                    imageUrl,
                    type: typeof imageUrl,
                    startsWithHttp: imageUrl ? imageUrl.startsWith('http') : 'N/A',
                    allFields: {
                        image_url: newFishData.image_url,
                        Image: newFishData.Image,
                        image: newFishData.image,
                        imageUrl: newFishData.imageUrl
                    }
                });
            }
        } else {
            console.log(`ℹ️ [NEW FISH] No new fish to load (newFishData is null)`);
        }
    } catch (error) {
        console.error('Error loading initial fish:', error);
    } finally {
        // 🔧 重置加载标志
        isLoadingFish = false;
        
        // Hide loading indicator
        if (loadingIndicator) {
            setTimeout(() => {
                loadingIndicator.style.display = 'none';
            }, 500);
        }
        
        // Assign fish to rows for community chat layout (wait for images to load)
        // Use preserveDistribution=true to maintain even distribution after refresh
        // Clear any existing timeout to prevent multiple calls
        if (window.assignFishToRowsTimeout) {
            clearTimeout(window.assignFishToRowsTimeout);
        }
        if (tankLayoutManager) {
            // 🔧 增加延迟时间，确保所有鱼都异步加载完成
            window.assignFishToRowsTimeout = setTimeout(() => {
                console.log(`🔄 [assignFishToRows] 准备分配 ${fishes.length} 条鱼到 ${tankLayoutManager.rows.length} 行...`);
                tankLayoutManager.assignFishToRows(fishes, true);
                // Log is now handled inside assignFishToRows
            }, 2500); // 从1秒增加到2.5秒，确保所有图片加载完成
        }
        
        // Filter user's fish after loading - keep only the newest one
        // This is a backup filter, main filtering happens in loadFishIntoTank
        setTimeout(async () => {
            await filterUserFishToNewestOnly();
        }, 1500); // Wait 1.5 seconds for all images to load
    }
}

// Filter user's fish to keep only the newest one
// IMPORTANT: This function should ONLY filter the current user's fish, never other users' fish
async function filterUserFishToNewestOnly() {
    try {
        // Only run this filter in global tank mode, not in private tank mode
        // In private tank mode, we want to show all user's fish
        if (VIEW_MODE === 'my') {
            console.log('🐠 Private tank mode - skipping user fish filtering (show all user fish)');
            return;
        }
        
        // Get current user ID from multiple sources
        let currentUserId = null;
        
        // Try getCurrentUserId function first
        if (typeof getCurrentUserId === 'function') {
            try {
                currentUserId = await getCurrentUserId();
            } catch (error) {
                console.warn('getCurrentUserId failed:', error);
            }
        }
        
        // Fallback to localStorage if getCurrentUserId returns null
        if (!currentUserId) {
            const userData = localStorage.getItem('userData');
            if (userData) {
                try {
                    const parsed = JSON.parse(userData);
                    currentUserId = parsed.userId || parsed.uid || parsed.id;
                } catch (error) {
                    console.warn('Failed to parse userData:', error);
                }
            }
            
            // Also try userId directly from localStorage
            if (!currentUserId) {
                currentUserId = localStorage.getItem('userId');
            }
        }
        
        // Also try Supabase auth if available
        if (!currentUserId && window.supabaseAuth) {
            try {
                const user = await window.supabaseAuth.getUser();
                if (user && user.id) {
                    currentUserId = user.id;
                }
            } catch (error) {
                console.warn('Failed to get user from supabaseAuth:', error);
            }
        }
        
        if (!currentUserId) {
            console.log('🐠 No user ID found, skipping user fish filtering');
            return; // User not logged in, no filtering needed
        }
        
        // Debug: Log total fish count before filtering
        const totalFishBefore = fishes.length;
        const otherUsersFishBefore = fishes.filter(f => {
            const fUserId = f.userId || f.user_id || f.UserId || f.owner_id || f.ownerId;
            return fUserId !== currentUserId;
        }).length;
        
        console.log('🐠 Filtering user fish, currentUserId:', currentUserId);
        console.log(`🐠 [Global Tank] Before filtering: ${totalFishBefore} total fish, ${otherUsersFishBefore} from other users`);
        
        // Find all user's fish in the tank (including those that are dying)
        const userFish = fishes.filter(f => {
            const fUserId = f.userId || f.user_id || f.UserId || f.owner_id || f.ownerId;
            return fUserId === currentUserId;
        });
        
        // Filter out already dying fish
        const aliveUserFish = userFish.filter(f => !f.isDying);
        
        // New logic: Apply the same filtering logic as loadInitialFish
        // Priority 1: Ensure we have enough total fish
        // Priority 2: Limit user's own fish to a reasonable number
        if (aliveUserFish.length > 0) {
            // Count other users' fish
            const otherUsersFish = fishes.filter(f => {
                const fUserId = f.userId || f.user_id || f.UserId || f.owner_id || f.ownerId;
                return fUserId !== currentUserId && !f.isDying;
            });
            
            // Dynamically determine how many user fish to keep
            const maxUserFishAllowed = Math.max(3, Math.floor(maxTankCapacity * 0.2)); // 最多保留20%或3条
            const availableOtherFish = otherUsersFish.length;
            
            let targetUserFishCount;
            if (availableOtherFish >= maxTankCapacity) {
                // 其他用户的鱼已经足够，严格限制用户自己的鱼
                targetUserFishCount = Math.min(maxUserFishAllowed, aliveUserFish.length);
                console.log(`🐠 Enough other fish (${availableOtherFish}), limiting user fish to ${targetUserFishCount}`);
            } else {
                // 其他用户的鱼不够，需要用户自己的鱼来填充
                targetUserFishCount = Math.min(
                    maxTankCapacity - availableOtherFish,
                    aliveUserFish.length
                );
                console.log(`🐠 Need more fish to reach ${maxTankCapacity}, keeping ${targetUserFishCount} user fish (have ${availableOtherFish} other fish)`);
            }
            
            // If we need to remove some user fish
            if (aliveUserFish.length > targetUserFishCount) {
                // Sort by creation date (newest first)
                aliveUserFish.sort((a, b) => {
                    const aDate = a.createdAt;
                    const bDate = b.createdAt;
                    
                    // Handle Firestore timestamp format
                    let aTime, bTime;
                    if (aDate && aDate._seconds) {
                        aTime = aDate._seconds * 1000 + (aDate._nanoseconds || 0) / 1000000;
                    } else if (aDate instanceof Date) {
                        aTime = aDate.getTime();
                    } else if (aDate) {
                        aTime = new Date(aDate).getTime();
                    } else {
                        aTime = 0;
                    }
                    
                    if (bDate && bDate._seconds) {
                        bTime = bDate._seconds * 1000 + (bDate._nanoseconds || 0) / 1000000;
                    } else if (bDate instanceof Date) {
                        bTime = bDate.getTime();
                    } else if (bDate) {
                        bTime = new Date(bDate).getTime();
                    } else {
                        bTime = 0;
                    }
                    
                    return bTime - aTime; // Newest first
                });
                
                // Keep only the target number, remove the rest
                const fishToKeep = aliveUserFish.slice(0, targetUserFishCount);
                const fishToRemove = aliveUserFish.slice(targetUserFishCount);
                
                console.log(`🐠 User has ${aliveUserFish.length} alive fish, keeping ${targetUserFishCount} newest (IDs: ${fishToKeep.map(f => f.docId || f.id).join(', ')})`);
                
                // Remove excess user fish with death animation
                fishToRemove.forEach((oldFish, index) => {
                    setTimeout(() => {
                        const oldFishIndex = fishes.indexOf(oldFish);
                        if (oldFishIndex !== -1 && !oldFish.isDying) {
                            console.log(`🐠 Removing duplicate user fish (ID: ${oldFish.docId || oldFish.id})`);
                            animateFishDeath(oldFishIndex);
                        }
                    }, index * 200); // Stagger the death animations
                });
            } else {
                console.log(`🐠 User has ${aliveUserFish.length} fish, no filtering needed (within limit)`);
            }
        } else {
            console.log('🐠 User has no fish in tank');
        }
        
        // Debug: Log total fish count after filtering
        const totalFishAfter = fishes.length;
        const otherUsersFishAfter = fishes.filter(f => {
            const fUserId = f.userId || f.user_id || f.UserId || f.owner_id || f.ownerId;
            return fUserId !== currentUserId;
        }).length;
        
        console.log(`🐠 [Global Tank] After filtering: ${totalFishAfter} total fish, ${otherUsersFishAfter} from other users`);
        
        if (otherUsersFishAfter < otherUsersFishBefore) {
            console.warn(`⚠️ [Global Tank] WARNING: Other users' fish count decreased from ${otherUsersFishBefore} to ${otherUsersFishAfter}! This should not happen in global tank mode.`);
        }
    } catch (error) {
        console.error('Error filtering user fish:', error);
    }
}

// Set up periodic polling instead of real-time listener to reduce costs
function setupNewFishListener() {
    // Remove existing listener if any
    if (newFishListener) {
        clearInterval(newFishListener);
        newFishListener = null;
    }

    // Use polling every 30 seconds instead of real-time listener
    newFishListener = setInterval(async () => {
        try {
            await checkForNewFish();
        } catch (error) {
            console.error('Error checking for new fish:', error);
        }
    }, 30000); // Poll every 30 seconds
}

// Check for new fish using backend API instead of real-time listener
async function checkForNewFish() {
    try {
        // 使用getFishBySort获取最新的鱼，确保使用正确的后端
        const newFishDocs = await getFishBySort('recent', 5, null, 'desc', null);
        
        // Get current user ID once before processing fish
        let currentUserId = null;
        try {
            if (typeof getCurrentUserId === 'function') {
                currentUserId = await getCurrentUserId();
            }
        } catch (error) {
            console.warn('Failed to get current user ID in checkForNewFish:', error);
        }

        // 转换为后端API格式
        const data = { data: newFishDocs };

        // Use for...of loop instead of forEach to support async operations
        for (const fishItem of data.data) {
            // Handle different possible backend API formats
            let fishData, fishId;

            if (typeof fishItem.data === 'function') {
                // Firestore-style document with data() function
                fishData = fishItem.data();
                fishId = fishItem.id;
            } else if (fishItem.data && typeof fishItem.data === 'object') {
                // Backend returns {id: '...', data: {...}}
                fishData = fishItem.data;
                fishId = fishItem.id;
            } else if (fishItem.id && (fishItem.image || fishItem.Image)) {
                // Backend returns fish data directly as properties
                fishData = fishItem;
                fishId = fishItem.id;
            } else {
                // Unknown format
                console.warn('Skipping fish with unknown format in checkForNewFish:', fishItem);
                continue;
            }

            // Skip if data is still undefined or null
            if (!fishData) {
                console.warn('Skipping fish with no data in checkForNewFish:', fishId, fishItem);
                continue;
            }

            const imageUrl = fishData.image || fishData.Image; // Try lowercase first, then uppercase

            if (!imageUrl || typeof imageUrl !== 'string' || !imageUrl.startsWith('http')) {
                console.warn('Skipping fish with invalid image:', fishId, fishData);
                continue;
            }

            // Only add if we haven't seen this fish before (check both docId and id)
            const fishAlreadyExists = fishes.some(f => {
                if (f.isDying) return false;
                const existingId = f.docId || f.id;
                return existingId === fishId;
            });
            
            if (!fishAlreadyExists) {
                // 🔧 检查是否已达到容量限制
                const currentFishCount = fishes.filter(f => !f.isDying).length;
                if (currentFishCount >= maxTankCapacity) {
                    console.log(`🐠 Tank is full (${currentFishCount}/${maxTankCapacity}), skipping new fish: ${fishId}`);
                    continue;
                }

                // Check if this new fish belongs to the current user
                const fishUserId = fishData.user_id || fishData.UserId || fishData.userId || fishData.owner_id || fishData.ownerId;
                const isUserFish = currentUserId && fishUserId === currentUserId;

                // If this is user's fish, check if there are other user's fish in the tank
                if (isUserFish) {
                    // Find all user's fish currently in the tank
                    const userFishInTank = fishes.filter(f => {
                        if (f.isDying) return false;
                        const fUserId = f.userId || f.user_id || f.UserId || f.owner_id || f.ownerId;
                        return fUserId === currentUserId;
                    });

                    // If user already has fish in tank, remove the oldest one(s) to keep only the newest
                    if (userFishInTank.length > 0) {
                        // Sort user's fish by creation date (oldest first)
                        userFishInTank.sort((a, b) => {
                            const aDate = a.createdAt;
                            const bDate = b.createdAt;
                            if (!aDate && !bDate) return 0;
                            if (!aDate) return 1;
                            if (!bDate) return -1;
                            const aTime = aDate instanceof Date ? aDate.getTime() : new Date(aDate).getTime();
                            const bTime = bDate instanceof Date ? bDate.getTime() : new Date(bDate).getTime();
                            return aTime - bTime; // Oldest first
                        });

                        // Remove all old user fish except the newest one (if new fish is newer)
                        const newestUserFishInTank = userFishInTank[userFishInTank.length - 1];
                        const newFishDate = fishData.CreatedAt || fishData.createdAt;
                        const newestInTankDate = newestUserFishInTank.createdAt;

                        // Compare dates to see if new fish is newer
                        let shouldRemoveOldFish = true;
                        if (newFishDate && newestInTankDate) {
                            const newFishTime = newFishDate instanceof Date ? newFishDate.getTime() : new Date(newFishDate).getTime();
                            const newestInTankTime = newestInTankDate instanceof Date ? newestInTankDate.getTime() : new Date(newestInTankDate).getTime();
                            shouldRemoveOldFish = newFishTime > newestInTankTime;
                        }

                        if (shouldRemoveOldFish) {
                            // Remove all old user fish
                            userFishInTank.forEach((oldFish, index) => {
                                const oldFishIndex = fishes.indexOf(oldFish);
                                if (oldFishIndex !== -1 && !oldFish.isDying) {
                                    console.log(`🐠 Removing old user fish to make room for newest one`);
                                    animateFishDeath(oldFishIndex);
                                }
                            });
                        } else {
                            // New fish is older than existing user fish, don't add it
                            console.log(`🐠 New fish is older than existing user fish, skipping`);
                            continue;
                        }
                    }
                }

                // Update newest timestamp
                const fishDate = fishData.CreatedAt || fishData.createdAt;
                if (!newestFishTimestamp || (fishDate && new Date(fishDate) > new Date(newestFishTimestamp))) {
                    newestFishTimestamp = fishDate;
                }

                // If at capacity, animate death of oldest fish, then add new one
                if (fishes.length >= maxTankCapacity) {
                    // Find the oldest fish by creation date (excluding dying fish and user's fish if this is user's new fish)
                    const aliveFish = fishes.filter(f => {
                        if (f.isDying) return false;
                        // If adding user's fish, exclude other user's fish from removal candidates
                        if (isUserFish) {
                            const fUserId = f.userId || f.user_id || f.UserId || f.owner_id || f.ownerId;
                            return fUserId !== currentUserId;
                        }
                        return true;
                    });

                    let oldestFishIndex = -1;
                    let oldestDate = null;

                    aliveFish.forEach((fish, index) => {
                        const fishDate = fish.createdAt;
                        if (!oldestDate) {
                            // First fish or no previous date found
                            oldestDate = fishDate;
                            oldestFishIndex = fishes.indexOf(fish);
                        } else if (!fishDate) {
                            // Fish without creation date should be considered oldest
                            oldestDate = null;
                            oldestFishIndex = fishes.indexOf(fish);
                        } else if (oldestDate && new Date(fishDate) < new Date(oldestDate)) {
                            // Found an older fish
                            oldestDate = fishDate;
                            oldestFishIndex = fishes.indexOf(fish);
                        }
                    });

                    if (oldestFishIndex !== -1) {
                        animateFishDeath(oldestFishIndex, () => {
                            // After death animation completes, add new fish
                            // 🔧 修复：为checkForNewFish也预设游动参数默认值
                            const normalizedNewFishData1 = {
                                ...fishData,
                                docId: fishId,
                                speed: fishData.speed || 2,
                                phase: fishData.phase || 0,
                                amplitude: fishData.amplitude || 24,
                                peduncle: fishData.peduncle || 0.4
                            };
                            loadFishImageToTank(imageUrl, normalizedNewFishData1, (newFish) => {
                                // Show subtle notification
                                showNewFishNotification(fishData.Artist || fishData.artist || 'Anonymous');
                            });
                        });
                    } else {
                        // No fish to remove, but we're at capacity - add anyway (user's old fish were already removed)
                        // 🔧 修复：为checkForNewFish也预设游动参数默认值
                        const normalizedNewFishData2 = {
                            ...fishData,
                            docId: fishId,
                            speed: fishData.speed || 2,
                            phase: fishData.phase || 0,
                            amplitude: fishData.amplitude || 24,
                            peduncle: fishData.peduncle || 0.4
                        };
                        loadFishImageToTank(imageUrl, normalizedNewFishData2, (newFish) => {
                            // Show subtle notification
                            showNewFishNotification(fishData.Artist || fishData.artist || 'Anonymous');
                        });
                    }
                } else {
                    // Tank not at capacity, add fish immediately
                    // 🔧 修复：为checkForNewFish也预设游动参数默认值
                    const normalizedNewFishData3 = {
                        ...fishData,
                        docId: fishId,
                        speed: fishData.speed || 2,
                        phase: fishData.phase || 0,
                        amplitude: fishData.amplitude || 24,
                        peduncle: fishData.peduncle || 0.4
                    };
                    loadFishImageToTank(imageUrl, normalizedNewFishData3, (newFish) => {
                        // Show subtle notification
                        showNewFishNotification(fishData.Artist || fishData.artist || 'Anonymous');
                    });
                }
            }
        }
    } catch (error) {
        console.error('Error checking for new fish:', error);
    }
}

// =====================================================
// Private Tank Functions (for view=my mode)
// =====================================================

/**
 * Load private fish (own + favorited) for Private Tank mode
 */
async function loadPrivateFish() {
    const loadingEl = document.getElementById('loading-indicator');
    
    try {
        if (loadingEl) {
            loadingEl.style.display = 'block';
            loadingEl.textContent = 'Loading...';
        }
        console.log('🐠 Loading private fish...');

        // 🔧 修复：优先从 Supabase session 获取 token，避免 localStorage 延迟
        let token = localStorage.getItem('userToken');
        
        // 如果 localStorage 中没有 token，尝试从 Supabase session 获取
        if (!token && window.supabaseAuth) {
            console.log('⚠️ No token in localStorage, fetching from Supabase session...');
            const session = await window.supabaseAuth.getSession();
            if (session?.access_token) {
                token = session.access_token;
                // 同步更新 localStorage
                localStorage.setItem('userToken', token);
                console.log('✅ Token retrieved from Supabase session and saved to localStorage');
            }
        }
        
        if (!token) {
            throw new Error('Not logged in - no token found');
        }

        const BACKEND_URL = window.location.origin;
        console.log('🌐 Fetching from:', `${BACKEND_URL}/api/fish-api?action=my-tank`);
        
        const response = await fetch(`${BACKEND_URL}/api/fish-api?action=my-tank`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        console.log('📡 Response status:', response.status, response.statusText);

        if (!response.ok) {
            let errorData;
            try {
                errorData = await response.json();
            } catch (e) {
                const errorText = await response.text().catch(() => 'Unknown error');
                console.error('❌ API error response (not JSON):', errorText);
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            console.error('❌ API error:', errorData);
            const errorMessage = errorData.error || errorData.message || `HTTP ${response.status}: ${response.statusText}`;
            const errorDetails = errorData.details || errorData.stack || '';
            
            if (errorDetails) {
                console.error('❌ Error details:', errorDetails);
            }
            
            throw new Error(errorMessage + (errorDetails ? `\nDetails: ${JSON.stringify(errorDetails)}` : ''));
        }

        const result = await response.json();
        console.log('📦 API result:', { success: result.success, fishCount: result.fish?.length, stats: result.stats });

        if (!result.success) {
            console.error('❌ API returned success=false:', result);
            throw new Error(result.error || result.message || 'Failed to load fish');
        }

        const allMyFish = result.fish || [];
        console.log(`✅ Loaded ${allMyFish.length} fish from API`);

        // 应用鱼数量限制 - 私人鱼缸也应该受限于 maxTankCapacity 参数
        const fishToLoad = allMyFish.slice(0, maxTankCapacity);
        console.log(`🎯 Limited to ${fishToLoad.length} fish based on tank capacity (${maxTankCapacity})`);

        // Update loading text
        if (loadingEl && fishToLoad.length > 0) {
            loadingEl.textContent = `Loading ${fishToLoad.length} fish...`;
        }

        updatePrivateTankStats(result.stats);

        fishes.length = 0;
        
        // 🔧 重置行分配计数器，确保每次加载都能均匀分配
        nextFishRowIndex = 0;

        console.log(`🔨 开始创建 ${fishToLoad.length} 个鱼对象...`);
        let successCount = 0;
        let failCount = 0;
        
        // 限制并发加载数量，避免卡死
        const batchSize = 5;
        for (let i = 0; i < fishToLoad.length; i += batchSize) {
            const batch = fishToLoad.slice(i, i + batchSize);
            console.log(`🔨 Loading batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(fishToLoad.length / batchSize)} (${batch.length} fish)...`);
            
            // Update loading text
            if (loadingEl) {
                loadingEl.textContent = `Loading ${i}/${fishToLoad.length} fish...`;
            }
            
            const results = await Promise.allSettled(
                batch.map(fishData => createPrivateFishObject(fishData))
            );
            
            results.forEach((result, idx) => {
                if (result.status === 'fulfilled' && result.value) {
                    fishes.push(result.value);
                    successCount++;
                } else {
                    failCount++;
                    const fishData = batch[idx];
                    if (result.status === 'rejected') {
                        console.error(`❌ 创建鱼对象 #${i + idx + 1} 失败:`, result.reason, fishData?.id || fishData);
                    } else {
                        console.warn(`⚠️ 鱼对象 #${i + idx + 1} 返回 null:`, fishData?.id || fishData);
                    }
                }
            });
        }

        console.log(`🐟 创建完成: ${successCount} 成功, ${failCount} 失败, 总计 ${fishes.length} 条鱼在鱼缸中`);

        // Assign fish to rows for dialogue system
        if (tankLayoutManager && fishes.length > 0) {
            setTimeout(() => {
                tankLayoutManager.assignFishToRows(fishes, true);
                console.log(`✅ Assigned ${fishes.length} fish to rows for dialogue system`);
            }, 500);
        }

        if (fishes.length === 0) {
            console.log('ℹ️ No fish successfully loaded in private tank');
            if (loadingEl) {
                loadingEl.textContent = 'No fish to display';
                setTimeout(() => {
                    loadingEl.style.display = 'none';
                }, 2000);
            }
        } else {
            if (loadingEl) loadingEl.style.display = 'none';
        }

    } catch (error) {
        console.error('❌ Error loading private fish:', error);
        console.error('❌ Error stack:', error.stack);
        
        if (loadingEl) {
            loadingEl.textContent = `Error: ${error.message}`;
            setTimeout(() => {
                loadingEl.style.display = 'none';
            }, 3000);
        }
        
        // Show user-friendly error message
        if (error.message.includes('Not logged in')) {
            console.log('User not logged in, authentication required');
            if (window.authUI && window.authUI.showLoginModal) {
                window.authUI.showLoginModal();
            }
        } else {
            // Show error in UI
            alert(`Failed to load private tank: ${error.message}`);
        }
    }
}

/**
 * Create fish object from API data for Private Tank
 * 使用与全局鱼缸相同的图片加载逻辑，确保清晰度一致
 */
async function createPrivateFishObject(fishData) {
    try {
        // 尝试多种可能的图片URL字段名（与全局鱼缸保持一致）
        const imageUrl = fishData.image_url || fishData.imageUrl || fishData.image || fishData.Image;
        
        // 🔍 调试：记录私人鱼缸的图片URL格式和游动参数
        console.log('🔍 Private tank image URL:', imageUrl, 'from data:', {
            image_url: fishData.image_url,
            imageUrl: fishData.imageUrl, 
            image: fishData.image,
            Image: fishData.Image
        });
        
        // 🔍 调试：记录私人鱼缸API返回的原始游动参数
        // 注意：Our Tank API 返回 fishId 作为真正的鱼 ID，id 是 our_tank_fish 表的记录 ID
        const realFishId = fishData.fishId || fishData.fish_id || fishData.id || fishData.docId;
        console.log('🔍 Private tank API原始游动参数:', {
            speed: fishData.speed,
            amplitude: fishData.amplitude,
            phase: fishData.phase,
            peduncle: fishData.peduncle,
            docId: realFishId
        });
        
        if (!imageUrl) {
            console.warn('Fish data missing image URL:', fishData);
            return null;
        }

        // 使用与全局鱼缸完全相同的图片加载函数，确保处理逻辑100%一致
        // 注意：这里直接调用 loadFishImageToTank，与全局鱼缸使用完全相同的代码路径
        return new Promise((resolve) => {
            // 构建与全局鱼缸完全相同的 fishData 对象
            // 注意：Our Tank API 返回 fishId 作为真正的鱼 ID
            const normalizedFishData = {
                ...fishData,
                id: realFishId,  // 确保 id 也是真正的鱼 ID
                docId: realFishId,
                // 确保所有图片URL字段名与全局鱼缸一致
                image: imageUrl,
                Image: imageUrl,
                image_url: imageUrl,
                imageUrl: imageUrl,
                // 🔧 修复：强制设置游动参数为固定值，私人鱼缸速度降低50%
                speed: 1,  // 私人鱼缸速度降低50%（原为2）
                phase: 0,  // 强制设置为0，忽略API返回值
                amplitude: 24,  // 强制设置为24，忽略API返回值
                peduncle: 0.4,  // 强制设置为0.4，忽略API返回值
                // 保留私人鱼缸特有字段
                is_own: fishData.is_own || fishData.isOwn || false,
                is_favorited: fishData.is_favorited || fishData.isFavorited || false,
                is_alive: fishData.is_alive !== false,
                // 转换字段名以匹配全局鱼缸格式
                // Our Tank API 返回 artistName，需要映射到 artist
                artist: fishData.artistName || fishData.artist || 'Anonymous',
                createdAt: fishData.created_at || fishData.createdAt || null,
                CreatedAt: fishData.created_at || fishData.createdAt || null,
                upvotes: fishData.upvotes || 0,
                userId: fishData.user_id || fishData.userId || null,
                user_id: fishData.user_id || fishData.userId || null,
                fish_name: fishData.fishName || fishData.fish_name || null,
                personality: fishData.personality || (['cheerful', 'funny', 'wise', 'shy', 'bold'][Math.floor(Math.random() * 5)]),
                health: fishData.health || 100,
                level: fishData.level || 1,
                experience: fishData.experience || 0,
                attack: fishData.attack || 10,
                defense: fishData.defense || 5
            };
            
            // 调用 loadFishImageToTank，传递回调函数
            loadFishImageToTank(imageUrl, normalizedFishData, (fishObj) => {
                if (fishObj) {
                    // 添加私人鱼缸特有属性
                    fishObj.isOwn = fishData.is_own || fishData.isOwn || false;
                    fishObj.isFavorited = fishData.is_favorited || fishData.isFavorited || false;
                    fishObj.is_alive = fishData.is_alive !== false;
                    
                    // 🔧 修复：私人鱼缸速度降低50%，强制覆盖任何可能的差异
                    fishObj.speed = 1;  // 私人鱼缸速度降低50%（原为2）
                    fishObj.phase = 0;
                    fishObj.amplitude = 24;  // 与全局鱼缸createFishObject中的默认值一致
                    fishObj.peduncle = 0.4;
                    
                    console.log(`🔧 私人鱼缸鱼游动参数已设置: speed=${fishObj.speed} (降低50%), amplitude=${fishObj.amplitude}, phase=${fishObj.phase}, peduncle=${fishObj.peduncle}`);
                }
                resolve(fishObj || null);
            });
        });
    } catch (error) {
        console.error('Error creating private fish object:', error, fishData);
        return null;
    }
}

/**
 * Update stats display for Private Tank
 */
function updatePrivateTankStats(stats) {
    console.log('📊 Private Tank Stats:', stats);
    // Stats can be displayed in UI if needed
    // For now, just log them
}

// =====================================================
// Our Tank Functions (好友鱼缸)
// =====================================================

/**
 * Load fish for Our Tank mode (好友鱼缸)
 */
async function loadOurTankFish() {
    const loadingEl = document.getElementById('loading-indicator');
    
    try {
        if (loadingEl) {
            loadingEl.style.display = 'block';
            loadingEl.textContent = 'Loading Our Tank...';
        }
        console.log('🐟 Loading Our Tank fish for tank:', OUR_TANK_ID);

        if (!OUR_TANK_ID) {
            throw new Error('缺少鱼缸ID参数');
        }

        // 获取认证 token
        let token = localStorage.getItem('userToken');
        if (!token && window.supabaseAuth) {
            const session = await window.supabaseAuth.getSession();
            if (session?.access_token) {
                token = session.access_token;
                localStorage.setItem('userToken', token);
            }
        }
        
        if (!token) {
            throw new Error('请先登录');
        }

        const BACKEND_URL = window.location.origin;
        console.log('🌐 Fetching Our Tank detail from:', `${BACKEND_URL}/api/our-tank-api?action=detail&tankId=${OUR_TANK_ID}`);
        
        const response = await fetch(`${BACKEND_URL}/api/our-tank-api?action=detail&tankId=${OUR_TANK_ID}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || errorData.error || `HTTP ${response.status}`);
        }

        const result = await response.json();
        console.log('📦 Our Tank API result:', { success: result.success, tankName: result.tank?.name, fishCount: result.fish?.length });

        if (!result.success) {
            throw new Error(result.error || result.message || '加载失败');
        }

        // Update page title
        if (result.tank?.name) {
            document.title = `${result.tank.name} - Our Tank | FishTalk.app`;
        }

        const allFish = result.fish || [];
        console.log(`✅ Loaded ${allFish.length} fish from Our Tank`);

        // 应用鱼数量限制
        const fishToLoad = allFish.slice(0, maxTankCapacity);
        console.log(`🎯 Limited to ${fishToLoad.length} fish based on tank capacity (${maxTankCapacity})`);

        if (loadingEl && fishToLoad.length > 0) {
            loadingEl.textContent = `加载 ${fishToLoad.length} 条鱼...`;
        }

        // 清空现有鱼
        fishes.length = 0;
        nextFishRowIndex = 0;

        console.log(`🔨 开始创建 ${fishToLoad.length} 个鱼对象...`);
        let successCount = 0;
        let failCount = 0;
        
        // 批量加载
        const batchSize = 5;
        for (let i = 0; i < fishToLoad.length; i += batchSize) {
            const batch = fishToLoad.slice(i, i + batchSize);
            
            if (loadingEl) {
                loadingEl.textContent = `加载 ${i}/${fishToLoad.length} 条鱼...`;
            }
            
            const results = await Promise.allSettled(
                batch.map(fishData => createPrivateFishObject(fishData))
            );
            
            results.forEach((result, idx) => {
                if (result.status === 'fulfilled' && result.value) {
                    fishes.push(result.value);
                    successCount++;
                } else {
                    failCount++;
                    console.warn(`⚠️ 鱼对象创建失败:`, batch[idx]?.id);
                }
            });
        }

        console.log(`🐟 创建完成: ${successCount} 成功, ${failCount} 失败`);

        // 分配鱼到行
        if (tankLayoutManager && fishes.length > 0) {
            setTimeout(() => {
                tankLayoutManager.assignFishToRows(fishes, true);
            }, 500);
        }

        if (fishes.length === 0) {
            if (loadingEl) {
                loadingEl.textContent = 'No fish in this tank yet';
                setTimeout(() => { loadingEl.style.display = 'none'; }, 2000);
            }
        } else {
            if (loadingEl) loadingEl.style.display = 'none';
        }

        // 保存鱼缸信息供群聊使用
        window.ourTankInfo = result.tank;
        window.ourTankMembers = result.members;

        // 初始化 Our Tank UI
        initOurTankUI();
        
        // 加载聊天历史并初始化实时订阅 (Task 15.2, 15.3)
        await loadOurTankChatHistory();
        await initOurTankChatSubscription();

    } catch (error) {
        console.error('❌ Error loading Our Tank fish:', error);
        
        if (loadingEl) {
            loadingEl.textContent = `错误: ${error.message}`;
            setTimeout(() => { loadingEl.style.display = 'none'; }, 3000);
        }
        
        if (error.message.includes('登录') || error.message.includes('Unauthorized')) {
            if (window.authUI && window.authUI.showLoginModal) {
                window.authUI.showLoginModal();
            } else {
                window.location.href = '/login.html?redirect=' + encodeURIComponent(window.location.href);
            }
        }
    }
}

// =====================================================
// Our Tank UI Functions (好友鱼缸 UI)
// =====================================================

/**
 * 初始化 Our Tank 模式的 UI
 */
function initOurTankUI() {
    const header = document.getElementById('our-tank-header');
    if (!header) return;
    
    // 显示 Our Tank 信息栏
    header.style.display = 'block';
    
    // 更新鱼缸信息
    updateOurTankHeader();
    
    // 隐藏 Global Tank 特有的控件
    const sortSelector = document.getElementById('tank-sort-sidebar');
    const fishCountSelector = document.getElementById('fish-count-selector-sidebar');
    
    if (sortSelector) {
        sortSelector.closest('div').style.display = 'none';
    }
    if (fishCountSelector) {
        fishCountSelector.closest('div').style.display = 'none';
    }
    
    console.log('✅ Our Tank UI initialized');
}

/**
 * 更新 Our Tank 信息栏
 */
function updateOurTankHeader() {
    const tankInfo = window.ourTankInfo;
    const members = window.ourTankMembers;
    
    if (!tankInfo) return;
    
    // Update tank name
    const nameEl = document.getElementById('our-tank-name');
    if (nameEl) {
        nameEl.textContent = tankInfo.name || 'Friend Tank';
    }
    
    // Update member count (just the number, button text is in HTML)
    const memberCountEl = document.getElementById('our-tank-member-count');
    if (memberCountEl && members) {
        memberCountEl.textContent = members.length;
    }
    
    // Update fish count (hidden element for JS compatibility)
    const fishCountEl = document.getElementById('our-tank-fish-count');
    if (fishCountEl) {
        const fishCount = fishes.filter(f => !f.isDying).length;
        fishCountEl.textContent = fishCount;
    }
    
    // Update invite code
    const inviteCodeEl = document.getElementById('our-tank-invite-code');
    if (inviteCodeEl && tankInfo.code) {
        inviteCodeEl.textContent = tankInfo.code;
    }
}

/**
 * 显示添加鱼模态框
 */
async function showAddFishModal() {
    const modal = document.getElementById('our-tank-add-fish-modal');
    if (!modal) return;
    
    modal.style.display = 'flex';
    
    // 加载用户的鱼列表
    await loadMyFishForTank();
}

/**
 * 关闭添加鱼模态框
 */
function closeAddFishModal() {
    const modal = document.getElementById('our-tank-add-fish-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}

/**
 * Load user's fish list for adding to tank
 */
async function loadMyFishForTank() {
    const listEl = document.getElementById('my-fish-list-for-tank');
    if (!listEl) return;
    
    listEl.innerHTML = '<div style="text-align: center; color: #999; padding: 40px; grid-column: 1/-1;">Loading...</div>';
    
    try {
        let token = localStorage.getItem('userToken');
        if (!token && window.supabaseAuth) {
            const session = await window.supabaseAuth.getSession();
            if (session?.access_token) {
                token = session.access_token;
            }
        }
        
        if (!token) {
            listEl.innerHTML = `
                <div style="text-align: center; padding: 40px; grid-column: 1/-1;">
                    <div style="font-size: 48px; margin-bottom: 16px;">🔒</div>
                    <div style="color: #666; margin-bottom: 16px;">Please sign in to add fish</div>
                    <a href="login.html?redirect=${encodeURIComponent(window.location.href)}" style="display: inline-block; padding: 10px 24px; background: linear-gradient(180deg, #63A4E8 0%, #4A90E2 100%); color: white; border-radius: 10px; text-decoration: none; font-weight: 700; box-shadow: 0 3px 0 #2C5F8F;">Sign In</a>
                </div>`;
            return;
        }
        
        // Get user's fish
        const response = await fetch(`/api/fish-api?action=my-tank`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Failed to load fish');
        
        const result = await response.json();
        const allFish = result.fish || result.data || [];
        // Only show user's own fish (not favorited fish) for adding to Our Tank
        const myFish = allFish.filter(fish => fish.is_own !== false);
        
        if (myFish.length === 0) {
            // 如果是 Our Tank 模式，传递 ourTankId 参数，让用户画完鱼后自动添加到这个鱼缸
            const drawFishUrl = OUR_TANK_ID ? `index.html?ourTankId=${OUR_TANK_ID}` : 'index.html';
            listEl.innerHTML = `
                <div style="text-align: center; padding: 40px; grid-column: 1/-1;">
                    <div style="font-size: 48px; margin-bottom: 16px;">🎨</div>
                    <div style="color: #666; margin-bottom: 16px;">You haven't drawn any fish yet</div>
                    <a href="${drawFishUrl}" style="display: inline-block; padding: 10px 24px; background: linear-gradient(180deg, #4CD964 0%, #3CB54A 100%); color: white; border-radius: 10px; text-decoration: none; font-weight: 700; box-shadow: 0 3px 0 #2E8B3A;">🎨 Draw a Fish</a>
                </div>`;
            return;
        }
        
        // 获取已添加到鱼缸的鱼 ID
        const tankFishIds = new Set(fishes.map(f => f.id || f.docId));
        
        // 渲染鱼列表
        listEl.innerHTML = myFish.map(fish => {
            const isInTank = tankFishIds.has(fish.id);
            const fishName = fish.fish_name || 'Unnamed';
            const imageUrl = fish.image_url || fish.imageUrl;
            
            return `
                <div class="fish-item-for-tank" style="text-align: center; padding: 12px; background: white; border-radius: 12px; border: 2px solid ${isInTank ? '#4CD964' : '#E5E7EB'}; cursor: ${isInTank ? 'default' : 'pointer'}; transition: all 0.2s ease; opacity: ${isInTank ? '0.7' : '1'};" 
                     ${isInTank ? '' : `onclick="addFishToOurTank('${fish.id}')"`}>
                    <img src="${imageUrl}" alt="${fishName}" style="width: 80px; height: 60px; object-fit: contain; border-radius: 8px;">
                    <div style="font-size: 12px; font-weight: 600; color: #333; margin-top: 6px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${fishName}</div>
                    ${isInTank ? '<div style="font-size: 11px; color: #4CD964; margin-top: 4px;">✓ Added</div>' : ''}
                </div>
            `;
        }).join('');
        
    } catch (error) {
        console.error('❌ Error loading my fish:', error);
        listEl.innerHTML = `<div style="text-align: center; color: #C0392B; padding: 40px; grid-column: 1/-1;">Failed to load: ${error.message}</div>`;
    }
}

/**
 * Add fish to Our Tank
 */
async function addFishToOurTank(fishId) {
    if (!OUR_TANK_ID || !fishId) return;
    
    try {
        let token = localStorage.getItem('userToken');
        if (!token && window.supabaseAuth) {
            const session = await window.supabaseAuth.getSession();
            if (session?.access_token) {
                token = session.access_token;
            }
        }
        
        const response = await fetch(`/api/our-tank-api?action=add-fish`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                tankId: OUR_TANK_ID,
                fishId: fishId
            })
        });
        
        const result = await response.json();
        
        if (!response.ok || !result.success) {
            throw new Error(result.error || result.message || 'Failed to add');
        }
        
        console.log('✅ Fish added to Our Tank:', fishId);
        
        // Close modal and reload tank
        closeAddFishModal();
        await loadOurTankFish();
        updateOurTankHeader();
        
    } catch (error) {
        console.error('❌ Error adding fish to Our Tank:', error);
        alert(`Failed to add fish: ${error.message}`);
    }
}

/**
 * 自动添加鱼到 Our Tank（从绘画页面跳转过来时调用）
 * 与 addFishToOurTank 类似，但不需要关闭模态框，且显示成功提示
 */
async function autoAddFishToOurTank(fishId) {
    if (!OUR_TANK_ID || !fishId) {
        console.warn('[Auto Add Fish] 缺少必要参数:', { OUR_TANK_ID, fishId });
        return;
    }
    
    console.log('🎯 [Auto Add Fish] 开始自动添加鱼到 Our Tank:', { tankId: OUR_TANK_ID, fishId });
    
    try {
        let token = localStorage.getItem('userToken');
        if (!token && window.supabaseAuth) {
            const session = await window.supabaseAuth.getSession();
            if (session?.access_token) {
                token = session.access_token;
            }
        }
        
        if (!token) {
            console.error('[Auto Add Fish] 未登录');
            return;
        }
        
        const response = await fetch(`/api/our-tank-api?action=add-fish`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                tankId: OUR_TANK_ID,
                fishId: fishId
            })
        });
        
        const result = await response.json();
        
        if (!response.ok || !result.success) {
            // 如果鱼已经在鱼缸中，不显示错误
            if (result.error && result.error.includes('already')) {
                console.log('[Auto Add Fish] 鱼已经在鱼缸中');
                return;
            }
            throw new Error(result.error || result.message || 'Failed to add');
        }
        
        console.log('✅ [Auto Add Fish] 鱼已成功添加到 Our Tank:', fishId);
        
        // 重新加载鱼缸
        await loadOurTankFish();
        updateOurTankHeader();
        
        // 显示成功提示
        showAutoAddSuccessToast();
        
    } catch (error) {
        console.error('❌ [Auto Add Fish] 添加失败:', error);
        // 不显示 alert，只在控制台记录错误
    }
}

/**
 * 显示自动添加成功的 Toast 提示
 */
function showAutoAddSuccessToast() {
    // 移除已存在的 toast
    const existingToast = document.querySelector('.auto-add-fish-toast');
    if (existingToast) {
        existingToast.remove();
    }
    
    const toast = document.createElement('div');
    toast.className = 'auto-add-fish-toast';
    toast.innerHTML = '🐟 Your fish has been added to the tank!';
    toast.style.cssText = `
        position: fixed;
        bottom: 100px;
        left: 50%;
        transform: translateX(-50%);
        background: linear-gradient(180deg, #4CD964 0%, #3CB54A 100%);
        color: white;
        padding: 16px 32px;
        border-radius: 12px;
        font-size: 16px;
        font-weight: 700;
        z-index: 10000;
        box-shadow: 0 4px 0 #2E8B3A, 0 8px 20px rgba(76, 217, 100, 0.3);
        animation: fadeInUp 0.3s ease;
    `;
    document.body.appendChild(toast);
    
    // 3秒后淡出
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

/**
 * 显示成员列表模态框
 */
function showMembersModal() {
    const modal = document.getElementById('our-tank-members-modal');
    if (!modal) return;
    
    modal.style.display = 'flex';
    
    // 渲染成员列表
    renderMembersList();
}

/**
 * 关闭成员列表模态框
 */
function closeMembersModal() {
    const modal = document.getElementById('our-tank-members-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}

/**
 * 渲染成员列表
 */
function renderMembersList() {
    const listEl = document.getElementById('our-tank-members-list');
    if (!listEl) return;
    
    const members = window.ourTankMembers || [];
    const tankInfo = window.ourTankInfo;
    const currentUserId = window.currentUser?.id;
    const isOwner = tankInfo?.owner_id === currentUserId;
    
    if (members.length === 0) {
        listEl.innerHTML = '<div style="text-align: center; color: #999; padding: 40px;">No members yet</div>';
        return;
    }
    
    listEl.innerHTML = members.map(member => {
        const isCurrentUser = member.userId === currentUserId;
        const isMemberOwner = member.role === 'owner';
        const nickName = member.displayName || member.user?.nick_name || member.nick_name || 'Anonymous';
        
        return `
            <div style="display: flex; align-items: center; justify-content: space-between; padding: 12px; background: white; border-radius: 12px; margin-bottom: 8px; border: 2px solid #E5E7EB;">
                <div style="display: flex; align-items: center; gap: 12px;">
                    <div style="width: 40px; height: 40px; border-radius: 50%; background: linear-gradient(135deg, #6366F1, #8B5CF6); display: flex; align-items: center; justify-content: center; color: white; font-weight: 700;">
                        ${nickName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <div style="font-weight: 600; color: #333;">${nickName} ${isCurrentUser ? '(You)' : ''}</div>
                        <div style="font-size: 12px; color: #999;">${isMemberOwner ? '👑 Owner' : '🐟 Member'}</div>
                    </div>
                </div>
                ${isOwner && !isMemberOwner && !isCurrentUser ? `
                    <button onclick="removeMemberFromTank('${member.userId}')" style="padding: 6px 12px; background: linear-gradient(#FC5C65 0%, #EB3B5A 100%); color: white; border: none; border-radius: 8px; font-size: 12px; font-weight: 600; cursor: pointer;">
                        Remove
                    </button>
                ` : ''}
            </div>
        `;
    }).join('');
}

/**
 * Remove member from tank
 */
async function removeMemberFromTank(userId) {
    if (!OUR_TANK_ID || !userId) return;
    
    if (!confirm('Are you sure you want to remove this member? All fish added by this member will also be removed.')) {
        return;
    }
    
    try {
        let token = localStorage.getItem('userToken');
        if (!token && window.supabaseAuth) {
            const session = await window.supabaseAuth.getSession();
            if (session?.access_token) {
                token = session.access_token;
            }
        }
        
        const response = await fetch(`/api/our-tank-api?action=remove-member`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                tankId: OUR_TANK_ID,
                userId: userId
            })
        });
        
        const result = await response.json();
        
        if (!response.ok || !result.success) {
            throw new Error(result.error || result.message || '移除失败');
        }
        
        console.log('✅ Member removed from Our Tank:', userId);
        
        // 重新加载成员列表和鱼缸
        await loadOurTankFish();
        renderMembersList();
        updateOurTankHeader();
        
    } catch (error) {
        console.error('❌ Error removing member:', error);
        alert(`移除失败: ${error.message}`);
    }
}

/**
 * 显示分享模态框
 */
function showShareModal() {
    const modal = document.getElementById('our-tank-share-modal');
    if (!modal) return;
    
    modal.style.display = 'flex';
    
    // 更新邀请码显示
    const inviteCodeEl = document.getElementById('our-tank-invite-code');
    if (inviteCodeEl && window.ourTankInfo?.code) {
        inviteCodeEl.textContent = window.ourTankInfo.code;
    }
}

/**
 * 关闭分享模态框
 */
function closeShareModal() {
    const modal = document.getElementById('our-tank-share-modal');
    if (modal) {
        modal.style.display = 'none';
    }
    
    // 隐藏复制成功提示
    const successEl = document.getElementById('share-copy-success');
    if (successEl) {
        successEl.style.display = 'none';
    }
}

/**
 * 复制邀请码到剪贴板
 */
async function copyInviteCode() {
    const code = window.ourTankInfo?.code;
    if (!code) return;
    
    try {
        await navigator.clipboard.writeText(code);
        
        // 显示复制成功提示
        const successEl = document.getElementById('share-copy-success');
        if (successEl) {
            successEl.style.display = 'block';
            setTimeout(() => {
                successEl.style.display = 'none';
            }, 2000);
        }
        
        console.log('✅ Invite code copied:', code);
    } catch (error) {
        console.error('❌ Failed to copy:', error);
        // 备用方案：使用 prompt
        prompt('复制邀请码:', code);
    }
}

/**
 * 复制邀请链接到剪贴板
 * Requirements: 2.1, 16.2
 */
async function copyInviteLink() {
    const code = window.ourTankInfo?.code;
    if (!code) return;
    
    // 生成邀请链接
    const baseUrl = window.location.origin;
    const inviteLink = `${baseUrl}/our-tank-list.html?code=${code}`;
    
    try {
        await navigator.clipboard.writeText(inviteLink);
        
        // 显示复制成功提示
        const successEl = document.getElementById('share-copy-success');
        if (successEl) {
            successEl.style.display = 'block';
            successEl.textContent = '✅ 邀请链接已复制！';
            setTimeout(() => {
                successEl.style.display = 'none';
                successEl.textContent = '✅ 已复制到剪贴板！';
            }, 2000);
        }
        
        console.log('✅ Invite link copied:', inviteLink);
    } catch (error) {
        console.error('❌ Failed to copy link:', error);
        // 备用方案：使用 prompt
        prompt('复制邀请链接:', inviteLink);
    }
}

/**
 * 加载 Our Tank 聊天历史
 * Requirements: 4.3, 15.3
 */
async function loadOurTankChatHistory() {
    if (VIEW_MODE !== 'our' || !OUR_TANK_ID) {
        console.log('[Our Tank Chat] 非 Our Tank 模式，跳过聊天历史加载');
        return;
    }
    
    console.log('[Our Tank Chat] 加载聊天历史...');
    
    try {
        const token = localStorage.getItem('userToken');
        const headers = {
            'Content-Type': 'application/json'
        };
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        
        const response = await fetch(`/api/our-tank-api?action=chat-history&tankId=${OUR_TANK_ID}&limit=20`, {
            method: 'GET',
            headers: headers
        });
        
        if (!response.ok) {
            console.error('[Our Tank Chat] 加载聊天历史失败:', response.status);
            return;
        }
        
        const data = await response.json();
        
        if (!data.success || !data.sessions) {
            console.warn('[Our Tank Chat] 无聊天历史数据');
            return;
        }
        
        console.log(`[Our Tank Chat] 加载了 ${data.sessions.length} 条聊天记录`);
        
        // 显示聊天历史到聊天面板
        const chatMessages = document.getElementById('chat-messages');
        if (!chatMessages) return;
        
        // 清空现有消息
        chatMessages.innerHTML = '';
        
        // 按时间正序显示（最旧的在上面）
        const sortedSessions = [...data.sessions].reverse();
        
        for (const session of sortedSessions) {
            // 显示用户消息（如果有）
            if (session.userMessage) {
                const userDiv = document.createElement('div');
                userDiv.className = 'user-chat-message';
                userDiv.style.cssText = `
                    background: linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%);
                    border-radius: 8px;
                    padding: 8px 12px;
                    margin-bottom: 6px;
                    font-size: 13px;
                    line-height: 1.5;
                    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
                    border-left: 3px solid #6366F1;
                `;
                userDiv.innerHTML = `
                    <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
                        <span style="font-weight: 600; color: #6366F1; font-size: 12px;">👤 ${session.initiatorName || 'User'}</span>
                        <span style="font-size: 10px; color: #999;">${formatChatTime(session.createdAt)}</span>
                    </div>
                    <div style="color: #333; text-align: left;">${escapeHtml(session.userMessage)}</div>
                `;
                chatMessages.appendChild(userDiv);
            }
            
            // 显示鱼的回复
            if (session.dialogues && session.dialogues.messages) {
                for (const msg of session.dialogues.messages) {
                    const fishDiv = document.createElement('div');
                    fishDiv.className = 'fish-chat-message';
                    fishDiv.style.cssText = `
                        background: linear-gradient(135deg, rgba(255, 215, 0, 0.1) 0%, rgba(255, 165, 0, 0.1) 100%);
                        border-radius: 8px;
                        padding: 8px 12px;
                        margin-bottom: 6px;
                        font-size: 13px;
                        line-height: 1.5;
                        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
                        border-left: 3px solid #FFD700;
                    `;
                    fishDiv.innerHTML = `
                        <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
                            <span style="font-weight: 600; color: #FF8C00; font-size: 12px;">🐟 ${msg.fishName || 'Fish'}</span>
                        </div>
                        <div style="color: #333; text-align: left;">${escapeHtml(msg.message || '')}</div>
                    `;
                    chatMessages.appendChild(fishDiv);
                }
            }
        }
        
        // 滚动到底部
        chatMessages.scrollTop = chatMessages.scrollHeight;
        
    } catch (error) {
        console.error('[Our Tank Chat] 加载聊天历史出错:', error);
    }
}

/**
 * 格式化聊天时间
 */
function formatChatTime(isoString) {
    if (!isoString) return '';
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
}

/**
 * 初始化 Our Tank 实时聊天订阅
 * Requirements: 4.5, 15.2
 */
async function initOurTankChatSubscription() {
    if (VIEW_MODE !== 'our' || !OUR_TANK_ID) {
        return;
    }
    
    // 检查 Supabase 是否可用
    if (!window.supabaseClient) {
        console.warn('[Our Tank Chat] Supabase 客户端不可用，无法订阅实时消息');
        return;
    }
    
    console.log('[Our Tank Chat] 初始化实时聊天订阅...');
    
    try {
        // 订阅 group_chat 表的变化
        const channel = window.supabaseClient
            .channel(`our-tank-chat-${OUR_TANK_ID}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'group_chat',
                filter: `our_tank_id=eq.${OUR_TANK_ID}`
            }, (payload) => {
                console.log('[Our Tank Chat] 收到新消息:', payload);
                handleNewChatMessage(payload.new);
            })
            .subscribe((status) => {
                console.log('[Our Tank Chat] 订阅状态:', status);
            });
        
        // 保存 channel 引用以便后续取消订阅
        window.ourTankChatChannel = channel;
        
    } catch (error) {
        console.error('[Our Tank Chat] 订阅失败:', error);
    }
}

/**
 * 处理新的聊天消息
 */
function handleNewChatMessage(chatData) {
    if (!chatData) return;
    
    const chatMessages = document.getElementById('chat-messages');
    if (!chatMessages) return;
    
    // 显示用户消息（如果有）
    if (chatData.user_talk) {
        const userDiv = document.createElement('div');
        userDiv.className = 'user-chat-message new-message';
        userDiv.style.cssText = `
            background: linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%);
            border-radius: 8px;
            padding: 8px 12px;
            margin-bottom: 6px;
            font-size: 13px;
            line-height: 1.5;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
            border-left: 3px solid #6366F1;
            animation: fadeIn 0.3s ease;
        `;
        userDiv.innerHTML = `
            <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
                <span style="font-weight: 600; color: #6366F1; font-size: 12px;">👤 User</span>
                <span style="font-size: 10px; color: #999;">just now</span>
            </div>
            <div style="color: #333; text-align: left;">${escapeHtml(chatData.user_talk)}</div>
        `;
        chatMessages.appendChild(userDiv);
    }
    
    // 显示鱼的回复
    if (chatData.dialogues && chatData.dialogues.messages) {
        for (const msg of chatData.dialogues.messages) {
            const fishDiv = document.createElement('div');
            fishDiv.className = 'fish-chat-message new-message';
            fishDiv.style.cssText = `
                background: linear-gradient(135deg, rgba(255, 215, 0, 0.1) 0%, rgba(255, 165, 0, 0.1) 100%);
                border-radius: 8px;
                padding: 8px 12px;
                margin-bottom: 6px;
                font-size: 13px;
                line-height: 1.5;
                box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
                border-left: 3px solid #FFD700;
                animation: fadeIn 0.3s ease;
            `;
            fishDiv.innerHTML = `
                <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
                    <span style="font-weight: 600; color: #FF8C00; font-size: 12px;">🐟 ${msg.fishName || 'Fish'}</span>
                </div>
                <div style="color: #333; text-align: left;">${escapeHtml(msg.message || '')}</div>
            `;
            chatMessages.appendChild(fishDiv);
        }
    }
    
    // 滚动到底部
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// 导出 Our Tank UI 函数到 window
window.showAddFishModal = showAddFishModal;
window.closeAddFishModal = closeAddFishModal;
window.addFishToOurTank = addFishToOurTank;
window.showMembersModal = showMembersModal;
window.closeMembersModal = closeMembersModal;
window.removeMemberFromTank = removeMemberFromTank;
window.showShareModal = showShareModal;
window.closeShareModal = closeShareModal;
window.copyInviteCode = copyInviteCode;
window.copyInviteLink = copyInviteLink;
window.loadOurTankChatHistory = loadOurTankChatHistory;
window.initOurTankChatSubscription = initOurTankChatSubscription;

// =====================================================
// End Our Tank UI Functions
// =====================================================

// =====================================================
// End Our Tank Functions
// =====================================================

// =====================================================
// End Private Tank Functions
// =====================================================

// Combined function to load tank with streaming capability
async function loadFishIntoTank(sortType = 'recent') {
    // Load initial fish
    await loadInitialFish(sortType);

    // Filter user's fish after loading - ensure only one user fish exists
    // Use multiple attempts to ensure filtering works correctly
    await filterUserFishToNewestOnly();
    setTimeout(async () => {
        await filterUserFishToNewestOnly();
    }, 2000); // Second attempt after 2 seconds
    setTimeout(async () => {
        await filterUserFishToNewestOnly();
    }, 4000); // Third attempt after 4 seconds

    // Set up real-time listener for new fish (only for recent mode)
    if (sortType === 'recent') {
        setupNewFishListener();
    }
}

// Export to window for external access
window.loadFishIntoTank = loadFishIntoTank;

window.addEventListener('DOMContentLoaded', async () => {
    // Initialize canvas - must be done after DOM is loaded
    swimCanvas = document.getElementById('swim-canvas');
    if (!swimCanvas) {
        console.error('❌ Canvas element not found!');
        return;
    }
    swimCtx = swimCanvas.getContext('2d');
    if (!swimCtx) {
        console.error('❌ Could not get canvas context!');
        return;
    }
    // 🔧 修复：设置Canvas的实际像素尺寸与显示尺寸匹配，确保图片清晰度
    const devicePixelRatio = window.devicePixelRatio || 1;
    const displayWidth = swimCanvas.clientWidth;
    const displayHeight = swimCanvas.clientHeight;
    
    // 设置Canvas的实际像素尺寸为显示尺寸 * 设备像素比
    swimCanvas.width = displayWidth * devicePixelRatio;
    swimCanvas.height = displayHeight * devicePixelRatio;
    
    // 设置Canvas的CSS显示尺寸
    swimCanvas.style.width = displayWidth + 'px';
    swimCanvas.style.height = displayHeight + 'px';
    
    // 缩放绘图上下文以匹配设备像素比
    swimCtx.scale(devicePixelRatio, devicePixelRatio);
    
    // 🔧 修复：标准化Canvas逻辑尺寸，确保两个鱼缸的游泳空间一致
    // 使用显示尺寸作为逻辑坐标系，而不是实际像素尺寸
    swimCanvas.logicalWidth = displayWidth;
    swimCanvas.logicalHeight = displayHeight;
    
    // 🔍 调试：详细记录Canvas信息
    console.log('✅ Canvas initialized with DPI fix:', {
        displaySize: `${displayWidth}x${displayHeight}`,
        canvasSize: `${swimCanvas.width}x${swimCanvas.height}`,
        devicePixelRatio: devicePixelRatio,
        scaleFactor: devicePixelRatio,
        viewMode: VIEW_MODE,
        canvasStyle: {
            width: swimCanvas.style.width,
            height: swimCanvas.style.height
        },
        actualRatio: `${swimCanvas.width / displayWidth}x${swimCanvas.height / displayHeight}`
    });
    
    // Variables are already initialized at top level, no need to reinitialize
    
    // Initialize Fish Dialogue System (Phase 0)
    if (typeof SimpleFishDialogueManager !== 'undefined') {
        fishDialogueManager = new SimpleFishDialogueManager(swimCanvas, swimCtx);
        console.log('✅ Fish dialogue system initialized');
    }
    
    // Initialize Tank Layout Manager (Community Chat System)
    if (typeof TankLayoutManager !== 'undefined') {
        tankLayoutManager = new TankLayoutManager(swimCanvas, swimCtx);
        communityChatManager = new CommunityChatManager(tankLayoutManager, fishes);
        
        // Export to window for testing and external access
        window.tankLayoutManager = tankLayoutManager;
        window.communityChatManager = communityChatManager;
        
        console.log(`✅ Tank Layout Manager initialized: ${tankLayoutManager.rows.length} rows for canvas ${swimCanvas.width}x${swimCanvas.height}`);
        console.log('✅ Community Chat Manager initialized');
        
        // Initialize group chat based on environment variable and user preference
        initializeGroupChat();
    }
    
    // Try to get elements from bottom controls, fallback to sidebar
    const sortSelect = document.getElementById('tank-sort') || document.getElementById('tank-sort-sidebar');
    const refreshButton = document.getElementById('refresh-tank') || document.getElementById('refresh-tank-sidebar');

    // Check for URL parameters to set initial sort and capacity
    const sortParam = tankUrlParams.get('sort');
    const capacityParam = tankUrlParams.get('capacity');
    
    // 🆕 读取上次的排序选择（持久化）
    const savedSort = localStorage.getItem('tankSortPreference') || 'random';
    
    // 优先级：URL参数 > localStorage > 默认值(random)
    let initialSort = sortParam || savedSort;

    // Validate sort parameter and set dropdown
    if (initialSort && ['recent', 'popular', 'random'].includes(initialSort)) {
        if (sortSelect) {
            sortSelect.value = initialSort;
        }
    } else {
        // 如果无效，使用默认值
        initialSort = 'random';
    }
    
    console.log(`🔧 Initial sort: ${initialSort} (from ${sortParam ? 'URL' : savedSort !== 'random' ? 'localStorage' : 'default'})`);

    // Initialize capacity from URL parameter (if present), otherwise use default (20)
    if (capacityParam) {
        const capacity = parseInt(capacityParam);
        if (capacity >= 1 && capacity <= 100) {
            maxTankCapacity = capacity;
        }
    } else {
        // No URL parameter, ensure we use the default value (20)
        maxTankCapacity = 20;
    }
    
    // Ensure slider and display are synchronized with maxTankCapacity
    let fishCountSlider = document.getElementById('fish-count-slider');
    if (fishCountSlider) {
        fishCountSlider.value = maxTankCapacity;
    }
    
    // Also sync with sidebar selector if it exists
    const fishCountSelector = document.getElementById('fish-count-selector-sidebar');
    if (fishCountSelector) {
        // Find closest value to current capacity
        const options = [10, 20, 30, 40, 50];
        let closest = options[0];
        let minDiff = Math.abs(maxTankCapacity - options[0]);
        for (let i = 1; i < options.length; i++) {
            const diff = Math.abs(maxTankCapacity - options[i]);
            if (diff < minDiff) {
                minDiff = diff;
                closest = options[i];
            }
        }
        fishCountSelector.value = closest.toString();
        console.log(`🔧 Initialized fish count selector to: ${closest}`);
        
        // 🔧 添加change事件监听器
        fishCountSelector.addEventListener('change', (e) => {
            const newCapacity = parseInt(e.target.value);
            console.log(`🐠 Fish count selector changed from ${maxTankCapacity} to: ${newCapacity}`);
            updateTankCapacity(newCapacity);
        });
        console.log(`✅ Fish count selector event listener registered`);
    }
    
    const displayElement = document.getElementById('fish-count-display');
    if (displayElement) {
        displayElement.textContent = maxTankCapacity;
    }
    
    console.log(`🐠 Initialized tank capacity: ${maxTankCapacity}`);
    console.log(`🐠 About to load fish with capacity: ${maxTankCapacity}`);

    // Update page title based on view mode and initial selection
    updatePageTitle(initialSort);

    // =====================================================
    // Private Tank Mode: Hide/Disable Global Controls
    // =====================================================
    if (VIEW_MODE === 'my') {
        console.log('🔧 Configuring UI for Private Tank mode...');
        
        // Hide sort selector (not applicable in private mode)
        if (sortSelect) {
            sortSelect.style.display = 'none';
            const sortContainer = sortSelect.closest('div');
            if (sortContainer) sortContainer.style.display = 'none';
        }
        
        // Hide fish count selector (not applicable in private mode)
        const fishCountSelector = document.getElementById('fish-count-selector-sidebar');
        if (fishCountSelector) {
            fishCountSelector.style.display = 'none';
            const countContainer = fishCountSelector.closest('div');
            if (countContainer) countContainer.style.display = 'none';
        }
        
        // Hide fish count slider if exists
        const fishCountSlider = document.getElementById('fish-count-slider');
        if (fishCountSlider) {
            fishCountSlider.style.display = 'none';
            const sliderContainer = fishCountSlider.closest('div');
            if (sliderContainer) sliderContainer.style.display = 'none';
        }
        
        console.log('✅ Private Tank UI configured');
    }
    // =====================================================
    // End Private Tank Mode Configuration
    // =====================================================

    // Handle sort change (only if element exists and not in private mode)
    if (sortSelect && VIEW_MODE !== 'my') {
        sortSelect.addEventListener('change', () => {
            const selectedSort = sortSelect.value;
            
            // 🆕 保存排序选择到 localStorage
            localStorage.setItem('tankSortPreference', selectedSort);
            console.log(`💾 Saved sort preference: ${selectedSort}`);

            // Clean up existing listener before switching modes
            if (newFishListener) {
                clearInterval(newFishListener);
                newFishListener = null;
            }

            loadFishIntoTank(selectedSort);

            // Update page title based on selection
            updatePageTitle(selectedSort);

            // Update URL without reloading the page
            const newUrl = new URL(window.location);
            newUrl.searchParams.set('sort', selectedSort);
            window.history.replaceState({}, '', newUrl);
        });
    }

    // Handle refresh button (only if element exists)
    if (refreshButton) {
        refreshButton.addEventListener('click', () => {
            console.log(`🔄 Refresh button clicked! Current maxTankCapacity: ${maxTankCapacity}`);
            if (VIEW_MODE === 'my') {
                // Private Tank mode - reload private fish
                loadPrivateFish();
            } else {
                // Global Tank mode - reload with current sort
                const selectedSort = sortSelect ? sortSelect.value : initialSort;
                console.log(`🔄 Reloading tank with sort: ${selectedSort}, capacity: ${maxTankCapacity}`);
                loadFishIntoTank(selectedSort);
            }
        });
    }

    // Handle fish count selector (sidebar dropdown)
    if (fishCountSelector && VIEW_MODE !== 'my') {
        fishCountSelector.addEventListener('change', (e) => {
            const newCapacity = parseInt(e.target.value);
            console.log(`🐠 Fish count selector changed to: ${newCapacity}`);
            updateTankCapacity(newCapacity);
        });
    }

    // Handle fish count slider (reuse the variable declared above)
    if (!fishCountSlider) {
        fishCountSlider = document.getElementById('fish-count-slider');
    }
    if (fishCountSlider) {
        // Use debounced function for input events (for real-time display updates)
        const debouncedUpdateCapacity = debounce((newCapacity) => {
            updateTankCapacity(newCapacity);
        }, 300); // 300ms delay

        // Update display immediately but debounce the actual capacity change
        fishCountSlider.addEventListener('input', (e) => {
            const newCapacity = parseInt(e.target.value);

            // Update display immediately
            const displayElement = document.getElementById('fish-count-display');
            if (displayElement) {
                displayElement.textContent = newCapacity;
            }

            // Debounce the actual fish loading
            debouncedUpdateCapacity(newCapacity);
        });

        // Also handle the change event for when user stops dragging
        fishCountSlider.addEventListener('change', (e) => {
            const newCapacity = parseInt(e.target.value);
            updateTankCapacity(newCapacity);
        });

        // Initialize the display (but don't reload fish, just update UI)
        const displayElement = document.getElementById('fish-count-display');
        if (displayElement) {
            displayElement.textContent = maxTankCapacity;
        }
    }

    // Load initial fish based on view mode
    if (VIEW_MODE === 'my') {
        // Private Tank mode - require authentication with retry mechanism
        console.log('🔐 Private Tank mode - checking authentication...');
        
        // 🔧 修复：增加重试机制，解决登录后立即跳转时的时序问题
        let isAuthenticated = false;
        let retryCount = 0;
        const maxRetries = 5;
        const retryDelay = 500; // 500ms
        
        while (!isAuthenticated && retryCount < maxRetries) {
            if (retryCount > 0) {
                console.log(`🔄 Authentication check retry ${retryCount}/${maxRetries}...`);
                await new Promise(resolve => setTimeout(resolve, retryDelay));
            }
            
            // 优先使用auth-cache的同步检测
            if (window.authCache && window.authCache.isLoggedIn) {
                isAuthenticated = window.authCache.isLoggedIn();
                if (isAuthenticated) {
                    console.log('✅ Authentication confirmed via auth-cache');
                    break;
                }
            }
            
            // 备用：使用requireAuthentication函数
            if (typeof requireAuthentication === 'function') {
                try {
                    isAuthenticated = await requireAuthentication(false); // 不立即重定向
                    if (isAuthenticated) {
                        console.log('✅ Authentication confirmed via requireAuthentication');
                        break;
                    }
                } catch (error) {
                    console.log(`⚠️ Authentication check error (retry ${retryCount}):`, error);
                }
            }
            
            // 最后备用：检查localStorage token
            const token = localStorage.getItem('userToken');
            if (token && window.supabaseAuth) {
                try {
                    const user = await window.supabaseAuth.getCurrentUser();
                    if (user) {
                        isAuthenticated = true;
                        console.log('✅ Authentication confirmed via Supabase getCurrentUser');
                        break;
                    }
                } catch (error) {
                    console.log(`⚠️ Supabase getCurrentUser error (retry ${retryCount}):`, error);
                }
            }
            
            retryCount++;
        }
        
        if (!isAuthenticated) {
            console.log('❌ Authentication failed after retries, showing login modal...');
            if (window.authUI && window.authUI.showLoginModal) {
                window.authUI.showLoginModal();
                return;
            } else {
                // 备用：重定向到登录页面
                window.location.href = '/login.html?redirect=' + encodeURIComponent(window.location.href);
                return;
            }
        }
        
        console.log('✅ Authenticated, loading private fish...');
        await loadPrivateFish();
    } else if (VIEW_MODE === 'our') {
        // Our Tank mode (好友鱼缸) - require authentication with retry mechanism
        console.log('🐟 Our Tank mode - checking authentication...');
        
        if (!OUR_TANK_ID) {
            console.error('❌ Our Tank mode requires tankId parameter');
            window.location.href = '/our-tank-list.html';
            return;
        }
        
        // 🔧 增加重试机制，解决登录后立即跳转时的时序问题
        let isAuthenticated = false;
        let retryCount = 0;
        const maxRetries = 5;
        const retryDelay = 500; // 500ms
        
        while (!isAuthenticated && retryCount < maxRetries) {
            if (retryCount > 0) {
                console.log(`🔄 Our Tank auth check retry ${retryCount}/${maxRetries}...`);
                await new Promise(resolve => setTimeout(resolve, retryDelay));
            }
            
            // 优先使用auth-cache的同步检测
            if (window.authCache && window.authCache.isLoggedIn) {
                isAuthenticated = window.authCache.isLoggedIn();
                if (isAuthenticated) {
                    console.log('✅ Our Tank: Authentication confirmed via auth-cache');
                    break;
                }
            }
            
            // 使用 supabaseAuth 检查
            if (window.supabaseAuth) {
                try {
                    const user = await window.supabaseAuth.getCurrentUser();
                    if (user) {
                        isAuthenticated = true;
                        console.log('✅ Our Tank: User authenticated:', user.email || user.id);
                        break;
                    }
                } catch (error) {
                    console.log(`⚠️ Our Tank auth check error (retry ${retryCount}):`, error);
                }
            }
            
            retryCount++;
        }
        
        if (!isAuthenticated) {
            console.log('❌ Our Tank: Not authenticated, redirecting to login...');
            window.location.href = '/login.html?redirect=' + encodeURIComponent(window.location.href);
            return;
        }
        
        console.log('✅ Authenticated, loading Our Tank fish...');
        await loadOurTankFish();
        
        // 检查是否有 addFish 参数（从绘画页面跳转过来自动添加鱼）
        const addFishId = tankUrlParams.get('addFish');
        if (addFishId) {
            console.log('🎯 [Auto Add Fish] 检测到 addFish 参数:', addFishId);
            // 清除 URL 参数，避免刷新时重复添加
            const newUrl = new URL(window.location.href);
            newUrl.searchParams.delete('addFish');
            window.history.replaceState({}, document.title, newUrl.toString());
            
            // 延迟执行添加，确保鱼缸已完全加载
            setTimeout(async () => {
                await autoAddFishToOurTank(addFishId);
            }, 500);
        }
    } else {
        // Global Tank mode - normal loading
        console.log('🌊 Global Tank mode - loading fish...');
        await loadFishIntoTank(initialSort);
    }
    
    // Update fish count display after initial load
    setTimeout(() => {
        updateCurrentFishCount();
    }, 1000); // Wait 1 second for images to load

    // Resize canvas to full screen
    resizeForMobile();
    window.addEventListener('resize', resizeForMobile);
    
    // Also listen to visualViewport changes for mobile browsers
    if (window.visualViewport) {
        window.visualViewport.addEventListener('resize', resizeForMobile);
        window.visualViewport.addEventListener('scroll', resizeForMobile);
    }
    
    // Force resize after a short delay to ensure proper initialization
    setTimeout(() => {
        resizeForMobile();
    }, 100);
    
    // Initialize background bubbles
    createBackgroundBubbles();
    
    // Set up canvas event listeners
    if (swimCanvas) {
        swimCanvas.addEventListener('mousedown', handleFishTap);
        
        // Add right-click support for feeding
        swimCanvas.addEventListener('contextmenu', (e) => {
            e.preventDefault(); // Prevent context menu
            handleTankTap(e);
        });
        
        // Enhanced mobile touch support
        swimCanvas.addEventListener('touchstart', (e) => {
            touchStartTime = Date.now();
            const rect = swimCanvas.getBoundingClientRect();
            touchStartPos = {
                x: e.touches[0].clientX - rect.left,
                y: e.touches[0].clientY - rect.top
            };
        });
        
        swimCanvas.addEventListener('touchend', (e) => {
            e.preventDefault(); // Prevent default mobile behavior
            const currentTime = Date.now();
            const touchDuration = currentTime - touchStartTime;
            const rect = swimCanvas.getBoundingClientRect();
            const tapX = e.changedTouches[0].clientX - rect.left;
            const tapY = e.changedTouches[0].clientY - rect.top;

            // Check if finger moved significantly during touch
            const moveDistance = Math.sqrt(
                Math.pow(tapX - touchStartPos.x, 2) +
                Math.pow(tapY - touchStartPos.y, 2)
            );

            // Long press for feeding (500ms+ and minimal movement)
            if (touchDuration >= 500 && moveDistance < 20) {
                dropFoodPellet(tapX, tapY);
                return;
            }

            // Double tap for feeding
            if (currentTime - lastTapTime < 300 && moveDistance < 20) { // Double tap within 300ms
                dropFoodPellet(tapX, tapY);
                return;
            }

            // Single tap - check for fish interaction first, then handle tank tap
            // Create a mock event for handleFishTap with correct coordinates
            const mockEvent = {
                clientX: rect.left + tapX,
                clientY: rect.top + tapY,
                touches: null // Indicate this is from touch end
            };

            handleFishTap(mockEvent);
            lastTapTime = currentTime;
        });
        
        console.log('✅ Canvas event listeners attached');
    }
    
    // Start the animation loop
    console.log('🎬 Starting animation loop...');
    requestAnimationFrame(animateFishes);

    // Clean up listener when page is unloaded
    window.addEventListener('beforeunload', () => {
        if (newFishListener) {
            clearInterval(newFishListener);
            newFishListener = null;
        }
    });
});

function showFishInfoModal(fish) {
    let imgDataUrl;
    let modalWidth = 400;
    let modalHeight = 240;
    
    // 如果有原始图片 URL，直接使用原始图片以获得最佳清晰度
    if (fish.imageUrl) {
        imgDataUrl = fish.imageUrl;
        modalWidth = 500;
        modalHeight = 300;
    } else {
        // 备用方案：从 fishCanvas 生成
        const canvasScaleFactor = 6;
        const fishImgCanvas = document.createElement('canvas');
        fishImgCanvas.width = fish.width * canvasScaleFactor;
        fishImgCanvas.height = fish.height * canvasScaleFactor;
        const ctx = fishImgCanvas.getContext('2d');
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.scale(canvasScaleFactor, canvasScaleFactor);
        ctx.drawImage(fish.fishCanvas, 0, 0);
        imgDataUrl = fishImgCanvas.toDataURL('image/png');
        const displayScaleFactor = 3;
        modalWidth = Math.min(200, fish.width) * displayScaleFactor;
        modalHeight = Math.min(150, fish.height) * displayScaleFactor;
    }

    const isCurrentUserFish = isUserFish(fish);
    const userToken = localStorage.getItem('userToken');
    const showFavoriteButton = userToken && !isCurrentUserFish;

    const artistName = fish.artist || 'Anonymous';
    const userId = fish.userId;
    const artistLink = userId 
        ? `<a href="profile.html?userId=${encodeURIComponent(userId)}" target="_blank" style="color: #4A90E2; text-decoration: none; font-weight: 600;">${escapeHtml(artistName)}</a>`
        : escapeHtml(artistName);

    const fishName = fish.fish_name || fish.fishName || fish.name || fish.title || `Fish #${fish.docId?.substring(0, 8) || 'Unknown'}`;
    const isMobile = window.innerWidth <= 768;

    // 统一按钮样式 - 白色圆角按钮带阴影，3个按钮一行
    const btnStyle = `
        flex: 1;
        padding: 10px 8px;
        border: none;
        border-radius: 20px;
        cursor: pointer;
        font-size: 13px;
        font-weight: 600;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 4px;
        transition: all 0.2s ease;
        background: linear-gradient(180deg, #FFFFFF 0%, #F5F5F5 100%);
        color: #4A90E2;
        box-shadow: 0 3px 0 rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.8);
        border-bottom: 2px solid #E0E0E0;
    `;

    // 使用与登录弹窗一致的风格
    let info = `<div class="modal-title-banner">
        <h2>🐟 ${escapeHtml(fishName)}</h2>
    </div>
    <button class="modal-close-btn" aria-label="Close">&times;</button>
    <div class="modal-content-area" style="padding: 16px;">`;

    // 鱼图片 - 加大显示
    const imgStyle = isMobile
        ? `display: block; margin: 0 auto 12px; max-width: min(${Math.min(modalWidth, 280)}px, 75vw); max-height: min(${Math.min(modalHeight, 180)}px, 30vh); width: auto; height: auto; object-fit: contain;`
        : `display: block; margin: 0 auto 12px; max-width: ${Math.min(modalWidth, 320)}px; max-height: ${Math.min(modalHeight, 200)}px; width: auto; height: auto; object-fit: contain;`;
    
    info += `<img src='${imgDataUrl}' style='${imgStyle}' alt='Fish'>`;

    // 作者信息 - 压缩间距
    info += `<p style="text-align: center; color: #888; margin-bottom: 12px; font-size: 13px;">by ${artistLink}</p>`;

    // 按钮区域 - 3个按钮一行，颜色统一
    info += `<div style="display: flex; gap: 8px; margin-bottom: 12px;">`;
    
    // Like button - 初始状态，稍后会检查用户是否已点赞
    info += `<button class="vote-btn upvote-btn" id="upvote-btn-${fish.docId}" onclick="handleVote('${fish.docId}', 'up', this)" style="${btnStyle}">`;
    info += `👍 <span class="vote-count upvote-count">${fish.upvotes || 0}</span>`;
    info += `</button>`;
    
    // Add to My Tank button - 始终显示（如果用户已登录且不是自己的鱼）
    if (showFavoriteButton) {
        info += `<button class="add-to-tank-btn" id="add-tank-btn-${fish.docId}" onclick="if(typeof handleAddToMyTank === 'function') handleAddToMyTank('${fish.docId}', event);" style="${btnStyle}">`;
        info += `⭐`;
        info += `</button>`;
    }
    
    // Report button
    info += `<button class="report-btn" onclick="handleReport('${fish.docId}')" style="${btnStyle}">`;
    info += `🚩`;
    info += `</button>`;
    
    info += `</div>`;

    // Messages section
    info += `<div id="fish-messages-container" style="text-align: left;"></div>`;

    info += `</div>`;

    // 为鱼信息模态框添加更大的宽度类
    showModal(info, () => { }, { addWideClass: true });
    
    // 检查用户是否已经点赞，并更新按钮状态
    if (fish.docId && typeof checkUserVote === 'function') {
        checkUserVote(fish.docId).then(voteStatus => {
            const upvoteBtn = document.getElementById(`upvote-btn-${fish.docId}`);
            if (upvoteBtn && voteStatus.hasVoted) {
                // 用户已点赞，更新按钮样式
                upvoteBtn.style.background = 'linear-gradient(180deg, #4CAF50 0%, #45a049 100%)';
                upvoteBtn.style.color = 'white';
                upvoteBtn.dataset.hasVoted = 'true';
                upvoteBtn.title = '点击取消点赞';
            }
        }).catch(err => {
            console.warn('检查投票状态失败:', err);
        });
    }
    
    // Load messages after modal is shown (only if MessageUI is available)
    setTimeout(() => {
        const messagesContainer = document.getElementById('fish-messages-container');
        if (!messagesContainer) return;
        
        if (typeof MessageUI !== 'undefined' && fish.docId) {
            try {
                MessageUI.renderMessagesSection('fish-messages-container', 'to_fish', fish.docId, {
                    showForm: true,
                    showFishInfo: false,
                    showDeleteBtn: true,
                    title: '💬 Messages'
                });
            } catch (error) {
                console.warn('MessageUI error:', error);
                // 隐藏消息容器，避免显示错误信息
                messagesContainer.style.display = 'none';
            }
        } else {
            // MessageUI 未加载或 fish.docId 不存在，隐藏消息容器
            messagesContainer.style.display = 'none';
        }
    }, 100);
}

// Tank-specific vote handler using shared utilities
function handleVote(fishId, voteType, button) {
    handleVoteGeneric(fishId, voteType, button, (result, voteType) => {
        // Find the fish in the fishes array and update it
        const fish = fishes.find(f => f.docId === fishId);
        if (fish) {
            // Update fish upvotes based on response
            if (result.upvotes !== undefined) {
                fish.upvotes = result.upvotes;
            } else if (result.updatedFish && result.updatedFish.upvotes !== undefined) {
                fish.upvotes = result.updatedFish.upvotes;
            } else if (result.action === 'upvote') {
                fish.upvotes = (fish.upvotes || 0) + 1;
            } else if (result.action === 'cancel_upvote') {
                fish.upvotes = Math.max(0, (fish.upvotes || 0) - 1);
            }

            // Update the modal display with new counts
            const upvoteCount = document.querySelector('.modal-controls .upvote-count');
            const upvotesDisplay = document.querySelector('.modal-upvotes');

            if (upvoteCount) upvoteCount.textContent = fish.upvotes || 0;
            if (upvotesDisplay) upvotesDisplay.textContent = fish.upvotes || 0;
            
            // Update button style based on action
            const upvoteBtn = document.getElementById(`upvote-btn-${fishId}`);
            if (upvoteBtn) {
                if (result.action === 'upvote') {
                    // 用户刚点赞，更新为已点赞样式
                    upvoteBtn.style.background = 'linear-gradient(180deg, #4CAF50 0%, #45a049 100%)';
                    upvoteBtn.style.color = 'white';
                    upvoteBtn.dataset.hasVoted = 'true';
                    upvoteBtn.title = '点击取消点赞';
                } else if (result.action === 'cancel_upvote') {
                    // 用户取消点赞，恢复默认样式
                    upvoteBtn.style.background = 'linear-gradient(180deg, #FFFFFF 0%, #F5F5F5 100%)';
                    upvoteBtn.style.color = '#4A90E2';
                    upvoteBtn.dataset.hasVoted = 'false';
                    upvoteBtn.title = '点赞';
                }
                // 更新按钮内的计数
                const countSpan = upvoteBtn.querySelector('.upvote-count');
                if (countSpan) {
                    countSpan.textContent = fish.upvotes || 0;
                }
            }
        }
    });
}

// Tank-specific report handler using shared utilities  
function handleReport(fishId, button) {
    handleReportGeneric(fishId, button);
}

// Handle Add to My Tank click
async function handleAddToMyTank(fishId, event) {
    if (event) event.stopPropagation();
    
    const button = document.getElementById(`add-tank-btn-${fishId}`);
    if (!button) return;
    
    // Check if user is logged in - 使用缓存快速检测
    const isLoggedIn = window.authCache && window.authCache.isLoggedIn();
    if (!isLoggedIn) {
        if (typeof FishTankFavorites !== 'undefined' && FishTankFavorites.showToast) {
            FishTankFavorites.showToast('Please login to add fish to your tank', 'info');
        } else {
            alert('Please login to add fish to your tank');
        }
        return;
    }
    
    // 获取 token（如果缓存检测通过，token 应该存在）
    const userToken = localStorage.getItem('userToken');
    
    try {
        button.disabled = true;
        const originalHTML = button.innerHTML;
        button.innerHTML = '⏳ Adding...';
        
        // Check if already in tank
        const isFav = typeof FishTankFavorites !== 'undefined' 
            ? await FishTankFavorites.isFavorite(fishId)
            : false;
        
        if (isFav) {
            // Remove from tank
            if (typeof FishTankFavorites !== 'undefined') {
                await FishTankFavorites.removeFromFavorites(fishId);
            }
            button.innerHTML = '🐟 Add to My Tank';
            button.style.background = 'linear-gradient(180deg, #4A90E2 0%, #357ABD 50%, #2C5F8F 100%)';
            if (typeof FishTankFavorites !== 'undefined' && FishTankFavorites.showToast) {
                FishTankFavorites.showToast('Removed from your tank');
            }
        } else {
            // Add to tank
            const API_BASE = typeof BACKEND_URL !== 'undefined' ? BACKEND_URL : '';
            const response = await fetch(`${API_BASE}/api/fish-api?action=favorite`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${userToken}`
                },
                body: JSON.stringify({ fishId })
            });

            const data = await response.json();
            
            if (response.status === 403) {
                // Tank limit reached - show upgrade modal
                showUpgradeModal({
                    title: '🐟 Tank is Full!',
                    message: data.message || 'You have reached your tank limit',
                    currentCount: data.currentCount || 0,
                    maxLimit: data.maxLimit || 5,
                    tier: data.tier || 'free',
                    memberTypeName: data.memberTypeName || 'Free',
                    upgradeUrl: data.upgradeUrl || '/membership.html'
                });
                button.innerHTML = originalHTML;
            } else if (response.ok) {
                // Success
                button.innerHTML = '✅ In My Tank';
                button.style.background = 'linear-gradient(180deg, #6FE77D 0%, #4CD964 50%, #3CB54A 100%)';
                if (typeof FishTankFavorites !== 'undefined' && FishTankFavorites.showToast) {
                    FishTankFavorites.showToast('Fish added to your tank! 🎉');
                }
                // Update cache if available
                if (typeof FishTankFavorites !== 'undefined' && FishTankFavorites.initializeCache) {
                    await FishTankFavorites.initializeCache();
                }
            } else {
                throw new Error(data.error || 'Failed to add fish to tank');
            }
        }
        
    } catch (error) {
        console.error('Error adding to tank:', error);
        if (typeof FishTankFavorites !== 'undefined' && FishTankFavorites.showToast) {
            FishTankFavorites.showToast(error.message || 'Failed to add fish to tank', 'error');
        } else {
            alert(error.message || 'Failed to add fish to tank');
        }
        button.innerHTML = '🐟 Add to My Tank';
        button.style.background = 'linear-gradient(180deg, #4A90E2 0%, #357ABD 50%, #2C5F8F 100%)';
    } finally {
        button.disabled = false;
    }
}

// Show upgrade modal when tank limit is reached
function showUpgradeModal({ title, message, currentCount, maxLimit, tier, memberTypeName, upgradeUrl }) {
    const benefits = {
        free: [
            { plan: 'Plus', limit: 20, features: ['20 fish slots', 'AI chat features'] },
            { plan: 'Premium', limit: 100, features: ['100 fish slots', 'All Plus features', 'Custom chat frequency'] }
        ],
        plus: [
            { plan: 'Premium', limit: 100, features: ['100 fish slots', 'Custom chat frequency', 'Priority support'] }
        ]
    };
    
    const tierBenefits = benefits[tier] || [];
    
    const modalHTML = `
        <div style="padding: 20px; max-width: 500px;">
            <h2 style="margin: 0 0 15px 0; color: #333; font-size: 24px;">${title}</h2>
            <p style="margin: 0 0 20px 0; color: #666; line-height: 1.6;">${message}</p>
            
            <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                    <span style="font-weight: 600; color: #333;">Current:</span>
                    <span style="color: #666;">${currentCount}/${maxLimit} fish</span>
                </div>
                <div style="display: flex; justify-content: space-between;">
                    <span style="font-weight: 600; color: #333;">Your Plan:</span>
                    <span style="color: #666; text-transform: capitalize;">${memberTypeName}</span>
                </div>
            </div>
            
            ${tierBenefits.length > 0 ? `
            <div style="margin-bottom: 20px;">
                <h3 style="margin: 0 0 15px 0; color: #333; font-size: 18px;">Upgrade Benefits:</h3>
                ${tierBenefits.map(benefit => `
                    <div style="background: white; border: 2px solid #4A90E2; border-radius: 8px; padding: 15px; margin-bottom: 10px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                            <span style="font-weight: 700; color: #4A90E2; font-size: 16px;">${benefit.plan}</span>
                            <span style="color: #666; font-weight: 600;">${benefit.limit} fish slots</span>
                        </div>
                        <ul style="margin: 0; padding-left: 20px; color: #666;">
                            ${benefit.features.map(f => `<li style="margin: 5px 0;">${f}</li>`).join('')}
                        </ul>
                    </div>
                `).join('')}
            </div>
            ` : ''}
            
            <div style="display: flex; gap: 10px; justify-content: flex-end;">
                <button onclick="this.closest('.modal').remove()" 
                    style="padding: 10px 20px; border: 2px solid #ddd; background: white; border-radius: 6px; cursor: pointer; font-weight: 600; color: #666;">
                    Maybe Later
                </button>
                <button onclick="window.location.href='${upgradeUrl || '/membership.html'}'" 
                    style="padding: 10px 20px; border: none; background: linear-gradient(180deg, #4A90E2 0%, #357ABD 100%); color: white; border-radius: 6px; cursor: pointer; font-weight: 700; box-shadow: 0 2px 4px rgba(74, 144, 226, 0.3);">
                    Upgrade Now
                </button>
            </div>
        </div>
    `;
    
    showModal(modalHTML, null, { title: title });
}

// Make functions globally available for onclick handlers
window.handleVote = handleVote;
window.handleReport = handleReport;
window.handleAddToMyTank = handleAddToMyTank;

function showModal(html, onClose, options = {}) {
    // 教程期间不显示弹窗，避免干扰教程
    if (window.onboardingManager && window.onboardingManager.isOnboarding && window.onboardingManager.isOnboarding()) {
        console.log('[Modal] 教程进行中，跳过弹窗显示');
        return { close: () => {} };
    }
    
    let modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.cssText = `
      display: flex;
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.7);
      backdrop-filter: blur(8px);
      z-index: 10001;
      align-items: center;
      justify-content: center;
      animation: fadeIn 0.3s ease;
    `;

    const modalContent = document.createElement('div');
    modalContent.className = 'modal-content';
    
    // 检测HTML中是否包含标题横幅
    const hasTitleBannerInHtml = html.includes('modal-title-banner');
    
    // 如果提供了标题，添加标题横幅
    if (options.title) {
        modalContent.classList.add('has-title-banner');
        const titleBanner = document.createElement('div');
        titleBanner.className = 'modal-title-banner';
        titleBanner.innerHTML = `<h2>${options.title}</h2>`;
        modalContent.appendChild(titleBanner);
    } else if (hasTitleBannerInHtml) {
        // 如果HTML中已包含标题横幅，也添加has-title-banner类
        modalContent.classList.add('has-title-banner');
    }
    
    // 创建内容区域
    const contentArea = document.createElement('div');
    if (options.title || hasTitleBannerInHtml) {
        contentArea.className = 'modal-content-area';
    } else {
        contentArea.style.cssText = 'padding: 32px; position: relative; z-index: 1;';
    }
    
    // 如果HTML中包含标题横幅，需要把它提取出来放到modalContent顶部
    let processedHtml = html;
    if (hasTitleBannerInHtml && !options.title) {
        // 提取标题横幅
        const titleBannerMatch = html.match(/<div class="modal-title-banner">[\s\S]*?<\/div>/);
        if (titleBannerMatch) {
            // 创建标题横幅元素
            const titleBanner = document.createElement('div');
            titleBanner.innerHTML = titleBannerMatch[0];
            modalContent.appendChild(titleBanner.firstChild);
            // 从HTML中移除标题横幅
            processedHtml = html.replace(titleBannerMatch[0], '');
        }
        
        // 提取关闭按钮
        const closeBtnMatch = processedHtml.match(/<button class="modal-close-btn"[\s\S]*?<\/button>/);
        if (closeBtnMatch) {
            const closeBtn = document.createElement('div');
            closeBtn.innerHTML = closeBtnMatch[0];
            modalContent.appendChild(closeBtn.firstChild);
            processedHtml = processedHtml.replace(closeBtnMatch[0], '');
        }
    }
    
    // Add close button if not already present in HTML
    if (!html.includes('class="close"') && !html.includes("class='close'") && !html.includes('modal-close-btn')) {
        const closeBtn = document.createElement('button');
        closeBtn.className = 'modal-close-btn';
        closeBtn.innerHTML = '×';
        closeBtn.title = 'Close';
        modalContent.appendChild(closeBtn);
    }
    
    contentArea.innerHTML = processedHtml;
    modalContent.appendChild(contentArea);

    // Add top gloss effect
    const gloss = document.createElement('div');
    gloss.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 50%;
      background: linear-gradient(180deg, rgba(255, 255, 255, 0.3), rgba(255, 255, 255, 0));
      border-radius: 32px 32px 0 0;
      pointer-events: none;
      z-index: 1;
    `;
    modalContent.appendChild(gloss);

    modal.appendChild(modalContent);

    function close() {
        modal.style.animation = 'fadeOut 0.3s ease';
        setTimeout(() => {
            if (modal.parentNode) {
                document.body.removeChild(modal);
            }
            if (onClose) onClose();
        }, 300);
    }
    
    // Add close button click handler
    const closeBtn = modalContent.querySelector('.close, .modal-close-btn');
    if (closeBtn) {
        closeBtn.addEventListener('click', close);
    }
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) close();
    });
    
    // 如果需要添加宽模态框类
    if (options.addWideClass) {
        modalContent.classList.add('wide');
    }
    
    document.body.appendChild(modal);
    return { close, modal };
}

function handleTankTap(e) {
    // 检查是否刚刚点击了鱼（防止事件延迟触发）
    if (window.lastFishClickTime && (Date.now() - window.lastFishClickTime) < 100) {
        return; // 100ms 内不执行移动逻辑
    }
    
    let rect = swimCanvas.getBoundingClientRect();
    let tapX, tapY;
    if (e.touches && e.touches.length > 0) {
        tapX = e.touches[0].clientX - rect.left;
        tapY = e.touches[0].clientY - rect.top;
    } else {
        tapX = e.clientX - rect.left;
        tapY = e.clientY - rect.top;
    }

    // 检查是否点击到了鱼，如果点击到了鱼就不执行喂食逻辑
    const time = Date.now() / 500;
    for (let i = fishes.length - 1; i >= 0; i--) {
        const fish = fishes[i];
        if (fish.isDying) continue;

        const fishX = fish.x;
        let fishY = fish.y;

        // Account for swimming animation
        const foodDetectionData = foodDetectionCache.get(fish.docId || `fish_${i}`);
        const hasNearbyFood = foodDetectionData ? foodDetectionData.hasNearbyFood : false;
        const currentAmplitude = hasNearbyFood ? fish.amplitude * 0.3 : fish.amplitude;
        fishY = fish.y + Math.sin(time + fish.phase) * currentAmplitude;

        // Check if tap is within fish bounds (增加一些容差，避免边缘点击误判)
        const padding = 5; // 5像素容差
        if (
            tapX >= fishX - padding && tapX <= fishX + fish.width + padding &&
            tapY >= fishY - padding && tapY <= fishY + fish.height + padding
        ) {
            // 点击到了鱼，不执行喂食逻辑，并阻止事件传播
            if (e.preventDefault) e.preventDefault();
            if (e.stopPropagation) e.stopPropagation();
            if (e.stopImmediatePropagation) e.stopImmediatePropagation();
            // 记录点击时间，防止后续事件触发移动
            window.lastFishClickTime = Date.now();
            return;
        }
    }

    // 点击空白处 → 在点击位置投放食物，最近的鱼会游过来吃
    // Drop food at click position - nearest fish will swim towards it
    dropFoodPellet(tapX, tapY);
    if (e.preventDefault) e.preventDefault();
}

function handleFishTap(e) {
    // 如果新手引导正在进行中，不处理鱼的点击（不显示鱼卡片）
    // 但仍然允许喂鱼操作（通过 handleTankTap）
    if (window.onboardingManager && window.onboardingManager.getDriverInstance && window.onboardingManager.getDriverInstance()) {
        // 在新手引导期间，直接调用喂鱼逻辑
        handleTankTap(e);
        return;
    }
    
    let rect = swimCanvas.getBoundingClientRect();
    let tapX, tapY;

    // Handle different event types
    if (e.touches && e.touches.length > 0) {
        // Touch event with active touches
        tapX = e.touches[0].clientX - rect.left;
        tapY = e.touches[0].clientY - rect.top;
    } else if (e.changedTouches && e.changedTouches.length > 0) {
        // Touch end event
        tapX = e.changedTouches[0].clientX - rect.left;
        tapY = e.changedTouches[0].clientY - rect.top;
    } else {
        // Mouse event
        tapX = e.clientX - rect.left;
        tapY = e.clientY - rect.top;
    }


    // Check if tap hit any fish (iterate from top to bottom)
    for (let i = fishes.length - 1; i >= 0; i--) {
        const fish = fishes[i];

        // Use base position (fish.y) for hit detection instead of animated position
        // This makes the click target stable and easier to hit
        const fishX = fish.x;
        const fishY = fish.y;

        const isWithinBounds = tapX >= fishX && tapX <= fishX + fish.width &&
                              tapY >= fishY && tapY <= fishY + fish.height;

        // Check if tap is within fish bounds
        if (isWithinBounds) {
            // Calculate the current animated swimY for freezing
            const time = Date.now() / 500;
            let frozenSwimY = fish.y;
            
            if (!fish.isDying) {
                const foodDetectionData = window.foodDetectionCache.get(fish.docId || `fish_${i}`);
                const hasNearbyFood = foodDetectionData ? foodDetectionData.hasNearbyFood : false;
                const currentAmplitude = hasNearbyFood ? fish.amplitude * 0.3 : fish.amplitude;
                frozenSwimY = fish.y + Math.sin(time + fish.phase) * currentAmplitude;
            }
            
            // 标记鱼被点击，冻结游泳动画
            fish.isClicked = true;
            fish.clickedAt = Date.now();
            fish.frozenSwimY = frozenSwimY; // 保存点击时的 swimY
            
            showFishInfoModal(fish);
            return; // Found a fish, don't handle tank tap
        }
    }

    // No fish was hit, handle tank tap
    handleTankTap(e);
}

// Canvas event listeners will be set up in DOMContentLoaded after canvas is initialized
// Do not add listeners here as canvas may not exist yet

// Enhanced mobile touch support
let lastTapTime = 0;
let touchStartTime = 0;
let touchStartPos = { x: 0, y: 0 };

// Touch event listeners will be set up in DOMContentLoaded after canvas is initialized

function resizeForMobile() {
    if (!swimCanvas) {
        console.warn('Cannot resize: canvas not initialized');
        return;
    }
    
    const isMobile = window.innerWidth <= 768;
    const oldWidth = swimCanvas.width;
    const oldHeight = swimCanvas.height;

    // Get actual viewport dimensions
    // For mobile, use window.innerHeight which excludes browser UI
    // For better mobile support, we can also use visualViewport if available
    let viewportHeight = window.innerHeight;
    let viewportWidth = window.innerWidth;
    
    if (window.visualViewport) {
        viewportHeight = window.visualViewport.height;
        viewportWidth = window.visualViewport.width;
    }

    // 🔧 修复：应用DPI修复到resize函数，确保图片清晰度
    const devicePixelRatio = window.devicePixelRatio || 1;
    
    // Set canvas actual pixel size with DPI scaling
    swimCanvas.width = viewportWidth * devicePixelRatio;
    swimCanvas.height = viewportHeight * devicePixelRatio;
    
    // Set canvas CSS display size
    swimCanvas.style.width = viewportWidth + 'px';
    swimCanvas.style.height = viewportHeight + 'px';
    swimCanvas.style.position = 'fixed';
    swimCanvas.style.top = '0';
    swimCanvas.style.left = '0';
    
    // Scale drawing context to match device pixel ratio
    if (swimCtx) {
        swimCtx.scale(devicePixelRatio, devicePixelRatio);
    }
    
    // 🔧 修复：设置逻辑尺寸，确保两个鱼缸的游泳空间一致
    swimCanvas.logicalWidth = viewportWidth;
    swimCanvas.logicalHeight = viewportHeight;

    console.log(`🐠 Canvas resized with DPI fix: display ${viewportWidth}x${viewportHeight}, actual ${swimCanvas.width}x${swimCanvas.height} (${isMobile ? 'mobile' : 'desktop'}, DPR: ${devicePixelRatio})`);

    // 🔧 重新初始化TankLayoutManager以适应新的canvas尺寸
    // 这样可以根据新的屏幕大小重新计算行数
    if (oldWidth > 0 && oldHeight > 0) {
        const widthChange = Math.abs(oldWidth - swimCanvas.width) / oldWidth;
        const heightChange = Math.abs(oldHeight - swimCanvas.height) / oldHeight;

        // 如果尺寸变化超过20%，重新初始化layout manager
        if (heightChange > 0.2) {
            console.log('🔄 Significant height change detected, reinitializing TankLayoutManager...');
            
            if (typeof TankLayoutManager !== 'undefined') {
                const oldRowCount = tankLayoutManager ? tankLayoutManager.rows.length : 0;
                tankLayoutManager = new TankLayoutManager(swimCanvas, swimCtx);
                window.tankLayoutManager = tankLayoutManager;
                
                console.log(`✅ TankLayoutManager reinitialized: ${oldRowCount} → ${tankLayoutManager.rows.length} rows`);
                
                // 重新分配所有鱼到新的行
                if (fishes.length > 0) {
                    // 重置行分配计数器
                    nextFishRowIndex = 0;
                    
                    // 为每条鱼重新分配行
                    fishes.forEach((fish, index) => {
                        if (tankLayoutManager.rows.length > 0) {
                            const targetRowIndex = index % tankLayoutManager.rows.length;
                            const targetRow = tankLayoutManager.rows[targetRowIndex];
                            
                            fish.rowIndex = targetRowIndex;
                            fish.yMin = targetRow.swimYMin;
                            fish.yMax = targetRow.swimYMax;
                            
                            // 调整Y坐标到新行的范围内
                            if (fish.y < targetRow.swimYMin || fish.y > targetRow.swimYMax) {
                                fish.y = targetRow.swimYMin + Math.random() * (targetRow.swimYMax - targetRow.swimYMin);
                            }
                        }
                    });
                    
                    console.log(`✅ Reassigned ${fishes.length} fish to ${tankLayoutManager.rows.length} rows after resize`);
                }
            }
        }

        // Rescale if size changed by more than 20%
        if (widthChange > 0.2 || heightChange > 0.2) {
            rescaleAllFish();
        }
    }
}
// Canvas resize will be set up in DOMContentLoaded after canvas is initialized
// Do not call resizeForMobile here as canvas may not exist yet

// Optimize performance by caching food detection calculations
// Initialize these at the top level to avoid TDZ issues
// Use window object to ensure they're accessible everywhere
window.foodDetectionCache = window.foodDetectionCache || new Map();
window.cacheUpdateCounter = window.cacheUpdateCounter || 0;
window.lastFishCountUpdate = window.lastFishCountUpdate || 0;

let foodDetectionCache = window.foodDetectionCache;
let cacheUpdateCounter = window.cacheUpdateCounter;
let lastFishCountUpdate = window.lastFishCountUpdate;

function animateFishes() {
    // Check if canvas is initialized
    if (!swimCanvas || !swimCtx || swimCanvas.width === 0 || swimCanvas.height === 0) {
        console.warn('Canvas not initialized, skipping animation frame');
        requestAnimationFrame(animateFishes);
        return;
    }
    
    // Use window object to ensure variables are accessible
    // Initialize if not already done
    if (typeof window.lastFishCountUpdate === 'undefined') {
        window.lastFishCountUpdate = 0;
    }
    if (!window.foodDetectionCache) {
        window.foodDetectionCache = new Map();
    }
    if (typeof window.cacheUpdateCounter === 'undefined') {
        window.cacheUpdateCounter = 0;
    }
    if (typeof window.lastRowCheckTime === 'undefined') {
        window.lastRowCheckTime = 0;
    }
    
    // 🔧 自动修复机制：定期检查并修复未分配行号的鱼
    const now = Date.now();
    if (now - window.lastRowCheckTime > 500 && tankLayoutManager && tankLayoutManager.rows && tankLayoutManager.rows.length > 0) {
        window.lastRowCheckTime = now;
        
        // 检查是否有鱼没有rowIndex
        const unassignedFish = fishes.filter(f => f.rowIndex === undefined);
        
        if (unassignedFish.length > 0) {
            console.log(`🔧 发现 ${unassignedFish.length} 条鱼未分配行号，立即修复...`);
            
            // 统计当前每行的鱼数
            const rows = tankLayoutManager.rows;
            const rowCounts = new Array(rows.length).fill(0);
            fishes.forEach(f => {
                if (f.rowIndex !== undefined && f.rowIndex >= 0 && f.rowIndex < rows.length) {
                    rowCounts[f.rowIndex]++;
                }
            });
            
            // 为未分配的鱼分配行号
            unassignedFish.forEach((fish, idx) => {
                // 找到鱼数最少的行
                const minCount = Math.min(...rowCounts);
                const availableRows = rowCounts
                    .map((count, i) => count === minCount ? i : -1)
                    .filter(i => i >= 0);
                const targetRow = availableRows[Math.floor(Math.random() * availableRows.length)];
                
                fish.rowIndex = targetRow;
                const row = rows[targetRow];
                fish.yMin = row.swimYMin;
                fish.yMax = row.swimYMax;
                
                // 调整Y坐标到正确的行范围
                if (fish.y < row.swimYMin || fish.y > row.swimYMax) {
                    fish.y = row.swimYMin + Math.random() * (row.swimYMax - row.swimYMin);
                }
                
                rowCounts[targetRow]++;
                console.log(`  ✅ Fish ${fishes.indexOf(fish)} assigned to row ${targetRow}`);
            });
            
            console.log(`✅ 修复完成，每行鱼数:`, rowCounts);
        }
    }
    
    // 🔧 修复：在每次动画帧开始时设置高质量渲染，确保图片清晰度
    swimCtx.imageSmoothingEnabled = true;
    swimCtx.imageSmoothingQuality = 'high';
    
    // Draw ocean gradient background directly on canvas
    const gradient = swimCtx.createLinearGradient(0, 0, 0, swimCanvas.height);
    gradient.addColorStop(0, '#B2EBF2');
    gradient.addColorStop(0.3, '#4FC3F7');
    gradient.addColorStop(0.7, '#0288D1');
    gradient.addColorStop(1, '#01579B');
    swimCtx.fillStyle = gradient;
    swimCtx.fillRect(0, 0, swimCanvas.width, swimCanvas.height);
    
    const time = Date.now() / 500;
    const currentTime = Date.now();

    // Update fish count display every 2 seconds
    if (currentTime - window.lastFishCountUpdate > 2000) {
        updateCurrentFishCount();
        window.lastFishCountUpdate = currentTime;
    }

    // Update food pellets
    updateFoodPellets();

    // Clear food detection cache every few frames to prevent stale data
    window.cacheUpdateCounter++;
    if (window.cacheUpdateCounter % 5 === 0) {
        window.foodDetectionCache.clear();
    }

    for (const fish of fishes) {
        // Handle entrance animation
        if (fish.isEntering) {
            const elapsed = Date.now() - fish.enterStartTime;
            const progress = Math.min(elapsed / fish.enterDuration, 1);

            // Fade in and scale up
            fish.opacity = progress;
            fish.scale = 0.3 + (progress * 0.7); // Scale from 0.3 to 1.0

            // Remove entrance flag when done
            if (progress >= 1) {
                fish.isEntering = false;
                fish.opacity = 1;
                fish.scale = 1;
            }
        }

        // 检查鱼的健康值，如果已死亡但还没开始死亡动画，启动死亡动画
        if (!fish.isDying && !fish.isEntering && window.isBattleMode) {
            const fishHealth = fish.health !== undefined ? fish.health : (fish.max_health || 100);
            const isAlive = fish.is_alive !== undefined ? fish.is_alive : true;
            
            if (!isAlive || fishHealth <= 0) {
                console.log(`☠️ 检测到死亡的鱼: ${fish.artist || fish.docId} (health: ${fishHealth}, is_alive: ${isAlive})`);
                
                // 启动死亡动画
                fish.isDying = true;
                fish.deathStartTime = Date.now();
                fish.deathDuration = 2000;
                fish.originalY = fish.y;
                fish.opacity = 1;
                fish.direction = -Math.abs(fish.direction);
                fish.health = 0;
                fish.is_alive = false;
                
                // 2秒后移除
                const deadFishId = fish.docId || fish.id;
                setTimeout(() => {
                    const index = fishes.findIndex(f => (f.docId || f.id) === deadFishId);
                    if (index !== -1) {
                        fishes.splice(index, 1);
                        console.log(`🗑️ 已自动移除死亡的鱼 (ID: ${deadFishId})`);
                    }
                }, 2000);
            }
        }
        
        // Handle death animation
        if (fish.isDying) {
            const elapsed = Date.now() - fish.deathStartTime;
            const progress = Math.min(elapsed / fish.deathDuration, 1);

            // Fade out
            fish.opacity = 1 - progress;

            // Fall down
            fish.y = fish.originalY + (progress * progress * 200); // Accelerating fall

            // Slow down horizontal movement
            fish.speed = fish.speed * (1 - progress * 0.5);
        } else if (!fish.isEntering) {
            // Check if fish is clicked and frozen
            const isClickedAndFrozen = fish.isClicked && fish.clickedAt && (Date.now() - fish.clickedAt < 5000);
            
            if (!isClickedAndFrozen) {
                // Normal fish behavior (only if not entering and not clicked)
                // Use cached food detection to improve performance
                const fishId = fish.docId || `fish_${fishes.indexOf(fish)}`;
                let foodDetectionData = window.foodDetectionCache.get(fishId);

                if (!foodDetectionData) {
                    // Calculate food detection data and cache it
                    const fishCenterX = fish.x + fish.width / 2;
                    const fishCenterY = fish.y + fish.height / 2;

                    let nearestFood = null;
                    let nearestDistance = FOOD_DETECTION_RADIUS;
                    let hasNearbyFood = false;

                    // Optimize: Only check active food pellets
                    const activePellets = foodPellets.filter(p => !p.consumed);

                    // Find nearest food pellet using more efficient distance calculation
                    for (const pellet of activePellets) {
                        const dx = pellet.x - fishCenterX;
                        const dy = pellet.y - fishCenterY;

                        // Use squared distance for initial comparison (more efficient)
                        const distanceSquared = dx * dx + dy * dy;
                        const radiusSquared = FOOD_DETECTION_RADIUS * FOOD_DETECTION_RADIUS;

                        if (distanceSquared < radiusSquared) {
                            hasNearbyFood = true;

                            // Only calculate actual distance if within radius
                            const distance = Math.sqrt(distanceSquared);
                            if (distance < nearestDistance) {
                                nearestFood = pellet;
                                nearestDistance = distance;
                            }
                        }
                    }

                    foodDetectionData = {
                        nearestFood,
                        nearestDistance,
                        hasNearbyFood,
                        fishCenterX,
                        fishCenterY
                    };

                    window.foodDetectionCache.set(fishId, foodDetectionData);
                }

                // Initialize velocity if not set
                if (!fish.vx) fish.vx = 0;
                if (!fish.vy) fish.vy = 0;

                // 🔧 修复：改为目标速度而不是累加速度，避免速度无限增长
                const targetVx = fish.speed * fish.direction * 0.6; // 速度加1倍：从0.3到0.6
                const vxDiff = targetVx - fish.vx;
                fish.vx += vxDiff * 0.4; // 收敛速度也加1倍：从0.2到0.4
                

                // Apply food attraction using cached data
                if (foodDetectionData.nearestFood) {
                    const dx = foodDetectionData.nearestFood.x - foodDetectionData.fishCenterX;
                    const dy = foodDetectionData.nearestFood.y - foodDetectionData.fishCenterY;
                    const distance = foodDetectionData.nearestDistance;

                    if (distance > 0) {
                        // Calculate attraction force (stronger when closer, with smooth falloff)
                        const distanceRatio = distance / FOOD_DETECTION_RADIUS;
                        const attractionStrength = FOOD_ATTRACTION_FORCE * (1 - distanceRatio * distanceRatio);

                        // Apply force towards food more gently
                        fish.vx += (dx / distance) * attractionStrength;
                        fish.vy += (dy / distance) * attractionStrength;

                        // Update fish direction to face the food (but not too abruptly)
                        if (Math.abs(dx) > 10) { // Only change direction if food is significantly left/right
                            fish.direction = dx > 0 ? 1 : -1;
                        }
                    }
                }

                // Always move based on velocity
                fish.x += fish.vx;
                fish.y += fish.vy;

                // Handle edge collisions BEFORE applying friction
                let hitEdge = false;

                // 🔧 修复：使用逻辑尺寸进行边界检测，确保两个鱼缸的游泳空间一致
                const logicalWidth = swimCanvas.logicalWidth || swimCanvas.width;
                const logicalHeight = swimCanvas.logicalHeight || swimCanvas.height;
                
                // Left and right edges
                if (fish.x <= 0) {
                    fish.x = 0;
                    fish.direction = 1; // Face right
                    fish.vx = Math.abs(fish.vx); // Ensure velocity points right
                    hitEdge = true;
                } else if (fish.x >= logicalWidth - fish.width) {
                    fish.x = logicalWidth - fish.width;
                    fish.direction = -1; // Face left
                    fish.vx = -Math.abs(fish.vx); // Ensure velocity points left
                    hitEdge = true;
                }

                // Top and bottom edges
                if (fish.y <= 0) {
                    fish.y = 0;
                    fish.vy = Math.abs(fish.vy) * 0.5; // Bounce off top, but gently
                    hitEdge = true;
                } else if (fish.y >= logicalHeight - fish.height) {
                    fish.y = logicalHeight - fish.height;
                    fish.vy = -Math.abs(fish.vy) * 0.5; // Bounce off bottom, but gently
                    hitEdge = true;
                }

                // Apply friction - less when attracted to food
                const frictionFactor = foodDetectionData.hasNearbyFood ? 0.88 : 0.85;
                fish.vx *= frictionFactor;
                fish.vy *= frictionFactor;

                // 🔧 修复：调整最大速度限制到合理范围
                const maxVel = fish.speed * 2.0; // 速度加1倍：从1.0到2.0
                const velMag = Math.sqrt(fish.vx * fish.vx + fish.vy * fish.vy);
                if (velMag > maxVel) {
                    fish.vx = (fish.vx / velMag) * maxVel;
                    fish.vy = (fish.vy / velMag) * maxVel;
                }

                // 🔧 修复：调整最小速度保证，与目标速度系统一致
                const minVx = fish.speed * fish.direction * 0.3; // 速度加1倍：从0.15到0.3
                if (Math.abs(fish.vx) < Math.abs(minVx)) {
                    fish.vx = minVx;
                }

                // 🔧 修复：调整边缘推力到合理范围
                if (hitEdge) {
                    fish.vx += fish.speed * fish.direction * 0.2; // 速度加1倍：从0.1到0.2
                    // Add small random vertical component to avoid getting stuck
                    fish.vy += (Math.random() - 0.5) * 0.4; // 速度加1倍：从0.2到0.4
                }
            }
        }

        // Calculate swim position - reduce sine wave when fish is attracted to food
        let swimY;
        if (fish.isDying) {
            swimY = fish.y;
        } else if (fish.isClicked && fish.clickedAt) {
            // 如果鱼被点击了，检查是否在冻结期内
            const timeSinceClick = Date.now() - fish.clickedAt;
            if (timeSinceClick < 5000) {
                // 5秒内使用冻结的 swimY，完全静止
                swimY = fish.frozenSwimY !== undefined ? fish.frozenSwimY : fish.y;
            } else {
                // 5秒后恢复游泳动画
                fish.isClicked = false;
                fish.clickedAt = null;
                fish.frozenSwimY = null;
                
                const fishId = fish.docId || `fish_${fishes.indexOf(fish)}`;
                const foodDetectionData = window.foodDetectionCache.get(fishId);
                const hasNearbyFood = foodDetectionData ? foodDetectionData.hasNearbyFood : false;
                const currentAmplitude = hasNearbyFood ? fish.amplitude * 0.3 : fish.amplitude;
                swimY = fish.y + Math.sin(time + fish.phase) * currentAmplitude;
            }
        } else {
            // Use cached food detection data for swim animation
            const fishId = fish.docId || `fish_${fishes.indexOf(fish)}`;
            const foodDetectionData = window.foodDetectionCache.get(fishId);
            const hasNearbyFood = foodDetectionData ? foodDetectionData.hasNearbyFood : false;

            // Reduce sine wave amplitude when attracted to food for more realistic movement
            const currentAmplitude = hasNearbyFood ? fish.amplitude * 0.3 : fish.amplitude;
            swimY = fish.y + Math.sin(time + fish.phase) * currentAmplitude;
        }
        
        drawWigglingFish(fish, fish.x, swimY, fish.direction, time, fish.phase);
        
        // 👑 绘制新鱼的皇冠特效（在鱼绘制之后，这样皇冠在上层）
        if (fish.isNewlyCreated) {
            const now = Date.now();
            const elapsed = now - (fish.createdDisplayTime || now);
            
            // 特效持续60秒
            if (elapsed < 60000) {
                const centerX = fish.x + fish.width / 2;
                const crownY = swimY - 20; // 使用 swimY 而不是 fish.y，跟随鱼的波动
                
                swimCtx.save();
                
                // 设置字体
                swimCtx.font = 'bold 24px Arial';
                swimCtx.textAlign = 'center';
                swimCtx.textBaseline = 'middle';
                
                // 添加金色光晕效果
                swimCtx.shadowColor = 'rgba(255, 215, 0, 0.8)';
                swimCtx.shadowBlur = 8;
                
                // 绘制皇冠 emoji
                swimCtx.fillText('👑', centerX, crownY);
                
                swimCtx.restore();
            } else {
                // 60秒后移除标记
                delete fish.isNewlyCreated;
                delete fish.createdDisplayTime;
                console.log(`⏰ New fish crown effect expired for fish: ${fish.docId}`);
            }
        }
    }

    // Render food pellets
    renderFoodPellets();

    // Render food consumption effects
    renderFoodEffects();

    // Render feeding effects
    renderFeedingEffects();

    // Update and draw fish dialogues (Phase 0 - Simple System)
    if (fishDialogueManager && !tankLayoutManager) {
        fishDialogueManager.updateDialogues(fishes);
        fishDialogueManager.drawDialogues();
    }
    
    // Render community chat dialogues (New System)
    if (tankLayoutManager) {
        tankLayoutManager.renderDialogues();
    }

    requestAnimationFrame(animateFishes);
}

function drawWigglingFish(fish, x, y, direction, time, phase) {
    const src = fish.fishCanvas;
    const w = fish.width;
    const h = fish.height;
    const tailEnd = Math.floor(w * fish.peduncle);

    // 移除用户自己的鱼的金光效果（两个鱼缸都不显示）
    // const isCurrentUserFish = isUserFish(fish);
    // 金光效果已移除，所有鱼统一显示

    // 启用高质量图片平滑，确保清晰度
    swimCtx.imageSmoothingEnabled = true;
    swimCtx.imageSmoothingQuality = 'high';

    // Set opacity for dying or entering fish
    if ((fish.isDying || fish.isEntering) && fish.opacity !== undefined) {
        swimCtx.globalAlpha = fish.opacity;
    }

    // Calculate scale for entering fish
    const scale = fish.scale || 1;

    for (let i = 0; i < w; i++) {
        let isTail, t, wiggle, drawCol, drawX;
        if (direction === 1) {
            isTail = i < tailEnd;
            t = isTail ? (tailEnd - i - 1) / (tailEnd - 1) : 0;
            wiggle = isTail ? Math.sin(time * 3 + phase + t * 2) * t * 12 : 0;
            drawCol = i;
            drawX = x + i + wiggle;
        } else {
            isTail = i >= w - tailEnd;
            t = isTail ? (i - (w - tailEnd)) / (tailEnd - 1) : 0;
            wiggle = isTail ? Math.sin(time * 3 + phase + t * 2) * t * 12 : 0;
            drawCol = w - i - 1;
            drawX = x + i - wiggle;
        }
        swimCtx.save();
        swimCtx.translate(drawX, y);

        // Apply scale for entering fish
        if (fish.isEntering && scale !== 1) {
            swimCtx.scale(scale, scale);
        }

        // Flip upside down for dying fish
        if (fish.isDying) {
            swimCtx.scale(1, -1);
        }

        swimCtx.drawImage(src, drawCol, 0, 1, h, 0, 0, 1, h);
        swimCtx.restore();
    }

    // Reset opacity
    if ((fish.isDying || fish.isEntering) && fish.opacity !== undefined) {
        swimCtx.globalAlpha = 1;
    }
}

// ==========================================
// Chat UI Management
// ==========================================

// Update chat list display
function updateChatUI(chatSession) {
    const chatMessages = document.getElementById('chat-messages');
    const chatStatus = document.getElementById('chat-status');
    
    if (!chatMessages) return;
    
    // 设置当前活跃会话ID
    if (chatSession.sessionId) {
        currentActiveSessionId = chatSession.sessionId;
    }
    
    // 更新状态
    if (chatStatus) {
        chatStatus.textContent = `${chatSession.topic} 🎭`;
        chatStatus.style.color = '#6366F1';
    }
    
    
    // 创建聊天会话卡片
    const sessionCard = document.createElement('div');
    sessionCard.className = 'session-card';
    sessionCard.style.cssText = `
        background: transparent;
        border-radius: 12px;
        padding: 15px;
        margin-bottom: 12px;
        animation: slideIn 0.5s ease;
    `;
    
    // 会话标题
    const titleDiv = document.createElement('div');
    titleDiv.style.cssText = `
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 10px;
    `;
    
    // 计算消息总数（包括用户消息）
    let totalMessages = chatSession.dialogues?.length || 0;
    if (chatSession.userTalk) {
        try {
            const userTalkArray = typeof chatSession.userTalk === 'string' 
                ? JSON.parse(chatSession.userTalk) 
                : chatSession.userTalk;
            if (Array.isArray(userTalkArray)) {
                userTalkArray.forEach(userMsg => {
                    totalMessages += 1; // 用户消息
                    if (userMsg.aiReplies && Array.isArray(userMsg.aiReplies)) {
                        totalMessages += userMsg.aiReplies.length; // AI回复
                    }
                });
            }
        } catch (error) {
            console.warn('解析user_talk失败:', error);
        }
    }
    
    titleDiv.innerHTML = `
        <span style="font-weight: 600; color: #6366F1; font-size: 14px;">${chatSession.topic}</span>
        <span style="font-size: 11px; color: #999;">${totalMessages} messages</span>
    `;
    sessionCard.appendChild(titleDiv);
    
    // 创建消息容器
    const messagesContainer = document.createElement('div');
    messagesContainer.className = 'session-messages';
    sessionCard.appendChild(messagesContainer);
    
    // 显示鱼的群聊消息 - 逐个添加以实现动画效果
    if (chatSession.dialogues && chatSession.dialogues.length > 0) {
        // 按sequence排序，确保消息按正确顺序显示
        const sortedDialogues = [...chatSession.dialogues].sort((a, b) => (a.sequence || 0) - (b.sequence || 0));
        sortedDialogues.forEach((msg, index) => {
            // 使用setTimeout来逐个添加消息，与气泡消息同步
            setTimeout(() => {
                const messageDiv = document.createElement('div');
                messageDiv.style.cssText = `
                    background: white;
                    border-radius: 8px;
                    padding: 8px 12px;
                    margin-bottom: 6px;
                    font-size: 13px;
                    line-height: 1.5;
                    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
                    opacity: 0;
                    transform: translateY(10px);
                    transition: all 0.3s ease;
                `;
                
                // 根据personality设置颜色
                const personalityColors = {
                    cheerful: '#FF9800',
                    shy: '#2196F3',
                    brave: '#E91E63',
                    lazy: '#9C27B0'
                };
                const color = personalityColors[msg.personality] || '#666';
                
                messageDiv.innerHTML = `
                    <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
                        <span style="font-weight: 600; color: ${color}; font-size: 12px;">🐟 ${msg.fishName || 'Unknown'}</span>
                        <span style="font-size: 10px; color: #999;">${msg.sequence || index + 1}</span>
                    </div>
                    <div style="color: #333; text-align: left;">${escapeHtml(msg.message)}</div>
                `;
                
                messagesContainer.appendChild(messageDiv);
                
                // 触发动画
                requestAnimationFrame(() => {
                    messageDiv.style.opacity = '1';
                    messageDiv.style.transform = 'translateY(0)';
                    
                    // 每次添加消息后自动滚动到底部
                    scrollChatToBottom();
                });
            }, index * 6000); // 每条消息间隔6000ms，与气泡消息同步
        });
    }
    
    // 显示用户对话消息
    if (chatSession.userTalk) {
        try {
            const userTalkArray = typeof chatSession.userTalk === 'string' 
                ? JSON.parse(chatSession.userTalk) 
                : chatSession.userTalk;
            
            if (Array.isArray(userTalkArray)) {
                userTalkArray.forEach((userMsg, userIndex) => {
                    // 显示用户消息
                    const userMessageDiv = document.createElement('div');
                    userMessageDiv.className = 'user-chat-message';
                    userMessageDiv.style.cssText = `
                        background: linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%);
                        border-radius: 8px;
                        padding: 8px 12px;
                        margin-bottom: 6px;
                        font-size: 13px;
                        line-height: 1.5;
                        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
                        border-left: 3px solid #6366F1;
                        animation: fadeIn 0.3s ease;
                    `;
                    
                    userMessageDiv.innerHTML = `
                        <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
                            <span style="font-weight: 600; color: #6366F1; font-size: 12px;">👤 ${escapeHtml(userMsg.userName || 'User')}</span>
                        </div>
                        <div style="color: #333; text-align: left;">${escapeHtml(userMsg.message)}</div>
                    `;
                    
                    messagesContainer.appendChild(userMessageDiv);
                    
                    // 显示AI回复
                    if (userMsg.aiReplies && Array.isArray(userMsg.aiReplies)) {
                        userMsg.aiReplies.forEach((reply, replyIndex) => {
                            const replyDiv = document.createElement('div');
                            replyDiv.style.cssText = `
                                background: white;
                                border-radius: 8px;
                                padding: 8px 12px;
                                margin-bottom: 6px;
                                font-size: 13px;
                                line-height: 1.5;
                                box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
                                animation: fadeIn 0.3s ease;
                            `;
                            
                            const personalityColors = {
                                cheerful: '#FF9800',
                                shy: '#2196F3',
                                brave: '#E91E63',
                                lazy: '#9C27B0'
                            };
                            const color = personalityColors[reply.personality] || '#666';
                            
                            replyDiv.innerHTML = `
                                <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
                                    <span style="font-weight: 600; color: ${color}; font-size: 12px;">🐟 ${escapeHtml(reply.fishName || 'Unknown')}</span>
                                </div>
                                <div style="color: #333; text-align: left;">${escapeHtml(reply.message)}</div>
                            `;
                            
                            messagesContainer.appendChild(replyDiv);
                        });
                    }
                });
            }
        } catch (error) {
            console.warn('解析或显示user_talk失败:', error);
        }
    }
    
    // 插入到底部，让新消息按时间顺序显示
    chatMessages.appendChild(sessionCard);
    
    // 限制显示最多3个会话，删除最旧的消息
    while (chatMessages.children.length > 3) {
        chatMessages.removeChild(chatMessages.firstChild);
    }
    
    // 自动滚动到底部，确保新消息可见
    scrollChatToBottom();
    
    // 添加动画样式（如果还没有）
    if (!document.getElementById('chat-animations')) {
        const style = document.createElement('style');
        style.id = 'chat-animations';
        style.textContent = `
            @keyframes slideIn {
                from {
                    opacity: 0;
                    transform: translateY(-10px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            #chat-messages::-webkit-scrollbar {
                width: 6px;
            }
            #chat-messages::-webkit-scrollbar-track {
                background: rgba(0, 0, 0, 0.05);
                border-radius: 3px;
            }
            #chat-messages::-webkit-scrollbar-thumb {
                background: rgba(99, 102, 241, 0.3);
                border-radius: 3px;
            }
            #chat-messages::-webkit-scrollbar-thumb:hover {
                background: rgba(99, 102, 241, 0.5);
            }
        `;
        document.head.appendChild(style);
    }
}

// 监听聊天事件
if (communityChatManager) {
    // 重写startSession方法来触发UI更新
    const originalStartSession = communityChatManager.startSession.bind(communityChatManager);
    communityChatManager.startSession = function(chatSession) {
        console.log('🎭 [Chat UI] 开始显示聊天:', chatSession);
        
        // 更新UI
        updateChatUI(chatSession);
        
        // 调用原始方法
        return originalStartSession(chatSession);
    };
}

// ==========================================
// User Chat Message Functions
// ==========================================

// 当前活跃的群聊会话ID
let currentActiveSessionId = null;

// 当前活跃的Coze对话ID（用于保持对话上下文）
let currentConversationId = null;

/**
 * 获取当前用户信息
 * @returns {Promise<{userId: string, userName: string} | null>}
 */
async function getCurrentUserInfo() {
    try {
        let userId = null;
        let userName = 'User';
        
        // 优先使用Supabase获取用户
        if (window.supabaseAuth && typeof window.supabaseAuth.getCurrentUser === 'function') {
            try {
                const user = await window.supabaseAuth.getCurrentUser();
                if (user && user.id) {
                    userId = user.id;
                    userName = user.user_metadata?.name || 
                              user.user_metadata?.nick_name || 
                              user.user_metadata?.full_name ||
                              user.email?.split('@')[0] || 
                              'User';
                    
                    // 尝试从数据库获取nick_name
                    try {
                        const backendUrl = window.BACKEND_URL || '';
                        const token = localStorage.getItem('userToken');
                        if (token) {
                            const profileResponse = await fetch(`${backendUrl}/api/profile/${encodeURIComponent(userId)}`, {
                                method: 'GET',
                                headers: {
                                    'Authorization': `Bearer ${token}`
                                }
                            });
                            
                            if (profileResponse.ok) {
                                const profileData = await profileResponse.json();
                                if (profileData.user) {
                                    if (profileData.user.nick_name) {
                                        userName = profileData.user.nick_name;
                                    }
                                }
                            }
                        }
                    } catch (error) {
                        console.warn('⚠️ 获取用户profile失败，使用默认名称:', error);
                    }
                    
                    return { userId, userName };
                }
            } catch (error) {
                console.warn('⚠️ Supabase获取用户信息失败:', error);
            }
        }
        
        // 回退到localStorage
        const userData = localStorage.getItem('userData');
        if (userData) {
            try {
                const parsed = JSON.parse(userData);
                userId = parsed.userId || parsed.uid || parsed.id;
                userName = parsed.name || parsed.nick_name || userName;
            } catch (error) {
                // Ignore error
            }
        }
        
        if (!userId) {
            userId = localStorage.getItem('userId');
        }
        
        return userId ? { userId, userName } : null;
    } catch (error) {
        console.error('获取用户信息失败:', error);
        return null;
    }
}

/**
 * 更新用户输入区域的显示状态
 */
async function updateUserChatInputVisibility() {
    const loginPrompt = document.getElementById('user-chat-login-prompt');
    const inputContainer = document.getElementById('user-chat-input-container');
    
    if (!loginPrompt || !inputContainer) return;
    
    const userInfo = await getCurrentUserInfo();
    
    if (userInfo) {
        // 用户已登录，显示输入框
        loginPrompt.style.display = 'none';
        inputContainer.style.display = 'block';
    } else {
        // 用户未登录，显示提示
        loginPrompt.style.display = 'block';
        inputContainer.style.display = 'none';
    }
}

/**
 * 发送用户消息
 */
async function sendUserChatMessage() {
    const input = document.getElementById('user-chat-input');
    const sendBtn = document.getElementById('user-chat-send-btn');
    const errorDiv = document.getElementById('user-chat-error');
    
    if (!input || !sendBtn) return;
    
    const message = input.value.trim();
    
    // 验证消息
    if (!message) {
        if (errorDiv) {
            errorDiv.textContent = 'Please enter a message';
            errorDiv.style.display = 'block';
            setTimeout(() => {
                errorDiv.style.display = 'none';
            }, 3000);
        }
        return;
    }
    
    if (message.length > 200) {
        if (errorDiv) {
            errorDiv.textContent = 'Message is too long (max 200 characters)';
            errorDiv.style.display = 'block';
            setTimeout(() => {
                errorDiv.style.display = 'none';
            }, 3000);
        }
        return;
    }
    
    // 获取用户信息
    const userInfo = await getCurrentUserInfo();
    if (!userInfo) {
        if (errorDiv) {
            errorDiv.textContent = 'Please log in to send messages';
            errorDiv.style.display = 'block';
            setTimeout(() => {
                errorDiv.style.display = 'none';
            }, 3000);
        }
        return;
    }
    
    // 禁用输入和按钮
    input.disabled = true;
    sendBtn.disabled = true;
    sendBtn.textContent = 'Sending...';
    
    // 隐藏错误提示
    if (errorDiv) {
        errorDiv.style.display = 'none';
    }
    
    try {
        // 获取当前sessionId（可能为null，后端会自动创建）
        const sessionId = currentActiveSessionId;
        
        // 立即显示用户消息（乐观更新）
        displayUserMessage(userInfo.userName, message);
        
        // 更新按钮文本
        sendBtn.textContent = 'Sending...';
        
        // 调用API发送消息（如果没有sessionId，后端会自动创建）
        console.log('************用户发送聊天请求************');
        console.log('[User Chat Frontend] 准备发送消息:', {
            message: message.substring(0, 50) + (message.length > 50 ? '...' : ''),
            sessionId: sessionId || '(将自动创建)',
            userId: userInfo.userId,
            userName: userInfo.userName
        });
        
        const token = localStorage.getItem('userToken');
        const headers = {
            'Content-Type': 'application/json'
        };
        
        // 如果有token，添加到Authorization header
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        
        // 获取当前鱼缸中的鱼ID（用于后端自动创建会话）
        // 使用与 community-chat-manager.js 相同的方式获取鱼ID
        let currentTankFishIds = (fishes || window.fishes || [])
            .filter(f => f && (f.id || f.docId))
            .map(f => f.id || f.docId)
            .filter(id => id !== null && id !== undefined);
        
        console.log('[User Chat Frontend] 获取到的鱼ID:', {
            fishesLength: (fishes || window.fishes || []).length,
            tankFishIdsCount: currentTankFishIds.length,
            tankFishIds: currentTankFishIds.slice(0, 5) // 只显示前5个用于调试
        });
        
        // 如果前端没有鱼ID，尝试从后端获取（可能是鱼还在加载中）
        if (currentTankFishIds.length === 0 && !sessionId) {
            console.log('[User Chat Frontend] 前端没有鱼ID，尝试从后端获取...');
            try {
                // 获取当前排序类型（默认 'recent'）
                const sortSelect = document.getElementById('tank-sort') || document.getElementById('tank-sort-sidebar');
                const sortType = sortSelect ? sortSelect.value : 'recent';
                
                // 从后端获取鱼数据
                const fishDocs = await getFishBySort(sortType, maxTankCapacity || 20);
                if (fishDocs && fishDocs.length > 0) {
                    currentTankFishIds = fishDocs
                        .map(doc => {
                            const data = typeof doc.data === 'function' ? doc.data() : (doc.data || doc);
                            return doc.id || data.id || data.fish_id;
                        })
                        .filter(id => id !== null && id !== undefined);
                    
                    console.log('[User Chat Frontend] 从后端获取到的鱼ID:', {
                        fishDocsCount: fishDocs.length,
                        tankFishIdsCount: currentTankFishIds.length,
                        tankFishIds: currentTankFishIds.slice(0, 5)
                    });
                }
            } catch (error) {
                console.warn('[User Chat Frontend] 从后端获取鱼ID失败:', error);
            }
        }
        
        const apiUrl = '/api/fish-api?action=user-chat-message';
        
        // 检查是否有鱼ID
        if (currentTankFishIds.length === 0) {
            throw new Error('无法发送消息：鱼缸中没有鱼。请先添加鱼到鱼缸，或等待鱼加载完成。');
        }
        
        const requestBody = {
            sessionId: sessionId, // 可能为null
            conversationId: currentConversationId, // Coze对话ID，用于保持上下文
            userMessage: message,
            userId: userInfo.userId,
            userName: userInfo.userName,
            tankFishIds: currentTankFishIds  // 总是传递tankFishIds
        };
        
        // Our Tank 模式：添加 ourTankId 参数
        if (VIEW_MODE === 'our' && OUR_TANK_ID) {
            requestBody.ourTankId = OUR_TANK_ID;
            console.log('[User Chat Frontend] Our Tank 模式，添加 ourTankId:', OUR_TANK_ID);
        }
        
        console.log('[User Chat Frontend] 发送消息到API:', {
            action: 'user-chat-message',
            url: apiUrl,
            sessionId: sessionId || '(将自动创建)',
            userId: userInfo.userId,
            userName: userInfo.userName,
            hasToken: !!token,
            messageLength: message.length,
            tankFishCount: currentTankFishIds.length,
            ourTankId: VIEW_MODE === 'our' ? OUR_TANK_ID : null
        });
        
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(requestBody)
        });
        
        console.log('[User Chat Frontend] API响应状态:', response.status, response.statusText);
        
        // 检查响应状态
        if (!response.ok) {
            const errorText = await response.text();
            console.error('[User Chat Frontend] API错误响应:', errorText);
            
            // 尝试解析错误响应中的详细信息
            let errorMessage = `API错误: ${response.status}`;
            try {
                const errorData = JSON.parse(errorText);
                // 提取详细错误信息
                errorMessage = errorData.details || errorData.message || errorData.error || errorMessage;
            } catch (e) {
                // 无法解析 JSON，使用原始错误文本
            }
            throw new Error(errorMessage);
        }
        
        const data = await response.json();
        console.log('[User Chat Frontend] API响应数据:', data);
        
        // 如果有调试信息，输出到浏览器console
        if (data.debug) {
            console.log(data.debug.message);
            console.log('[Parameters Test] 发送聊天请求（带parameters）');
            console.log(JSON.stringify(data.debug.cozeApiRequest, null, 2));
            if (data.debug.cozeApiResponse) {
                console.log('[Coze API Response]');
                console.log('Status:', data.debug.cozeApiResponse.status);
                console.log(JSON.stringify(data.debug.cozeApiResponse.body, null, 2));
            }
        }
        
        if (!response.ok) {
            // Handle HTTP errors
            if (response.status === 401) {
                throw new Error('Please log in to send messages');
            } else if (response.status === 404) {
                // Session not found - this shouldn't happen if we just created it
                // But if it does, reset session ID so next message will create a new one
                console.warn('Chat session not found, resetting session ID');
                currentActiveSessionId = null;
                throw new Error('Chat session expired. Please try sending your message again.');
            } else if (response.status === 403) {
                throw new Error('Permission denied');
            } else {
                throw new Error(data.error || data.message || `Server error: ${response.status}`);
            }
        }
        
        if (!data.success) {
            throw new Error(data.error || data.message || 'Failed to send message');
        }
        
        // 更新sessionId（如果后端创建了新会话）
        if (data.sessionId && data.sessionId !== currentActiveSessionId) {
            currentActiveSessionId = data.sessionId;
            console.log('[User Chat Frontend] ✅ 会话已创建/更新:', data.sessionId);
        }
        
        // 更新conversationId（如果后端返回了conversationId）
        if (data.conversationId) {
            if (!currentConversationId) {
                console.log('[User Chat Frontend] ✅ Coze对话已创建:', data.conversationId);
            } else if (data.conversationId !== currentConversationId) {
                console.log('[User Chat Frontend] ⚠️ Coze对话ID已更新:', data.conversationId);
            }
            currentConversationId = data.conversationId;
        }
        
        // 显示AI回复（与气泡同步，一条一条出现）
        if (data.aiReplies && data.aiReplies.length > 0) {
            data.aiReplies.forEach((reply, index) => {
                // 延迟显示，与气泡同步
                const delay = index * 3000; // 每条消息间隔3秒
                
                setTimeout(() => {
                    // 在聊天面板中显示
                    displayFishReply(reply);
                }, delay);
                
                // 在鱼缸中显示气泡对话
                displayFishBubble(reply, index);
            });
        } else {
            console.warn('No AI replies received');
        }
        
        // 清空输入框
        input.value = '';
        
        // 确保滚动到底部显示最新消息
        setTimeout(() => {
            scrollChatToBottom();
        }, 100);
        
    } catch (error) {
        console.error('发送消息失败:', error);
        if (errorDiv) {
            let errorMessage = 'Failed to send message. Please try again.';
            const errorStr = error.message || '';
            
            // 友好的错误提示映射
            if (errorStr.includes('No valid fish found') || errorStr.includes('No tank fish')) {
                errorMessage = '🐟 No fish available to chat with. Try refreshing the page!';
            } else if (errorStr.includes('limit') || errorStr.includes('quota') || errorStr.includes('exceeded')) {
                errorMessage = '💬 Daily chat limit reached! Upgrade to Plus for unlimited chats.';
                // 显示升级提示
                if (typeof showUpgradeModal === 'function') {
                    showUpgradeModal('chat_limit');
                }
            } else if (errorStr.includes('Unauthorized') || errorStr.includes('401')) {
                errorMessage = '🔐 Please log in to chat with fish.';
            } else if (errorStr.includes('too long')) {
                errorMessage = '📝 Message is too long. Please keep it under 200 characters.';
            } else if (error.message) {
                // 其他错误，简化显示
                errorMessage = error.message.replace(/API错误: \d+ /, '');
            }
            
            errorDiv.textContent = errorMessage;
            errorDiv.style.display = 'block';
            
            // 3秒后自动隐藏错误提示
            setTimeout(() => {
                errorDiv.style.display = 'none';
            }, 5000);
        }
        // 移除已显示的用户消息（因为发送失败）
        removeLastUserMessage();
    } finally {
        // 恢复输入和按钮
        input.disabled = false;
        sendBtn.disabled = false;
        sendBtn.textContent = 'Send';
        input.focus();
    }
}

/**
 * 显示用户消息
 */
function displayUserMessage(userName, message) {
    const chatMessages = document.getElementById('chat-messages');
    if (!chatMessages) {
        console.error('[displayUserMessage] ❌ chat-messages container not found!');
        return;
    }
    
    // 确保chat-messages容器可见
    if (chatMessages.style.display === 'none') {
        chatMessages.style.display = 'block';
    }
    chatMessages.style.visibility = 'visible';
    chatMessages.style.opacity = '1';
    
    const messageDiv = document.createElement('div');
    messageDiv.className = 'user-chat-message';
    // 确保消息立即可见，不使用可能延迟的动画
    messageDiv.style.cssText = `
        background: linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%);
        border-radius: 8px;
        padding: 8px 12px;
        margin-bottom: 6px;
        font-size: 13px;
        line-height: 1.5;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
        border-left: 3px solid #6366F1;
        display: block !important;
        visibility: visible !important;
        opacity: 1 !important;
        position: relative;
        width: 100%;
        box-sizing: border-box;
    `;
    
    messageDiv.innerHTML = `
        <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
            <span style="font-weight: 600; color: #6366F1; font-size: 12px;">👤 ${userName}</span>
        </div>
        <div style="color: #333; text-align: left;">${escapeHtml(message)}</div>
    `;
    
    // 直接添加到chat-messages容器，不插入到session-card内部
    // 这样可以确保消息总是可见的
    chatMessages.appendChild(messageDiv);
    console.log('[displayUserMessage] ✅ Message added directly to chat-messages container');
    
    // 强制浏览器重新计算布局，确保消息立即可见
    const height = messageDiv.offsetHeight; // 触发重排
    console.log('[displayUserMessage] Message height:', height, 'px');
    
    // 确保消息在DOM中
    if (!chatMessages.contains(messageDiv)) {
        console.error('[displayUserMessage] ❌ Message not in DOM!');
        chatMessages.appendChild(messageDiv);
    }
    
    // 立即滚动到底部，使用多个延迟确保消息完全渲染
    scrollChatToBottom();
    
    // 额外的滚动确保，防止消息被延迟显示
    requestAnimationFrame(() => {
        scrollChatToBottom();
        setTimeout(() => {
            scrollChatToBottom();
            // 再次检查消息是否可见
            const rect = messageDiv.getBoundingClientRect();
            console.log('[displayUserMessage] Message position:', rect);
        }, 50);
        setTimeout(scrollChatToBottom, 150);
        setTimeout(scrollChatToBottom, 300);
    });
}

/**
 * 在鱼缸中显示气泡对话
 */
function displayFishBubble(reply, index) {
    // 检查是否有tankLayoutManager
    if (!window.tankLayoutManager) {
        console.warn('[Fish Bubble] tankLayoutManager not available');
        return;
    }
    
    // 根据fishId或fishName找到对应的鱼
    const fishId = reply.fishId || reply.fish_id;
    const fishName = reply.fishName || reply.fish_name;
    
    // 在fishes数组中查找鱼
    const fishArray = window.fishes || [];
    let targetFish = null;
    
    if (fishId) {
        targetFish = fishArray.find(f => f.id === fishId);
    }
    
    if (!targetFish && fishName) {
        targetFish = fishArray.find(f => f.fishName === fishName || f.fish_name === fishName);
    }
    
    if (!targetFish) {
        console.warn('[Fish Bubble] 找不到对应的鱼:', { fishId, fishName });
        return;
    }
    
    // 检查鱼是否有rowIndex，如果没有则分配一个
    if (targetFish.rowIndex === undefined) {
        console.log('[Fish Bubble] 鱼没有rowIndex，尝试分配...', {
            fishId: targetFish.id,
            fishName: targetFish.fishName || targetFish.fish_name,
            hasLayoutManager: !!window.tankLayoutManager,
            hasAssignMethod: !!(window.tankLayoutManager && window.tankLayoutManager.assignFishToRows)
        });
        
        // 尝试将鱼分配到布局管理器
        if (window.tankLayoutManager && window.tankLayoutManager.assignFishToRows) {
            try {
                // 使用assignFishToRows方法分配单条鱼
                window.tankLayoutManager.assignFishToRows([targetFish], true);
                console.log('[Fish Bubble] ✅ 为鱼分配行成功:', targetFish.rowIndex);
            } catch (error) {
                console.error('[Fish Bubble] ❌ 分配行失败:', error);
                // 手动分配一个默认行
                targetFish.rowIndex = Math.floor(Math.random() * 3); // 随机分配到0-2行
                console.log('[Fish Bubble] 使用备用方案，随机分配行:', targetFish.rowIndex);
            }
        } else {
            console.warn('[Fish Bubble] 布局管理器不可用，使用备用方案');
            // 手动分配一个默认行
            targetFish.rowIndex = Math.floor(Math.random() * 3); // 随机分配到0-2行
            console.log('[Fish Bubble] 随机分配行:', targetFish.rowIndex);
        }
    }
    
    // 延迟显示，让气泡依次出现
    const delay = index * 3000; // 每条消息间隔3秒
    
    setTimeout(() => {
        const success = window.tankLayoutManager.showDialogue(
            targetFish,
            reply.message,
            6000 // 显示6秒
        );
        
        if (success) {
            console.log('[Fish Bubble] ✅ 气泡显示成功:', fishName || fishId);
        } else {
            console.warn('[Fish Bubble] ⚠️ 气泡显示失败（可能行已满）');
        }
    }, delay);
}

/**
 * 显示鱼的回复
 */
function displayFishReply(reply) {
    const chatMessages = document.getElementById('chat-messages');
    if (!chatMessages) {
        console.error('[displayFishReply] ❌ chat-messages container not found!');
        return;
    }
    
    // 确保chat-messages容器可见
    if (chatMessages.style.display === 'none') {
        chatMessages.style.display = 'block';
    }
    chatMessages.style.visibility = 'visible';
    chatMessages.style.opacity = '1';
    
    const messageDiv = document.createElement('div');
    // 确保消息立即可见，不使用可能延迟的动画
    messageDiv.style.cssText = `
        background: white;
        border-radius: 8px;
        padding: 8px 12px;
        margin-bottom: 6px;
        font-size: 13px;
        line-height: 1.5;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
        display: block !important;
        visibility: visible !important;
        opacity: 1 !important;
        position: relative;
        width: 100%;
        box-sizing: border-box;
    `;
    
    const personalityColors = {
        cheerful: '#FF9800',
        shy: '#2196F3',
        brave: '#E91E63',
        lazy: '#9C27B0'
    };
    const color = personalityColors[reply.personality] || '#666';
    
    // 获取鱼名称（支持多种字段名）
    const fishName = reply.fishName || reply.fish_name || 'Unknown Fish';
    
    messageDiv.innerHTML = `
        <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
            <span style="font-weight: 600; color: ${color}; font-size: 12px;">🐟 ${fishName}</span>
        </div>
        <div style="color: #333; text-align: left;">${escapeHtml(reply.message)}</div>
    `;
    
    // 直接添加到chat-messages容器，不插入到session-card内部
    chatMessages.appendChild(messageDiv);
    console.log('[displayFishReply] ✅ Message added directly to chat-messages container');
    
    // 强制浏览器重新计算布局，确保消息立即可见
    const height = messageDiv.offsetHeight; // 触发重排
    console.log('[displayFishReply] Message height:', height, 'px');
    
    // 确保消息在DOM中
    if (!chatMessages.contains(messageDiv)) {
        console.error('[displayFishReply] ❌ Message not in DOM!');
        chatMessages.appendChild(messageDiv);
    }
    
    // 立即滚动到底部，使用多个延迟确保消息完全渲染
    scrollChatToBottom();
    
    // 额外的滚动确保，防止消息被延迟显示
    requestAnimationFrame(() => {
        scrollChatToBottom();
        setTimeout(() => {
            scrollChatToBottom();
            // 再次检查消息是否可见
            const rect = messageDiv.getBoundingClientRect();
            console.log('[displayFishReply] Message position:', rect);
        }, 50);
        setTimeout(scrollChatToBottom, 150);
        setTimeout(scrollChatToBottom, 300);
    });
}

/**
 * 移除最后一条用户消息（用于错误回滚）
 */
function removeLastUserMessage() {
    const chatMessages = document.getElementById('chat-messages');
    if (!chatMessages) return;
    
    const userMessages = chatMessages.querySelectorAll('.user-chat-message');
    if (userMessages.length > 0) {
        userMessages[userMessages.length - 1].remove();
    }
}

/**
 * 清除所有聊天消息
 */
function clearChatMessages() {
    const chatMessages = document.getElementById('chat-messages');
    if (!chatMessages) return;
    
    // 确认对话框
    if (!confirm('确定要清除所有聊天消息吗？')) {
        return;
    }
    
    // 清除所有消息
    chatMessages.innerHTML = '';
    
    // 重置conversationId（开始新对话）
    if (typeof currentConversationId !== 'undefined') {
        window.currentConversationId = null;
    }
    
    console.log('[Chat] ✅ 所有消息已清除');
}

/**
 * HTML转义函数
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 初始化用户输入区域显示状态 - 使用缓存立即显示
function initializeUserChatInput() {
    const loginPrompt = document.getElementById('user-chat-login-prompt');
    const inputContainer = document.getElementById('user-chat-input-container');
    
    if (!loginPrompt || !inputContainer) return;
    
    // 使用缓存同步检查登录状态（无网络延迟）
    const isLoggedIn = window.authCache && window.authCache.isLoggedIn();
    
    if (isLoggedIn) {
        // 用户已登录，立即显示输入框
        loginPrompt.style.display = 'none';
        inputContainer.style.display = 'block';
    } else {
        // 用户未登录，显示提示
        loginPrompt.style.display = 'block';
        inputContainer.style.display = 'none';
    }
    
    // 异步验证并更新状态（确保准确性）
    updateUserChatInputVisibility();
}

// 立即初始化用户输入区域
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeUserChatInput);
} else {
    initializeUserChatInput();
}

// 监听登录状态变化
if (window.supabaseAuth) {
    window.supabaseAuth.onAuthStateChange(() => {
        updateUserChatInputVisibility();
    });
}

/**
 * 获取并显示用户群聊使用情况
 */
async function displayGroupChatUsage() {
    try {
        // 获取当前用户ID
        let currentUserId = null;
        
        // Try getCurrentUserId function first
        if (typeof getCurrentUserId === 'function') {
            try {
                currentUserId = await getCurrentUserId();
            } catch (error) {
                // Ignore error silently (user not logged in)
                console.log('💬 User not logged in, skipping group chat usage display');
            }
        }
        
        // Fallback to localStorage if getCurrentUserId returns null
        if (!currentUserId) {
            const userData = localStorage.getItem('userData');
            if (userData) {
                try {
                    const parsed = JSON.parse(userData);
                    currentUserId = parsed.userId || parsed.uid || parsed.id;
                } catch (error) {
                    // Ignore error
                }
            }
            
            // Also try userId directly from localStorage
            if (!currentUserId) {
                currentUserId = localStorage.getItem('userId');
            }
        }
        
        if (!currentUserId) {
            // User not logged in, skip
            return;
        }
        
        // 获取使用情况
        const usageResponse = await fetch(`/api/fish-api?action=chat-usage&userId=${encodeURIComponent(currentUserId)}`);
        if (usageResponse && usageResponse.ok) {
            const usageData = await usageResponse.json();
            if (usageData.success) {
                if (usageData.unlimited) {
                    console.log(`💬 当前用户今日已用群聊数 ${usageData.usage}（${usageData.tier} 会员，无限次）`);
                } else {
                    console.log(`💬 当前用户今日已用群聊数 ${usageData.usage}/${usageData.limit}`);
                }
            }
        }
    } catch (error) {
        // 静默失败，不影响主流程
        console.debug('Failed to get group chat usage:', error);
    }
}

// 初始化群聊功能
async function initializeGroupChat() {
    if (!communityChatManager) {
        console.warn('CommunityChatManager not initialized');
        return;
    }
    
    try {
        // 检查用户登录状态
        let isUserLoggedIn = false;
        let currentUserId = null;
        
        // Try getCurrentUserId function first
        if (typeof getCurrentUserId === 'function') {
            try {
                currentUserId = await getCurrentUserId();
                isUserLoggedIn = !!currentUserId;
            } catch (error) {
                // User not logged in
                console.log('🔒 User not logged in, group chat will be disabled');
            }
        }
        
        // Fallback to localStorage
        if (!currentUserId) {
            const userData = localStorage.getItem('userData');
            if (userData) {
                try {
                    const parsed = JSON.parse(userData);
                    currentUserId = parsed.userId || parsed.uid || parsed.id;
                    isUserLoggedIn = !!currentUserId;
                } catch (error) {
                    // Ignore
                }
            }
            if (!currentUserId) {
                currentUserId = localStorage.getItem('userId');
                isUserLoggedIn = !!currentUserId;
            }
        }
        
        // 如果用户未登录，禁用群聊但允许独白（独白是公开展示功能）
        if (!isUserLoggedIn) {
            console.log('🔒 User not logged in');
            console.log('❌ Group chat disabled (requires login)');
            console.log('✅ Monologue allowed (public feature)');
            
            // 禁用群聊
            communityChatManager.setGroupChatEnabled(false);
            updateGroupChatButton(false);
            updateFishTalkToggle(false);
            
            // 🔧 修复：未登录用户的独白也受fish_talk字段控制
            // 未登录用户默认禁用独白，需要通过Fish Talk开关启用
            let monologueEnabled = false;
            const groupChatEnabled = localStorage.getItem('groupChatEnabled') === 'true';
            
            // 独白现在受Fish Talk开关控制
            if (groupChatEnabled) {
                const userMonologuePreference = localStorage.getItem('monologueEnabled');
                if (userMonologuePreference !== null) {
                    monologueEnabled = userMonologuePreference === 'true';
                    console.log(`Monologue: Using user preference: ${monologueEnabled ? 'ON' : 'OFF'} (Fish Talk enabled)`);
                } else {
                    // 如果Fish Talk启用但没有独白偏好，默认启用独白
                    monologueEnabled = true;
                    console.log(`Monologue: Default enabled (Fish Talk enabled)`);
                }
            } else {
                console.log(`Monologue: Disabled (Fish Talk disabled)`);
            }
            
            communityChatManager.setMonologueEnabled(monologueEnabled);
            
            return; // 不继续初始化群聊相关配置
        }
        
        // 显示群聊使用情况（页面加载时）
        await displayGroupChatUsage();
        
        // 从API获取环境变量配置（群聊、独白和费用节省）
        const [groupChatResponse, monoChatResponse, costSavingResponse] = await Promise.all([
            fetch('/api/config-api?action=group-chat').catch(() => null),
            fetch('/api/config-api?action=mono-chat').catch(() => null),
            fetch('/api/config-api?action=chat-cost-saving').catch(() => null)
        ]);
        
        // 处理群聊配置
        let groupChatEnabled = false;
        let groupChatIntervalMinutes = 5; // Default 5 minutes
        if (groupChatResponse && groupChatResponse.ok) {
            const groupChatConfig = await groupChatResponse.json();
            const defaultGroupChatEnabled = groupChatConfig.enabled || false;
            
            // 读取群聊时间间隔配置（单位：分钟）
            if (groupChatConfig.intervalTimeMinutes !== undefined) {
                groupChatIntervalMinutes = parseInt(groupChatConfig.intervalTimeMinutes, 10) || 5;
            }
            
            // 检查用户是否手动设置过（用户设置优先）
            const userPreference = localStorage.getItem('groupChatEnabled');
            if (userPreference !== null) {
                groupChatEnabled = userPreference === 'true';
                console.log(`AI Fish Group Chat: Using user preference: ${groupChatEnabled ? 'ON' : 'OFF'}`);
            } else {
                groupChatEnabled = defaultGroupChatEnabled;
                console.log(`AI Fish Group Chat: Using environment default: ${groupChatEnabled ? 'ON' : 'OFF'}`);
            }
            
            console.log(`  AI Fish Group Chat interval: ${groupChatIntervalMinutes} minutes`);
            
            // 更新聊天面板中的间隔时间显示
            updateChatIntervalText(groupChatIntervalMinutes);
        } else {
            // 如果API失败，检查用户本地设置
            const userPreference = localStorage.getItem('groupChatEnabled');
            if (userPreference === 'true') {
                groupChatEnabled = true;
            }
        }
        
        // 🔧 修复：处理独白配置，现在受fish_talk字段控制
        let monologueEnabled = false;
        
        // 独白现在受Fish Talk开关控制
        if (groupChatEnabled) {
            if (monoChatResponse && monoChatResponse.ok) {
                const monoChatConfig = await monoChatResponse.json();
                const defaultMonologueEnabled = monoChatConfig.enabled || false;
            
            // 检查用户是否手动设置过（用户设置优先）
                const userPreference = localStorage.getItem('monologueEnabled');
            if (userPreference !== null) {
                    monologueEnabled = userPreference === 'true';
                    console.log(`Monologue: Using user preference: ${monologueEnabled ? 'ON' : 'OFF'} (Fish Talk enabled)`);
            } else {
                    monologueEnabled = defaultMonologueEnabled;
                    console.log(`Monologue: Using environment default: ${monologueEnabled ? 'ON' : 'OFF'} (Fish Talk enabled)`);
            }
            } else {
                // 如果Fish Talk启用但无法获取配置，默认启用独白
                monologueEnabled = true;
                console.log(`Monologue: Default enabled (Fish Talk enabled, no config)`);
            }
        } else {
            console.log(`Monologue: Disabled (Fish Talk disabled)`);
        }
        
        // 设置群聊间隔时间（先设置间隔，再启用，确保使用正确的间隔）
        communityChatManager.setGroupChatInterval(groupChatIntervalMinutes);
        
        // 设置群聊状态（启用时会使用已设置的间隔）
        communityChatManager.setGroupChatEnabled(groupChatEnabled);
        updateGroupChatButton(groupChatEnabled);
        updateFishTalkToggle(groupChatEnabled); // Also update hamburger menu toggle
        
        // 设置独白状态
        communityChatManager.setMonologueEnabled(monologueEnabled);
        
        // 处理费用节省配置
        let costSavingEnabled = true; // Default to enabled for safety
        let maxInactiveTimeMinutes = 15; // Default 15 minutes
        let maxRunTimeMinutes = 60; // Default 60 minutes
        
        if (costSavingResponse && costSavingResponse.ok) {
            const costSavingConfig = await costSavingResponse.json();
            costSavingEnabled = costSavingConfig.enabled !== false; // Default to true if not specified
            
            // 读取时间配置（单位：分钟）
            if (costSavingConfig.maxInactiveTimeMinutes !== undefined) {
                maxInactiveTimeMinutes = parseInt(costSavingConfig.maxInactiveTimeMinutes, 10) || 15;
            }
            if (costSavingConfig.maxRunTimeMinutes !== undefined) {
                maxRunTimeMinutes = parseInt(costSavingConfig.maxRunTimeMinutes, 10) || 60;
            }
            
            console.log(`Cost saving: ${costSavingEnabled ? 'ON' : 'OFF'}`);
            console.log(`  Max inactive time: ${maxInactiveTimeMinutes} minutes`);
            console.log(`  Max run time: ${maxRunTimeMinutes} minutes`);
        }
        
        // 设置费用节省状态和时间配置
        communityChatManager.setCostSavingEnabled(costSavingEnabled);
        communityChatManager.updateCostControlTimes(maxInactiveTimeMinutes, maxRunTimeMinutes);
        
        if (groupChatEnabled || monologueEnabled) {
            console.log(`✅ Chat features initialized: AI Fish Group Chat ${groupChatEnabled ? 'ON' : 'OFF'}, Monologue ${monologueEnabled ? 'ON' : 'OFF'}, Cost Saving ${costSavingEnabled ? 'ON' : 'OFF'}`);
            // Setup event listeners for cost control (only if cost saving is enabled)
            if (costSavingEnabled) {
                setupChatCostControlListeners();
            }
            
            // Mark as initialized after a short delay to ensure page is fully loaded
            // This prevents false "page hidden" detection during page load
            // Also ensure group chat is scheduled if it was enabled
            setTimeout(() => {
                if (communityChatManager) {
                    console.log('🔍 [DEBUG] Marking chat manager as initialized...');
                    communityChatManager.markInitialized();
                    
                    // Double-check: if group chat is enabled but interval is not set, schedule it
                    if (groupChatEnabled && !communityChatManager.autoChatInterval) {
                        console.log('⚠️ [DEBUG] Group chat enabled but no interval set, rescheduling...');
                        communityChatManager.scheduleAutoChats(communityChatManager.groupChatIntervalMinutes);
                    }
                }
            }, 2000); // 2 seconds delay to ensure page is fully loaded
        } else {
            console.log('ℹ️ Chat features initialized but disabled');
        }
    } catch (error) {
        console.error('Failed to initialize chat features:', error);
        // 默认禁用
        communityChatManager.setGroupChatEnabled(false);
        communityChatManager.setMonologueEnabled(false);
        updateGroupChatButton(false);
        updateFishTalkToggle(false); // Also update hamburger menu toggle
    }
}

// Setup event listeners for cost control (page visibility, user activity)
let costControlListenersSetup = false;
let activityThrottle = null;

function setupChatCostControlListeners() {
    if (!communityChatManager) {
        return;
    }
    
    // Only setup listeners if cost saving is enabled
    if (!communityChatManager.isCostSavingEnabled()) {
        console.log('💰 Cost saving disabled, skipping event listeners setup');
        return;
    }
    
    // Prevent duplicate listener setup
    if (costControlListenersSetup) {
        return;
    }
    
    // Initialize page visibility state (may be false during page load, so check after a delay)
    setTimeout(() => {
        if (communityChatManager) {
            const isVisible = !document.hidden;
            communityChatManager.setPageVisible(isVisible);
        }
    }, 1000); // Wait 1 second after setup to check actual visibility
    
    // Page visibility change (tab switch, minimize window)
    document.addEventListener('visibilitychange', () => {
        // Ignore visibility changes during initialization
        if (communityChatManager && communityChatManager.isInitialized) {
            const isVisible = !document.hidden;
            communityChatManager.setPageVisible(isVisible);
        }
    });
    
    // Window blur/focus (tab loses/gains focus)
    window.addEventListener('blur', () => {
        // Ignore blur events during initialization
        if (communityChatManager && communityChatManager.isInitialized) {
            communityChatManager.setPageVisible(false);
        }
    });
    
    window.addEventListener('focus', () => {
        if (communityChatManager) {
            communityChatManager.setPageVisible(true);
        }
    });
    
    // User activity detection (mouse movement, clicks, keyboard)
    const activityEvents = ['mousemove', 'mousedown', 'click', 'keydown', 'scroll', 'touchstart'];
    
    activityEvents.forEach(eventType => {
        document.addEventListener(eventType, () => {
            if (communityChatManager) {
                // Throttle activity updates to avoid excessive calls
                if (activityThrottle) {
                    clearTimeout(activityThrottle);
                }
                activityThrottle = setTimeout(() => {
                    communityChatManager.updateUserActivity();
                }, 1000); // Update at most once per second
            }
        }, { passive: true });
    });
    
    costControlListenersSetup = true;
    console.log('✅ Cost control event listeners setup complete');
}

// 更新群聊开关按钮状态
function updateGroupChatButton(enabled) {
    const toggleGroupChatBtn = document.getElementById('toggle-group-chat-btn');
    if (!toggleGroupChatBtn) return;
    
    const iconSpan = toggleGroupChatBtn.querySelector('.game-control-icon');
    const textSpan = toggleGroupChatBtn.querySelector('span:last-child');
    
    // 保持橙色，但根据状态调整渐变强度
    toggleGroupChatBtn.className = 'game-btn game-btn-orange';
    
    if (enabled) {
        // 启用状态：使用明亮的橙色渐变
        toggleGroupChatBtn.style.background = 'linear-gradient(180deg, #FFB340 0%, #FF9500 50%, #E67E00 100%)';
        toggleGroupChatBtn.style.borderBottom = '3px solid #CC6E00';
        toggleGroupChatBtn.style.color = 'white';
        toggleGroupChatBtn.style.textShadow = '0 1px 2px rgba(0, 0, 0, 0.3)';
        if (iconSpan) iconSpan.textContent = '💬';
        if (textSpan) textSpan.textContent = 'Chat ON';
    } else {
        // 禁用状态：使用较暗的橙色渐变
        toggleGroupChatBtn.style.background = 'linear-gradient(180deg, #FF9500 0%, #E67E00 50%, #CC6E00 100%)';
        toggleGroupChatBtn.style.borderBottom = '3px solid #B85C00';
        toggleGroupChatBtn.style.color = 'white';
        toggleGroupChatBtn.style.textShadow = '0 1px 2px rgba(0, 0, 0, 0.3)';
        if (iconSpan) iconSpan.textContent = '💬';
        if (textSpan) textSpan.textContent = 'Chat OFF';
    }
}

// 切换群聊开关
async function toggleGroupChat() {
    if (!communityChatManager) {
        console.warn('CommunityChatManager not initialized');
        return;
    }
    
    const currentState = communityChatManager.isGroupChatEnabled();
    const newState = !currentState;
    
    // 如果尝试启用群聊，需要检查登录状态
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
            console.log('❌ 未登录用户无法启用群聊');
            // 显示登录提示
            if (window.authUI && window.authUI.showLoginModal) {
                window.authUI.showLoginModal();
            } else {
                // Fallback: 使用 alert
                alert('请先登录以使用群聊功能');
            }
            return;
        }
    }
    
    // 已登录或禁用操作，继续执行
    // 更新管理器状态
    communityChatManager.setGroupChatEnabled(newState);
    
    // 如果启用，设置事件监听器
    if (newState) {
        setupChatCostControlListeners();
    }
    
    // 保存用户偏好到 localStorage
    localStorage.setItem('groupChatEnabled', newState ? 'true' : 'false');
    
    // 更新按钮显示
    updateGroupChatButton(newState);
    updateFishTalkToggle(newState); // Also update hamburger menu toggle
    
    console.log(`Group chat ${newState ? 'enabled' : 'disabled'} by user`);
}

// 聊天面板切换功能
const chatPanel = document.getElementById('chat-panel');
const toggleChatBtn = document.getElementById('toggle-chat-btn');
const toggleGroupChatBtn = document.getElementById('toggle-group-chat-btn');
const closeChatBtn = document.getElementById('close-chat-panel');
const chatReopenBtn = document.getElementById('chat-reopen-btn');
const tankWrapper = document.getElementById('tank-wrapper-main');

// 从localStorage读取聊天面板状态，默认为false
let isChatPanelOpen = localStorage.getItem('chatPanelOpen') === 'true';
// 导出到window对象，让其他地方也能访问和修改
window.isChatPanelOpen = isChatPanelOpen;

function toggleChatPanel() {
    isChatPanelOpen = !isChatPanelOpen;
    window.isChatPanelOpen = isChatPanelOpen;
    
    // 保存状态到localStorage
    localStorage.setItem('chatPanelOpen', isChatPanelOpen.toString());
    
    if (isChatPanelOpen) {
        // 显示聊天面板（右下角）
        chatPanel.style.display = 'flex';
        chatPanel.style.visibility = 'visible';
        // 使用setTimeout确保display先生效
        setTimeout(() => {
            chatPanel.style.right = '0';
        }, 10);
        // 隐藏重新打开按钮
        if (chatReopenBtn) {
            chatReopenBtn.style.display = 'none';
        }
        // 更新按钮文本（保持图标和文本结构）
        const textSpan = toggleChatBtn?.querySelector('span:last-child');
        if (textSpan) {
            textSpan.textContent = 'Close';
        }
        // 滚动到底部
        setTimeout(() => {
            scrollChatToBottom();
        }, 100);
    } else {
        // 隐藏聊天面板
        chatPanel.style.right = '-420px';
        // 显示重新打开按钮
        if (chatReopenBtn) {
            chatReopenBtn.style.display = 'flex';
        }
        // 延迟隐藏，等待动画完成
        setTimeout(() => {
            chatPanel.style.display = 'none';
            chatPanel.style.visibility = 'hidden';
        }, 400);
        // 恢复按钮文本
        const textSpan = toggleChatBtn?.querySelector('span:last-child');
        if (textSpan) {
            textSpan.textContent = 'Chat Box';
        }
    }
}

// Chat Box 按钮：只用于切换聊天面板
if (toggleChatBtn) {
    toggleChatBtn.addEventListener('click', toggleChatPanel);
    toggleChatBtn.title = '打开/关闭聊天面板';
}

// Chat ON/OFF 按钮：用于切换所有聊天功能（群聊和自语）
if (toggleGroupChatBtn) {
    toggleGroupChatBtn.addEventListener('click', toggleGroupChat);
    toggleGroupChatBtn.title = '开启/关闭所有聊天功能（群聊和自语）';
}

if (closeChatBtn) {
    closeChatBtn.addEventListener('click', toggleChatPanel);
}

// 重新打开按钮事件
if (chatReopenBtn) {
    chatReopenBtn.addEventListener('click', () => {
        if (!isChatPanelOpen) {
            toggleChatPanel();
        }
    });
    
    // 添加悬停效果
    chatReopenBtn.addEventListener('mouseenter', () => {
        chatReopenBtn.style.transform = 'scale(1.1)';
        chatReopenBtn.style.boxShadow = '0 6px 0 rgba(0, 0, 0, 0.2), 0 12px 30px rgba(0, 0, 0, 0.4)';
    });
    
    chatReopenBtn.addEventListener('mouseleave', () => {
        chatReopenBtn.style.transform = 'scale(1)';
        chatReopenBtn.style.boxShadow = '0 4px 0 rgba(0, 0, 0, 0.2), 0 8px 20px rgba(0, 0, 0, 0.3)';
    });
    
    chatReopenBtn.addEventListener('mousedown', () => {
        chatReopenBtn.style.transform = 'scale(0.95)';
    });
    
    chatReopenBtn.addEventListener('mouseup', () => {
        chatReopenBtn.style.transform = 'scale(1.1)';
    });
}

// 导出函数供全局使用
window.toggleGroupChat = toggleGroupChat;
window.updateGroupChatButton = updateGroupChatButton;

// Setup Fish Talk toggle switch in hamburger menu (Global)
function setupFishTalkToggle() {
    const toggleSwitch = document.getElementById('fish-talk-switch');
    const toggleContainer = document.getElementById('fish-talk-toggle');
    
    if (!toggleSwitch || !toggleContainer) {
        console.warn('Fish Talk toggle elements not found');
        return;
    }

    // 初始化Fish Talk开关状态（从数据库获取）
    (async () => {
        let isLoggedIn = false;
        let fishTalkEnabled = false;
        
        try {
            if (window.supabaseAuth && typeof window.supabaseAuth.getCurrentUser === 'function') {
                const user = await window.supabaseAuth.getCurrentUser();
                isLoggedIn = !!user;
                
                if (isLoggedIn) {
                    // 从数据库获取fish_talk状态
                    const backendUrl = window.BACKEND_URL || '';
                    const token = localStorage.getItem('userToken');
                    if (token) {
                        const profileResponse = await fetch(`${backendUrl}/api/profile/${encodeURIComponent(user.id)}`, {
                            method: 'GET',
                            headers: {
                                'Authorization': `Bearer ${token}`
                            }
                        });
                        
                        if (profileResponse.ok) {
                            const profileData = await profileResponse.json();
                            fishTalkEnabled = profileData.user?.fish_talk || false;
                            console.log('🔄 从数据库加载Fish Talk状态:', fishTalkEnabled);
                        }
                    }
                }
            }
        } catch (error) {
            console.error('初始化Fish Talk状态时出错:', error);
            // 回退到localStorage
            const savedPreference = localStorage.getItem('groupChatEnabled');
            fishTalkEnabled = savedPreference === 'true';
        }
        
        // 设置开关状态
        toggleSwitch.checked = fishTalkEnabled;
        updateToggleStyle(toggleSwitch, fishTalkEnabled);
        
        // 同步到localStorage（向后兼容）
        localStorage.setItem('groupChatEnabled', fishTalkEnabled ? 'true' : 'false');
        
        // 初始化聊天面板的显示状态
        if (typeof window.updateChatPanelVisibility === 'function') {
            setTimeout(() => {
                window.updateChatPanelVisibility();
            }, 200);
        }
    })();

    // 阻止Fish Talk开关区域的mousedown事件冒泡
    toggleContainer.addEventListener('mousedown', (e) => {
        e.stopPropagation();
    });
    
    // 为开关本身也添加事件阻止
    if (toggleSwitch) {
        toggleSwitch.addEventListener('click', (e) => {
            e.stopPropagation();
        });
        
        toggleSwitch.addEventListener('change', (e) => {
            e.stopPropagation();
        });
    }

    // Handle toggle click - 合并点击处理和事件阻止
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
                updateToggleStyle(toggleSwitch, false);
                
                // 显示登录提示
                if (window.authUI && window.authUI.showLoginModal) {
                    window.authUI.showLoginModal();
                } else {
                    // Fallback: 使用 alert
                    alert('请先登录以使用 Fish Talk 功能');
                }
                return;
            }
        }
        
        // 已登录或禁用操作，继续执行
        toggleSwitch.checked = newState;
        updateToggleStyle(toggleSwitch, newState);
        
        // 保存到数据库
        try {
            const user = await window.supabaseAuth.getCurrentUser();
            if (user) {
                const backendUrl = window.BACKEND_URL || '';
                const token = localStorage.getItem('userToken');
                if (token) {
                    const response = await fetch(`${backendUrl}/api/profile/${encodeURIComponent(user.id)}`, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({
                            fish_talk: newState
                        })
                    });
                    
                    if (response.ok) {
                        console.log('✅ Fish Talk状态已保存到数据库:', newState);
                    } else {
                        console.error('❌ 保存Fish Talk状态失败:', response.status);
                    }
                }
            }
        } catch (error) {
            console.error('保存Fish Talk状态时出错:', error);
        }
        
        // Update chat manager
        if (communityChatManager) {
            communityChatManager.setGroupChatEnabled(newState);
            
            // 🔧 修复：同时更新独白状态，受Fish Talk开关控制
            if (newState) {
                // Fish Talk启用时，检查独白偏好或使用默认值
                const userMonologuePreference = localStorage.getItem('monologueEnabled');
                const monologueEnabled = userMonologuePreference !== null ? 
                    userMonologuePreference === 'true' : true; // 默认启用独白
                communityChatManager.setMonologueEnabled(monologueEnabled);
                console.log(`🗣️ Monologue ${monologueEnabled ? 'enabled' : 'disabled'} (Fish Talk enabled)`);
            } else {
                // Fish Talk禁用时，同时禁用独白
                communityChatManager.setMonologueEnabled(false);
                console.log(`🗣️ Monologue disabled (Fish Talk disabled)`);
            }
        }
        
        // Save preference to localStorage (向后兼容)
        localStorage.setItem('groupChatEnabled', newState ? 'true' : 'false');
        
        // Also update the control bar button if it exists
        updateGroupChatButton(newState);
        
        // Trigger custom event for same-tab sync (storage event only works across tabs)
        window.dispatchEvent(new CustomEvent('groupChatEnabledChanged', {
            detail: { enabled: newState }
        }));
        
        // 更新聊天面板的显示状态
        if (typeof window.updateChatPanelVisibility === 'function') {
            setTimeout(() => {
                window.updateChatPanelVisibility();
            }, 100);
        }
        
        console.log(`Fish Talk ${newState ? 'enabled' : 'disabled'} (global)`);
    });
    
    // Listen for changes from other tabs/pages (global sync)
    window.addEventListener('storage', function(e) {
        if (e.key === 'groupChatEnabled') {
            const newState = e.newValue === 'true';
            toggleSwitch.checked = newState;
            updateToggleStyle(toggleSwitch, newState);
            
            // Update chat manager
            if (communityChatManager) {
                communityChatManager.setGroupChatEnabled(newState);
                
                // 🔧 修复：同时更新独白状态，受Fish Talk开关控制
                if (newState) {
                    // Fish Talk启用时，检查独白偏好或使用默认值
                    const userMonologuePreference = localStorage.getItem('monologueEnabled');
                    const monologueEnabled = userMonologuePreference !== null ? 
                        userMonologuePreference === 'true' : true; // 默认启用独白
                    communityChatManager.setMonologueEnabled(monologueEnabled);
                    console.log(`🗣️ Monologue ${monologueEnabled ? 'enabled' : 'disabled'} (Fish Talk cross-tab sync)`);
                } else {
                    // Fish Talk禁用时，同时禁用独白
                    communityChatManager.setMonologueEnabled(false);
                    console.log(`🗣️ Monologue disabled (Fish Talk cross-tab sync)`);
                }
            }
            
            // Also update the control bar button if it exists
            updateGroupChatButton(newState);
            
            // 更新聊天面板的显示状态
            if (typeof window.updateChatPanelVisibility === 'function') {
                setTimeout(() => {
                    window.updateChatPanelVisibility();
                }, 100);
            }
            
            console.log(`Fish Talk ${newState ? 'enabled' : 'disabled'} (synced from other tab)`);
        }
    });
    
    // Listen for custom event for same-tab sync
    window.addEventListener('groupChatEnabledChanged', function(e) {
        const newState = e.detail.enabled;
        toggleSwitch.checked = newState;
        updateToggleStyle(toggleSwitch, newState);
        
        // Update chat manager
        if (communityChatManager) {
            communityChatManager.setGroupChatEnabled(newState);
            
            // 🔧 修复：同时更新独白状态，受Fish Talk开关控制
            if (newState) {
                // Fish Talk启用时，检查独白偏好或使用默认值
                const userMonologuePreference = localStorage.getItem('monologueEnabled');
                const monologueEnabled = userMonologuePreference !== null ? 
                    userMonologuePreference === 'true' : true; // 默认启用独白
                communityChatManager.setMonologueEnabled(monologueEnabled);
                console.log(`🗣️ Monologue ${monologueEnabled ? 'enabled' : 'disabled'} (Fish Talk synced)`);
            } else {
                // Fish Talk禁用时，同时禁用独白
                communityChatManager.setMonologueEnabled(false);
                console.log(`🗣️ Monologue disabled (Fish Talk synced)`);
            }
        }
        
        // Also update the control bar button if it exists
        updateGroupChatButton(newState);
        
        // 更新聊天面板的显示状态
        if (typeof window.updateChatPanelVisibility === 'function') {
            setTimeout(() => {
                window.updateChatPanelVisibility();
            }, 100);
        }
    });
}

// Update Fish Talk toggle visual style
function updateFishTalkToggle(enabled) {
    const toggleSwitch = document.getElementById('fish-talk-switch');
    if (toggleSwitch) {
        toggleSwitch.checked = enabled;
        updateToggleStyle(toggleSwitch, enabled);
    }
}

// Update toggle switch visual style
function updateToggleStyle(toggleSwitch, enabled) {
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

// Initialize Fish Talk toggle when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // Wait a bit for DOM to be fully ready
    setTimeout(() => {
        setupFishTalkToggle();
        
        // Sync toggle with current state
        if (communityChatManager) {
            const currentState = communityChatManager.isGroupChatEnabled();
            updateFishTalkToggle(currentState);
        }
    }, 500);
});

// 更新聊天间隔时间显示
function updateChatIntervalText(intervalMinutes) {
    const intervalTextEl = document.getElementById('chat-interval-text');
    if (intervalTextEl) {
        if (intervalMinutes === 1) {
            intervalTextEl.textContent = 'New conversations every minute';
        } else {
            intervalTextEl.textContent = `New conversations every ${intervalMinutes} minutes`;
        }
    }
}

// ===== 背景气泡效果 =====
function createBackgroundBubbles() {
    const container = document.querySelector('.background-bubbles');
    if (!container) return;
    
    const bubbleCount = 20; // 鱼缸页面多一些气泡
    
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

// Animation loop and background bubbles will be initialized in DOMContentLoaded
// Do not call here as canvas may not be ready yet

/**
 * 滚动聊天面板到底部 - 强化版
 */
function scrollChatToBottom() {
    const chatMessages = document.getElementById('chat-messages');
    if (!chatMessages) return;
    
    // 使用auto behavior进行立即滚动
    const scrollToEnd = () => {
        // 强制计算scrollHeight
        const scrollHeight = chatMessages.scrollHeight;
        const clientHeight = chatMessages.clientHeight;
        const maxScroll = scrollHeight - clientHeight;
        
        // 使用scrollTo方法
        chatMessages.scrollTo({
            top: scrollHeight,
            behavior: 'auto'
        });
        
        // 备用方法，直接设置scrollTop
        chatMessages.scrollTop = scrollHeight;
        
        // 额外的强制滚动，确保到达底部
        if (chatMessages.scrollTop < maxScroll - 1) {
            chatMessages.scrollTop = scrollHeight;
        }
    };
    
    // 立即滚动一次
    scrollToEnd();
    
    // 使用requestAnimationFrame确保DOM更新后再滚动
    requestAnimationFrame(() => {
        scrollToEnd();
        
        // 多次延迟滚动以确保消息完全渲染
        setTimeout(scrollToEnd, 10);
        setTimeout(scrollToEnd, 50);
        setTimeout(scrollToEnd, 100);
        setTimeout(scrollToEnd, 200);
    });
}

