/**
 * Tank Layout Manager - Row-based Dialogue Placement System
 * 
 * Implements the row-based layout system with:
 * - Separate dialogue zone and swim zone per row
 * - 100% reliable collision avoidance
 * - Slot-based horizontal positioning for dialogues
 * - O(1) complexity position calculations
 */

// Tank layout configuration
const TANK_LAYOUT = {
  rows: 6,                      // Number of rows in the tank (increased for better distribution)
  rowHeight: 200,               // Height of each row in pixels (increased)
  
  // Dialogue zone (top of each row)
  dialogueZone: {
    height: 35,                 // Height reserved for dialogues
    yOffset: 5                  // Distance from row top
  },
  
  // Swim zone (bottom of each row)
  swimZone: {
    height: 150,                // Height where fish can swim (increased)
    yOffset: 45                 // Distance from row top
  },
  
  // Horizontal slots for dialogues (to avoid horizontal overlap)
  dialogueSlots: [
    { x: 50, width: 250 },      // Left slot
    { x: 320, width: 250 },     // Center slot
    { x: 590, width: 250 }      // Right slot
  ]
};

/**
 * Row Manager - Manages a single row of the tank
 */
class TankRow {
  constructor(rowIndex, canvasWidth, ctx = null) {
    this.rowIndex = rowIndex;
    this.rowTop = rowIndex * TANK_LAYOUT.rowHeight;
    this.ctx = ctx; // Store context for text measurement
    
    // Calculate zones
    this.dialogueY = this.rowTop + TANK_LAYOUT.dialogueZone.yOffset;
    this.dialogueHeight = TANK_LAYOUT.dialogueZone.height;
    
    this.swimYMin = this.rowTop + TANK_LAYOUT.swimZone.yOffset;
    this.swimYMax = this.swimYMin + TANK_LAYOUT.swimZone.height;
    
    // Dialogue management
    this.activeDialogues = new Map(); // fishId -> dialogue object
    this.availableSlots = [0, 1, 2];   // Available slot indices
    this.dialogueQueue = [];           // Queue for when all slots are full
  }
  
  /**
   * Constrain fish Y coordinate to swim zone
   * @param {Object} fish - Fish object with y coordinate
   */
  constrainFishY(fish) {
    if (fish.y < this.swimYMin) {
      fish.y = this.swimYMin;
    } else if (fish.y > this.swimYMax) {
      fish.y = this.swimYMax;
    }
  }
  
  /**
   * Find the best slot for a dialogue based on fish X position
   * @param {number} fishX - Fish X coordinate
   * @returns {number|null} - Slot index or null if no slots available
   */
  findBestSlot(fishX) {
    if (this.availableSlots.length === 0) {
      return null; // All slots occupied
    }
    
    // Find the slot closest to the fish's X position
    let bestSlot = this.availableSlots[0];
    let minDistance = Infinity;
    
    for (const slotIdx of this.availableSlots) {
      const slot = TANK_LAYOUT.dialogueSlots[slotIdx];
      const slotCenter = slot.x + slot.width / 2;
      const distance = Math.abs(fishX - slotCenter);
      
      if (distance < minDistance) {
        minDistance = distance;
        bestSlot = slotIdx;
      }
    }
    
    return bestSlot;
  }
  
  /**
   * Calculate optimal dialogue dimensions based on text content
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {string} text - Text to measure
   * @returns {Object} - {width, height} object
   */
  calculateDialogueDimensions(ctx, text) {
    // Set font for measurement - 必须与绘制时使用的字体一致
    ctx.font = 'bold 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
    
    const padding = 14;
    const minWidth = 80;   // 最小宽度
    const maxWidth = 250;  // 最大宽度
    const idealMaxLineWidth = 200; // 理想的单行最大宽度
    const lineHeight = 20; // 行高（增加以配合更大的字体）
    
    // Measure text
    const textWidth = ctx.measureText(text).width;
    
    // Calculate width with padding
    let width = textWidth + padding * 2;
    
    // If text is too long, we'll word wrap, so use ideal max width
    if (width > idealMaxLineWidth) {
      width = idealMaxLineWidth;
    }
    
    // Apply min/max constraints
    width = Math.max(minWidth, Math.min(maxWidth, width));
    
    // Calculate how many lines we'll need
    const maxTextWidth = width - padding * 2;
    const lines = this.wrapTextForMeasurement(ctx, text, maxTextWidth);
    
    // Calculate height based on number of lines
    const height = lines.length * lineHeight + padding * 2;
    
    return { width, height };
  }
  
  /**
   * Wrap text for measurement (separate from drawing) - 支持中英文混合
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {string} text - Text to wrap
   * @param {number} maxWidth - Maximum width
   * @returns {Array} - Array of text lines
   */
  wrapTextForMeasurement(ctx, text, maxWidth) {
    const lines = [];
    let currentLine = '';
    
    // 先尝试按空格分词（英文）
    const hasManySpaces = (text.match(/ /g) || []).length > text.length * 0.1;
    
    if (hasManySpaces) {
      // 主要是英文文本，按单词换行
      const words = text.split(' ');
      for (const word of words) {
        const testLine = currentLine + (currentLine ? ' ' : '') + word;
        const metrics = ctx.measureText(testLine);
        
        if (metrics.width > maxWidth && currentLine) {
          lines.push(currentLine);
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      }
    } else {
      // 主要是中文或混合文本，按字符换行
      for (let i = 0; i < text.length; i++) {
        const char = text[i];
        const testLine = currentLine + char;
        const metrics = ctx.measureText(testLine);
        
        if (metrics.width > maxWidth && currentLine) {
          lines.push(currentLine);
          currentLine = char;
        } else {
          currentLine = testLine;
        }
      }
    }
    
    if (currentLine) {
      lines.push(currentLine);
    }
    
    return lines;
  }
  
  /**
   * Show a dialogue in this row
   * @param {Object} fish - Fish object
   * @param {string} message - Dialogue message
   * @param {number} duration - Display duration in ms
   * @returns {boolean} - True if dialogue was shown, false if row is full
   */
  showDialogue(fish, message, duration = 5000) {
    const slotIdx = this.findBestSlot(fish.x);
    
    if (slotIdx === null) {
      // All slots full, add to queue
      this.dialogueQueue.push({ fish, message, duration });
      return false;
    }
    
    const slot = TANK_LAYOUT.dialogueSlots[slotIdx];
    
    // Calculate dialogue dimensions based on text content
    let dimensions;
    if (this.ctx) {
      dimensions = this.calculateDialogueDimensions(this.ctx, message);
    } else {
      dimensions = { width: slot.width, height: this.dialogueHeight };
    }
    
    const dialogue = {
      fishId: fish.id,
      fish: fish,  // 保存fish对象的引用，用于跟随移动
      text: message,
      x: slot.x,
      y: this.dialogueY,
      width: dimensions.width,   // 使用自适应宽度
      height: dimensions.height, // 使用自适应高度
      slotIdx: slotIdx,
      createdAt: Date.now(),
      duration: duration,
      personality: fish.personality || 'cheerful',
      floatOffset: 0  // 用于浮动动画
    };
    
    this.activeDialogues.set(fish.id, dialogue);
    
    // Mark slot as occupied
    this.availableSlots = this.availableSlots.filter(idx => idx !== slotIdx);
    
    // Auto-remove after duration
    setTimeout(() => {
      this.removeDialogue(fish.id);
      this.processQueue(); // Try to show queued dialogues
    }, duration);
    
    return true;
  }
  
  /**
   * Remove a dialogue and free its slot
   * @param {string} fishId - Fish ID
   */
  removeDialogue(fishId) {
    const dialogue = this.activeDialogues.get(fishId);
    if (dialogue) {
      // Free the slot
      this.availableSlots.push(dialogue.slotIdx);
      this.availableSlots.sort(); // Keep slots sorted
      
      this.activeDialogues.delete(fishId);
    }
  }
  
  /**
   * Process queued dialogues when slots become available
   */
  processQueue() {
    while (this.dialogueQueue.length > 0 && this.availableSlots.length > 0) {
      const queued = this.dialogueQueue.shift();
      this.showDialogue(queued.fish, queued.message, queued.duration);
    }
  }
  
  /**
   * Get all active dialogues in this row
   * @returns {Array} - Array of dialogue objects
   */
  getActiveDialogues() {
    return Array.from(this.activeDialogues.values());
  }
}

/**
 * Tank Layout Manager - Main manager for the entire tank
 */
class TankLayoutManager {
  constructor(canvas, ctx) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.rows = [];
    
    // 🔧 关键修复：使用逻辑尺寸而非实际像素尺寸
    // 鱼的坐标系基于logicalWidth/logicalHeight，行管理器也必须使用相同坐标系
    console.log('🔍 [TankLayoutManager] Canvas properties:', {
      actualWidth: canvas.width,
      actualHeight: canvas.height,
      logicalWidth: canvas.logicalWidth,
      logicalHeight: canvas.logicalHeight
    });
    
    const canvasWidth = canvas.logicalWidth || canvas.width;
    const canvasHeight = canvas.logicalHeight || canvas.height;
    
    console.log('🔍 [TankLayoutManager] Using dimensions:', {
      canvasWidth,
      canvasHeight,
      source: canvas.logicalHeight ? 'logical' : 'fallback'
    });
    
    // 🔧 移动端优化：使用更小的最小行高，确保有足够多的行
    // 移动端屏幕较小，需要更多行来避免鱼扎堆
    const isMobile = window.innerWidth <= 768;
    const minRowHeight = isMobile ? 80 : 120; // 进一步降低最小行高，允许更多行
    const calculatedRows = Math.max(isMobile ? 8 : 6, Math.ceil(canvasHeight / minRowHeight));
    const actualRows = Math.min(calculatedRows, 15); // 增加上限到15行
    
    // Update TANK_LAYOUT.rows dynamically
    const originalRows = TANK_LAYOUT.rows;
    TANK_LAYOUT.rows = actualRows;
    TANK_LAYOUT.rowHeight = Math.floor(canvasHeight / actualRows);
    TANK_LAYOUT.swimZone.height = Math.floor(TANK_LAYOUT.rowHeight * 0.7); // 70% of row height for swimming
    
    // Create row managers with logical width
    for (let i = 0; i < TANK_LAYOUT.rows; i++) {
      this.rows.push(new TankRow(i, canvasWidth, ctx));
    }
    
    // 🔧 修复：确保最后一行不超出画布边界
    const lastRow = this.rows[this.rows.length - 1];
    if (lastRow.swimYMax > canvasHeight) {
      console.warn(`⚠️ Last row swimYMax (${lastRow.swimYMax}) exceeds canvas height (${canvasHeight}), adjusting...`);
      lastRow.swimYMax = canvasHeight - 10; // 留10px边距
      console.log(`   Fixed: swimYMax adjusted to ${lastRow.swimYMax}`);
    }
    
    console.log(`✅ TankLayoutManager initialized with ${TANK_LAYOUT.rows} rows`);
    console.log(`   📐 Canvas: logical ${canvasWidth}x${canvasHeight}, actual ${canvas.width}x${canvas.height}`);
    console.log(`   📏 Row height: ${TANK_LAYOUT.rowHeight}px, ${isMobile ? 'mobile' : 'desktop'} mode`);
    console.log(`   🎯 First row Y range: ${this.rows[0].swimYMin}-${this.rows[0].swimYMax}`);
    console.log(`   🎯 Last row Y range: ${this.rows[this.rows.length-1].swimYMin}-${this.rows[this.rows.length-1].swimYMax}`);
  }
  
  /**
   * Assign fish to rows when they are first loaded
   * @param {Array} fishes - Array of fish objects
   * @param {boolean} preserveDistribution - If true, distribute evenly across rows instead of using Y position
   */
  assignFishToRows(fishes, preserveDistribution = false) {
    // 🔧 改进：计算每行应该分配的鱼数量，确保尽量均匀
    const rowCounts = new Array(this.rows.length).fill(0);
    let preassignedCount = 0;
    
    fishes.forEach((fish, index) => {
      // 🔧 检查是否已预分配行号（由loadFishImageToTank设置）
      if (fish.preassignedRowIndex !== undefined && fish.preassignedRowIndex >= 0 && fish.preassignedRowIndex < this.rows.length) {
        const rowIndex = fish.preassignedRowIndex;
        fish.rowIndex = rowIndex;
        const row = this.rows[rowIndex];
        fish.yMin = row.swimYMin;
        fish.yMax = row.swimYMax;
        rowCounts[rowIndex]++;
        preassignedCount++;
        
        // 确保Y坐标在行范围内
        if (fish.y < row.swimYMin || fish.y > row.swimYMax) {
          const oldY = fish.y;
          fish.y = row.swimYMin + Math.random() * (row.swimYMax - row.swimYMin);
          console.log(`🔧 Fish #${index} Y adjusted: ${Math.floor(oldY)} → ${Math.floor(fish.y)} (row ${rowIndex}: ${Math.floor(row.swimYMin)}-${Math.floor(row.swimYMax)})`);
        }
        
        delete fish.preassignedRowIndex; // 清除临时标记
        return;
      }
      
      // If preserveDistribution is true, assign rows without moving fish positions
      // This prevents fish from being moved to upper screen after refresh
      if (preserveDistribution) {
        // Find which row contains the fish's current Y position
        // If fish is outside all rows, assign to closest row but don't move the fish
        let rowIndex = 0;
        let foundRow = false;
        
        if (fish.y !== undefined && fish.y >= 0) {
          // Try to find the row that contains this Y position
          for (let i = 0; i < this.rows.length; i++) {
            const row = this.rows[i];
            if (fish.y >= row.swimYMin && fish.y <= row.swimYMax) {
              rowIndex = i;
              foundRow = true;
              break;
            }
          }
          
          // If not found, assign to closest row based on Y position
          if (!foundRow) {
            // 🔧 使用逻辑高度而非实际像素高度
            const totalHeight = this.canvas.logicalHeight || this.canvas.height;
            const yProportion = Math.max(0, Math.min(1, fish.y / totalHeight));
            rowIndex = Math.min(
              Math.floor(yProportion * TANK_LAYOUT.rows),
              TANK_LAYOUT.rows - 1
            );
          }
        } else {
          // 🔧 改进：使用更均匀的分配算法，而不是简单取模
          // 找到当前鱼数最少的行
          let minCount = Math.min(...rowCounts);
          let availableRows = rowCounts.map((count, idx) => count === minCount ? idx : -1).filter(idx => idx >= 0);
          // 在鱼数最少的行中随机选择一个
          rowIndex = availableRows[Math.floor(Math.random() * availableRows.length)];
        }
        
        // Assign row but DON'T move the fish - keep its current Y position
        fish.rowIndex = rowIndex;
        const row = this.rows[rowIndex];
        fish.yMin = row.swimYMin;
        fish.yMax = row.swimYMax;
        rowCounts[rowIndex]++;
        
        // Don't modify fish.y - keep it at its current position
        // The fish will be constrained by updateFishPosition during animation
        return;
      }
      
      // Determine which row this fish belongs to based on its current Y position
      // This allows fish to maintain their random initial positions
      if (fish.y !== undefined && fish.y >= 0) {
        // Find the row that contains this Y position
        let assignedRowIndex = 0;
        for (let i = 0; i < this.rows.length; i++) {
          const row = this.rows[i];
          if (fish.y >= row.swimYMin && fish.y <= row.swimYMax) {
            assignedRowIndex = i;
            break;
          }
        }
        
        // If fish is outside all rows, calculate row based on Y position proportion
        // This ensures even distribution instead of all going to first row
        if (assignedRowIndex === 0 && fish.y < this.rows[0].swimYMin) {
          // Calculate which row based on Y position proportion
          // 🔧 使用逻辑高度而非实际像素高度
          const totalHeight = this.canvas.logicalHeight || this.canvas.height;
          const yProportion = fish.y / totalHeight;
          assignedRowIndex = Math.min(
            Math.floor(yProportion * TANK_LAYOUT.rows),
            TANK_LAYOUT.rows - 1
          );
        } else if (fish.y > this.rows[this.rows.length - 1].swimYMax) {
          assignedRowIndex = this.rows.length - 1;
        }
        
        fish.rowIndex = assignedRowIndex;
        const row = this.rows[assignedRowIndex];
        fish.yMin = row.swimYMin;
        fish.yMax = row.swimYMax;
        rowCounts[assignedRowIndex]++;
        
        // Only adjust Y if fish is significantly outside the row bounds
        // But don't move fish that are already in a reasonable position
        if (fish.y < row.swimYMin - 10) {
          fish.y = row.swimYMin + Math.random() * TANK_LAYOUT.swimZone.height;
        } else if (fish.y > row.swimYMax + 10) {
          fish.y = row.swimYMax - Math.random() * TANK_LAYOUT.swimZone.height;
        }
      } else {
        // 🔧 改进：如果鱼没有Y坐标，使用均匀分配算法
        // 找到当前鱼数最少的行
        let minCount = Math.min(...rowCounts);
        let availableRows = rowCounts.map((count, idx) => count === minCount ? idx : -1).filter(idx => idx >= 0);
        // 在鱼数最少的行中随机选择一个
        const rowIndex = availableRows[Math.floor(Math.random() * availableRows.length)];
        
        fish.rowIndex = rowIndex;
        const row = this.rows[rowIndex];
        fish.yMin = row.swimYMin;
        fish.yMax = row.swimYMax;
        rowCounts[rowIndex]++;
        
        // Place fish randomly within its row's swim zone
        fish.y = row.swimYMin + Math.random() * TANK_LAYOUT.swimZone.height;
      }
    });
    
    const summary = {
      totalFish: fishes.length,
      totalRows: this.rows.length,
      rowCounts: rowCounts,
      preassignedCount: preassignedCount,
      minPerRow: Math.min(...rowCounts),
      maxPerRow: Math.max(...rowCounts),
      avgPerRow: (fishes.length / this.rows.length).toFixed(1)
    };
    
    // 🔧 详细的每行分布信息
    const rowDistribution = rowCounts.map((count, idx) => `Row${idx}:${count}`).join(', ');
    
    if (preserveDistribution) {
      console.log(`✅ Assigned ${fishes.length} fish to ${TANK_LAYOUT.rows} rows (preserving distribution)`);
      console.log(`📊 Distribution: [${rowDistribution}] | Min:${summary.minPerRow}, Max:${summary.maxPerRow}, Avg:${summary.avgPerRow}, Preassigned:${preassignedCount}`);
    } else {
      console.log(`Assigned ${fishes.length} fish to ${TANK_LAYOUT.rows} rows based on their positions`);
      console.log(`📊 Distribution: [${rowDistribution}] | Min:${summary.minPerRow}, Max:${summary.maxPerRow}, Avg:${summary.avgPerRow}`);
    }
    
    // 🔧 警告：如果某行鱼数量过多
    const maxReasonable = Math.ceil(fishes.length / this.rows.length) + 2;
    const problemRows = [];
    rowCounts.forEach((count, idx) => {
      if (count > maxReasonable) {
        problemRows.push(`Row${idx}(${count})`);
      }
    });
    
    if (problemRows.length > 0) {
      console.warn(`⚠️ Crowded rows detected: ${problemRows.join(', ')} (expected ~${summary.avgPerRow} per row)`);
    }
  }
  
  /**
   * Update fish position (constrain to swim zone)
   * @param {Object} fish - Fish object
   * @param {boolean} preservePosition - If true, don't move fish even if outside row bounds
   */
  updateFishPosition(fish, preservePosition = false) {
    if (fish.rowIndex !== undefined && this.rows[fish.rowIndex]) {
      if (!preservePosition) {
        this.rows[fish.rowIndex].constrainFishY(fish);
      }
      // If preservePosition is true, don't constrain - let fish stay where it is
    }
  }
  
  /**
   * Show a dialogue for a fish
   * @param {Object} fish - Fish object
   * @param {string} message - Dialogue message
   * @param {number} duration - Display duration in ms
   * @returns {boolean} - True if dialogue was shown
   */
  showDialogue(fish, message, duration = 5000) {
    if (fish.rowIndex === undefined || !this.rows[fish.rowIndex]) {
      console.error('Fish has no assigned row', fish);
      return false;
    }
    
    return this.rows[fish.rowIndex].showDialogue(fish, message, duration, this.ctx);
  }
  
  /**
   * Remove a dialogue for a fish
   * @param {string} fishId - Fish ID
   * @param {number} rowIndex - Row index (optional, will search all rows if not provided)
   */
  removeDialogue(fishId, rowIndex = null) {
    if (rowIndex !== null && this.rows[rowIndex]) {
      this.rows[rowIndex].removeDialogue(fishId);
    } else {
      // Search all rows
      for (const row of this.rows) {
        row.removeDialogue(fishId);
      }
    }
  }
  
  /**
   * Clear all dialogues from all rows
   */
  clearAllDialogues() {
    for (const row of this.rows) {
      // Get all active dialogue IDs before clearing
      const activeDialogueIds = Array.from(row.activeDialogues.keys());
      
      // Remove all dialogues
      for (const fishId of activeDialogueIds) {
        row.removeDialogue(fishId);
      }
      
      // Clear the queue as well
      row.dialogueQueue = [];
    }
    
    console.log('✅ All dialogues cleared');
  }
  
  /**
   * Render all dialogues in the tank
   */
  renderDialogues() {
    const now = Date.now();
    
    for (const row of this.rows) {
      for (const dialogue of row.getActiveDialogues()) {
        this.drawDialogueBubble(dialogue, now);
      }
    }
  }
  
  /**
   * Draw a single dialogue bubble
   * @param {Object} dialogue - Dialogue object
   * @param {number} now - Current timestamp
   */
  drawDialogueBubble(dialogue, now) {
    const ctx = this.ctx;
    
    // Calculate fade in/out
    const age = now - dialogue.createdAt;
    let opacity = 1.0;
    
    const fadeInDuration = 300;
    const fadeOutStart = dialogue.duration - 500;
    
    if (age < fadeInDuration) {
      // Fade in
      opacity = age / fadeInDuration;
    } else if (age > fadeOutStart) {
      // Fade out
      opacity = (dialogue.duration - age) / 500;
    }
    
    if (opacity <= 0) return;
    
    // 跟随鱼的位置浮动（X和Y坐标）
    let bubbleX = dialogue.x;
    let bubbleY = dialogue.y;
    
    if (dialogue.fish) {
      // 对话框X坐标：鱼的X坐标居中对齐，减去对话框宽度的一半
      bubbleX = dialogue.fish.x - dialogue.width / 2;
      
      // 对话框Y坐标：在鱼的上方显示，留出一定间距
      bubbleY = dialogue.fish.y - dialogue.height - 20;
      
      // 确保对话框不超出画布边界
      // 左边界
      if (bubbleX < 5) {
        bubbleX = 5;
      }
      // 右边界
      if (bubbleX + dialogue.width > this.canvas.width - 5) {
        bubbleX = this.canvas.width - dialogue.width - 5;
      }
      // 上边界
      if (bubbleY < 5) {
        bubbleY = 5;
      }
    }
    
    ctx.save();
    ctx.globalAlpha = opacity;
    
    // Personality-based colors
    const colors = this.getPersonalityColors(dialogue.personality);
    
    // Draw bubble background with gradient
    const gradient = ctx.createLinearGradient(
      bubbleX, bubbleY,
      bubbleX, bubbleY + dialogue.height
    );
    gradient.addColorStop(0, colors.gradientStart);
    gradient.addColorStop(1, colors.gradientEnd);
    
    ctx.fillStyle = gradient;
    
    // 更柔和的阴影效果
    ctx.shadowColor = 'rgba(0, 0, 0, 0.12)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 3;
    
    // Draw rounded rectangle
    const borderRadius = 16;
    this.roundRect(ctx, bubbleX, bubbleY, dialogue.width, dialogue.height, borderRadius);
    ctx.fill();
    
    // Draw border with cartoon style - 卡通描边
    ctx.strokeStyle = colors.border;
    ctx.lineWidth = 3;
    ctx.shadowBlur = 0;
    ctx.stroke();
    
    // 内部高光（卡通光泽效果）
    const highlightGradient = ctx.createLinearGradient(
      bubbleX, bubbleY,
      bubbleX, bubbleY + dialogue.height * 0.4
    );
    highlightGradient.addColorStop(0, 'rgba(255, 255, 255, 0.5)');
    highlightGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = highlightGradient;
    this.roundRect(ctx, bubbleX + 4, bubbleY + 4, dialogue.width - 8, dialogue.height * 0.3, borderRadius - 4);
    ctx.fill();
    
    // 添加小尾巴指向鱼（如果鱼存在）
    if (dialogue.fish) {
      ctx.fillStyle = gradient;
      ctx.shadowBlur = 6;
      ctx.shadowColor = 'rgba(0, 0, 0, 0.08)';
      
      // 计算尾巴位置（尾巴指向鱼的位置）
      const tailX = bubbleX + dialogue.width / 2;
      const tailY = bubbleY + dialogue.height;
      const tailWidth = 10;
      const tailHeight = 8;
      
      ctx.beginPath();
      ctx.moveTo(tailX - tailWidth / 2, tailY);
      ctx.lineTo(tailX, tailY + tailHeight);
      ctx.lineTo(tailX + tailWidth / 2, tailY);
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;
    }
    
    // Draw text with cartoon style - 卡通描边效果
    ctx.font = 'bold 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    
    // Word wrap text
    const padding = 14;
    const maxWidth = dialogue.width - padding * 2;
    const lines = this.wrapText(ctx, dialogue.text, maxWidth);
    
    const lineHeight = 20;
    const startY = bubbleY + (dialogue.height - lines.length * lineHeight) / 2;
    
    // 绘制文字描边和填充（卡通效果）
    lines.forEach((line, i) => {
      const x = bubbleX + padding;
      const y = startY + i * lineHeight;
      
      // 白色描边（让文字在任何背景上都清晰）
      ctx.strokeStyle = colors.textStroke;
      ctx.lineWidth = 3.5;
      ctx.lineJoin = 'round';
      ctx.miterLimit = 2;
      ctx.strokeText(line, x, y);
      
      // 文字填充
      ctx.fillStyle = colors.text;
      ctx.fillText(line, x, y);
    });
    
    ctx.restore();
  }
  
  /**
   * Get colors based on personality - 卡通化配色方案
   * @param {string} personality - Personality type
   * @returns {Object} - Color object
   */
  getPersonalityColors(personality) {
    const colorSchemes = {
      cheerful: {
        // 明亮的黄色系 - 欢快阳光
        gradientStart: 'rgba(255, 243, 150, 0.98)',
        gradientEnd: 'rgba(255, 224, 130, 0.98)',
        border: 'rgba(251, 192, 45, 0.8)',
        text: '#6D4C00',
        textStroke: '#FFFFFF'
      },
      shy: {
        // 清新的淡蓝色系 - 安静温柔
        gradientStart: 'rgba(230, 247, 255, 0.98)',
        gradientEnd: 'rgba(187, 222, 251, 0.98)',
        border: 'rgba(100, 181, 246, 0.8)',
        text: '#004D73',
        textStroke: '#FFFFFF'
      },
      brave: {
        // 鲜艳的红橙色系 - 活力勇敢
        gradientStart: 'rgba(255, 224, 224, 0.98)',
        gradientEnd: 'rgba(255, 183, 183, 0.98)',
        border: 'rgba(239, 83, 80, 0.8)',
        text: '#B71C1C',
        textStroke: '#FFFFFF'
      },
      lazy: {
        // 柔和的淡紫色系 - 懒洋洋
        gradientStart: 'rgba(243, 229, 255, 0.98)',
        gradientEnd: 'rgba(225, 190, 245, 0.98)',
        border: 'rgba(186, 104, 200, 0.8)',
        text: '#4A148C',
        textStroke: '#FFFFFF'
      },
      default: {
        // 默认：清爽的白色系
        gradientStart: 'rgba(255, 255, 255, 0.98)',
        gradientEnd: 'rgba(245, 245, 245, 0.98)',
        border: 'rgba(189, 189, 189, 0.8)',
        text: '#333333',
        textStroke: '#FFFFFF'
      }
    };
    
    return colorSchemes[personality] || colorSchemes.default;
  }
  
  /**
   * Draw a rounded rectangle
   */
  roundRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }
  
  /**
   * Wrap text to fit within max width - 支持中英文混合
   */
  wrapText(ctx, text, maxWidth) {
    // 确保使用与测量时相同的字体
    ctx.font = 'bold 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
    
    const lines = [];
    let currentLine = '';
    
    // 先尝试按空格分词（英文）
    const hasManySpaces = (text.match(/ /g) || []).length > text.length * 0.1;
    
    if (hasManySpaces) {
      // 主要是英文文本，按单词换行
      const words = text.split(' ');
      for (const word of words) {
        const testLine = currentLine + (currentLine ? ' ' : '') + word;
        const metrics = ctx.measureText(testLine);
        
        if (metrics.width > maxWidth && currentLine) {
          lines.push(currentLine);
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      }
    } else {
      // 主要是中文或混合文本，按字符换行
      for (let i = 0; i < text.length; i++) {
        const char = text[i];
        const testLine = currentLine + char;
        const metrics = ctx.measureText(testLine);
        
        if (metrics.width > maxWidth && currentLine) {
          lines.push(currentLine);
          currentLine = char;
        } else {
          currentLine = testLine;
        }
      }
    }
    
    if (currentLine) {
      lines.push(currentLine);
    }
    
    return lines; // 返回所有行，不再限制最多2行
  }
  
  /**
   * Get tank layout configuration (for debugging)
   * @returns {Object} - Layout config
   */
  getLayout() {
    return {
      rows: TANK_LAYOUT.rows,
      rowHeight: TANK_LAYOUT.rowHeight,
      dialogueZone: TANK_LAYOUT.dialogueZone,
      swimZone: TANK_LAYOUT.swimZone,
      slots: TANK_LAYOUT.dialogueSlots
    };
  }
  
  /**
   * Get statistics (for debugging)
   * @returns {Object} - Statistics
   */
  getStats() {
    const stats = {
      rows: [],
      totalActiveDialogues: 0,
      totalQueuedDialogues: 0
    };
    
    for (let i = 0; i < this.rows.length; i++) {
      const row = this.rows[i];
      const activeCount = row.activeDialogues.size;
      const queuedCount = row.dialogueQueue.length;
      
      stats.rows.push({
        index: i,
        active: activeCount,
        queued: queuedCount,
        availableSlots: row.availableSlots.length
      });
      
      stats.totalActiveDialogues += activeCount;
      stats.totalQueuedDialogues += queuedCount;
    }
    
    return stats;
  }
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { TankLayoutManager, TankRow, TANK_LAYOUT };
}

