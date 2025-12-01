/**
 * 为预置的鱼批量更新合理的名字
 * 将类似 #b12ab97d 的ID显示改为普通用户可能取的鱼名
 */

require('dotenv').config({ path: '.env.local' });
const fetch = require('node-fetch');

const HASURA_GRAPHQL_ENDPOINT = process.env.HASURA_GRAPHQL_ENDPOINT;
const HASURA_ADMIN_SECRET = process.env.HASURA_ADMIN_SECRET;

// 常见的鱼名列表 - 看起来像用户自己取的
const FISH_NAMES = [
  // 可爱系列
  'Bubbles', 'Nemo', 'Dory', 'Goldie', 'Sparkle', 'Sunny', 'Lucky', 'Happy',
  'Angel', 'Baby', 'Cutie', 'Sweetie', 'Tiny', 'Luna', 'Star', 'Pearl',
  
  // 颜色系列
  'Blue', 'Red', 'Orange', 'Yellow', 'Rainbow', 'Silver', 'Gold', 'Ruby',
  'Sapphire', 'Coral', 'Amber', 'Azure', 'Crimson', 'Jade', 'Violet',
  
  // 速度/动作系列
  'Flash', 'Dash', 'Speedy', 'Swift', 'Zoom', 'Turbo', 'Rocket', 'Lightning',
  'Bolt', 'Blitz', 'Rush', 'Zippy', 'Quick', 'Rapid',
  
  // 性格系列
  'Sassy', 'Cheeky', 'Brave', 'Shy', 'Grumpy', 'Jolly', 'Sleepy', 'Snappy',
  'Feisty', 'Gentle', 'Peppy', 'Mellow', 'Spunky', 'Chill',
  
  // 食物系列
  'Cookie', 'Muffin', 'Cupcake', 'Waffle', 'Taco', 'Sushi', 'Noodle', 'Mochi',
  'Dumpling', 'Biscuit', 'Pudding', 'Jellybean', 'Marshmallow',
  
  // 自然系列
  'Ocean', 'Wave', 'River', 'Storm', 'Cloud', 'Thunder', 'Breeze', 'Tide',
  'Coral', 'Reef', 'Stream', 'Marina', 'Bay', 'Splash',
  
  // 王者/战士系列
  'King', 'Queen', 'Prince', 'Duke', 'Knight', 'Warrior', 'Champion', 'Hero',
  'Captain', 'Admiral', 'General', 'Commander', 'Boss', 'Chief',
  
  // 神话/传说系列
  'Zeus', 'Poseidon', 'Neptune', 'Thor', 'Odin', 'Apollo', 'Atlas', 'Phoenix',
  'Dragon', 'Griffin', 'Titan', 'Kraken', 'Hydra', 'Triton',
  
  // 宝石系列
  'Diamond', 'Emerald', 'Topaz', 'Opal', 'Onyx', 'Quartz', 'Crystal', 'Jewel',
  
  // 可爱英文名
  'Charlie', 'Max', 'Lily', 'Lucy', 'Oliver', 'Bella', 'Oscar', 'Milo',
  'Chloe', 'Finn', 'Daisy', 'Leo', 'Sophie', 'Jack', 'Molly', 'Sam',
  
  // 更多创意名字
  'Bubba', 'Finley', 'Gillbert', 'Scales', 'Flipper', 'Finnie', 'Gill',
  'Aqua', 'Neptune Jr', 'Sploosh', 'Glub', 'Bubble Tea', 'Mr. Fish',
  'Lady Fish', 'Sir Swims', 'Captain Fin', 'Admiral Wave', 'King Splash',
  
  // 游戏风格
  'Shadow', 'Blaze', 'Frost', 'Viper', 'Striker', 'Hunter', 'Ghost', 'Rogue',
  'Nova', 'Echo', 'Pulse', 'Ninja', 'Phantom', 'Ranger', 'Ace',
  
  // 可爱叠字
  'Kiki', 'Momo', 'Coco', 'Lulu', 'Koko', 'Mimi', 'Nana', 'Bibi', 'Didi',
  
  // 季节/时间
  'Summer', 'Winter', 'Autumn', 'Spring', 'Dawn', 'Dusk', 'Midnight', 'Sunset',
  
  // 额外的流行名字
  'Buddy', 'Champ', 'Scout', 'Rocky', 'Tiger', 'Bear', 'Wolf', 'Fox',
  'Panda', 'Kiwi', 'Mango', 'Peach', 'Cherry', 'Apple', 'Berry',
  
  // 更多创意
  'Pixel', 'Byte', 'Chip', 'Sprite', 'Nova', 'Orbit', 'Comet', 'Meteor',
  'Nebula', 'Galaxy', 'Cosmo', 'Astro', 'Luna', 'Sol', 'Stella'
];

// 生成随机名字（带编号以确保唯一性）
function generateFishName(index) {
  const baseName = FISH_NAMES[index % FISH_NAMES.length];
  
  // 30%概率不加后缀
  if (Math.random() < 0.3) {
    return baseName;
  }
  
  // 40%概率加数字
  if (Math.random() < 0.6) {
    const num = Math.floor(Math.random() * 999) + 1;
    return `${baseName}${num}`;
  }
  
  // 30%概率加罗马数字
  const romanNumerals = ['II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
  const roman = romanNumerals[Math.floor(Math.random() * romanNumerals.length)];
  return `${baseName} ${roman}`;
}

async function getFishWithoutNames() {
  console.log('🔍 查询需要更新名字的鱼（"Fish by xxx"格式）...\n');
  
  const query = `
    query GetFishWithoutNames {
      fish(where: {
        _or: [
          { fish_name: { _is_null: true } },
          { fish_name: { _eq: "" } },
          { fish_name: { _like: "Fish by %" } }
        ]
      }, limit: 2000) {
        id
        fish_name
        artist
      }
    }
  `;
  
  try {
    const response = await fetch(HASURA_GRAPHQL_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-hasura-admin-secret': HASURA_ADMIN_SECRET
      },
      body: JSON.stringify({ query })
    });
    
    const result = await response.json();
    
    if (result.errors) {
      throw new Error(JSON.stringify(result.errors));
    }
    
    return result.data.fish;
  } catch (error) {
    console.error('❌ 查询失败:', error.message);
    throw error;
  }
}

async function updateFishName(fishId, newName) {
  const mutation = `
    mutation UpdateFishName($id: uuid!, $name: String!) {
      update_fish_by_pk(
        pk_columns: { id: $id }
        _set: { fish_name: $name }
      ) {
        id
        fish_name
      }
    }
  `;
  
  try {
    const response = await fetch(HASURA_GRAPHQL_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-hasura-admin-secret': HASURA_ADMIN_SECRET
      },
      body: JSON.stringify({
        query: mutation,
        variables: { id: fishId, name: newName }
      })
    });
    
    const result = await response.json();
    
    if (result.errors) {
      throw new Error(JSON.stringify(result.errors));
    }
    
    return result.data.update_fish_by_pk;
  } catch (error) {
    console.error(`❌ 更新失败 (${fishId}):`, error.message);
    return null;
  }
}

async function updateAllFishNames() {
  console.log('🐟 开始批量更新鱼名...\n');
  
  try {
    // 获取所有需要更新的鱼
    const fishList = await getFishWithoutNames();
    console.log(`📊 找到 ${fishList.length} 条需要更新的鱼\n`);
    
    if (fishList.length === 0) {
      console.log('✅ 所有鱼都已有名字！');
      return;
    }
    
    // 打乱鱼名列表，使名字分配更随机
    const shuffledNames = [...FISH_NAMES].sort(() => Math.random() - 0.5);
    
    let successCount = 0;
    let failCount = 0;
    
    console.log('开始更新...\n');
    
    for (let i = 0; i < fishList.length; i++) {
      const fish = fishList[i];
      const newName = generateFishName(i);
      
      const result = await updateFishName(fish.id, newName);
      
      if (result) {
        successCount++;
        if (successCount % 50 === 0) {
          console.log(`✓ 已更新 ${successCount} 条...`);
        }
      } else {
        failCount++;
      }
      
      // 每10条休息一下，避免请求过快
      if (i % 10 === 9) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    console.log('\n' + '='.repeat(50));
    console.log('📊 更新完成！');
    console.log(`✅ 成功: ${successCount} 条`);
    console.log(`❌ 失败: ${failCount} 条`);
    console.log('='.repeat(50));
    
    // 显示一些示例
    console.log('\n📝 名字示例:');
    const samples = fishList.slice(0, 10).map((fish, i) => generateFishName(i));
    samples.forEach((name, i) => {
      console.log(`   ${i + 1}. ${name}`);
    });
    
  } catch (error) {
    console.error('❌ 执行出错:', error.message);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  updateAllFishNames();
}

module.exports = { updateAllFishNames, generateFishName };

