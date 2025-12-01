/**
 * 批量更新预置鱼的artist名字
 * 将 xxx_xxx 格式改为更自然的昵称
 */

require('dotenv').config({ path: '.env.local' });
const fetch = require('node-fetch');

const HASURA_GRAPHQL_ENDPOINT = process.env.HASURA_GRAPHQL_ENDPOINT;
const HASURA_ADMIN_SECRET = process.env.HASURA_ADMIN_SECRET;

// 自然的昵称列表 - 看起来像真实用户
const USERNAMES = [
  // 简单昵称
  'FishLover88', 'OceanDreamer', 'AquaKid', 'BlueFin', 'CoralFan',
  'WaveMaster', 'SeaSprite', 'TideCaller', 'ReefRider', 'DeepDiver',
  
  // 可爱风格
  'BubbleBee', 'SplashyPaws', 'FishyWishy', 'GlubGlub', 'FinnFriend',
  'AquaBuddy', 'WaterWisp', 'OceanSoul', 'SeaHeart', 'WaveDancer',
  
  // 创意组合
  'Captain_Fins', 'Sir_Swims', 'Lady_Bubbles', 'King_Neptune', 'Queen_Coral',
  'Lord_Splash', 'Princess_Pearl', 'Duke_Wave', 'Baron_Blue', 'Count_Aqua',
  
  // 简单英文名
  'Alex', 'Sam', 'Jordan', 'Taylor', 'Morgan', 'Casey', 'Jamie', 'Riley',
  'Charlie', 'Avery', 'Quinn', 'Blake', 'Reese', 'Skylar', 'Parker',
  
  // 带数字的昵称
  'Fisher99', 'Ocean2024', 'Aqua777', 'Wave123', 'Blue456', 
  'Coral88', 'Reef2023', 'Sea999', 'Tide555', 'Deep333',
  
  // 游戏风格
  'xFishMasterx', 'ProSwimmer', 'AquaLegend', 'OceanKing', 'SeaChamp',
  'WaveHero', 'ReefKnight', 'TideWarrior', 'DeepHunter', 'CoralGuard',
  
  // 随意昵称
  'just_swimming', 'fish_fan', 'ocean_vibes', 'water_world', 'sea_breeze',
  'blue_mood', 'wave_rider', 'reef_lover', 'deep_thoughts', 'coral_dreams',
  
  // 可爱叠字
  'Fishyfish', 'Bubububble', 'Splasplash', 'Swimswimswim', 'Glubglub',
  
  // 表情符号风格（用文字）
  'FishySmile', 'HappySwimmer', 'CoolWaves', 'LuckyFin', 'ChillFish',
  
  // 更多创意
  'AquaAddict', 'OceanObsessed', 'FishFanatic', 'WaterWizard', 'SeaSorcerer',
  'TideTamer', 'ReefRuler', 'DeepDweller', 'CoralCollector', 'WaveWhisperer',
  
  // 简短可爱
  'Fin', 'Gill', 'Splash', 'Wave', 'Reef', 'Tide', 'Deep', 'Blue',
  'Aqua', 'Ocean', 'Sea', 'Coral', 'Pearl', 'Shell', 'Marina',
  
  // 组合风格
  'TheRealFish', 'FishingAround', 'JustSwimming', 'RandomSwimmer', 'CasualDiver',
  'EverydayFish', 'SimplySea', 'PurelyAqua', 'TotallyOcean', 'LiterallyFish',
  
  // 地域风格
  'PacificDreamer', 'AtlanticFan', 'MediterraneanKid', 'CaribbeanSoul', 'CoralSeaLover',
  
  // 时间风格
  'MidnightSwimmer', 'DawnDiver', 'SunsetWave', 'MorningTide', 'EveningReef',
  
  // 颜色+名词
  'BlueFish', 'RedWave', 'GreenReef', 'YellowFin', 'PurpleOcean',
  'OrangeCoral', 'PinkPearl', 'GoldShell', 'SilverScale', 'RainbowFish',
  
  // 更多随机
  'FishPerson', 'WaterBeing', 'AquaHuman', 'OceanSoul88', 'SeaSpirit99',
  'TideVibes', 'ReefEnergy', 'WaveFeeling', 'DeepMood', 'CoralAura'
];

// 生成昵称（带一些随机变化）
function generateUsername(index) {
  const baseName = USERNAMES[index % USERNAMES.length];
  
  // 50%概率直接使用
  if (Math.random() < 0.5) {
    return baseName;
  }
  
  // 30%概率加数字
  if (Math.random() < 0.6) {
    const num = Math.floor(Math.random() * 999) + 1;
    return `${baseName}${num}`;
  }
  
  // 20%概率加下划线和数字
  const num = Math.floor(Math.random() * 99) + 1;
  return `${baseName}_${num}`;
}

async function getFishWithUnderscoreArtists() {
  console.log('🔍 查询artist为下划线格式的鱼...\n');
  
  const query = `
    query GetFishWithUnderscoreArtists {
      fish(where: {
        artist: { _regex: "^[a-z]+_[a-z]+$" }
      }, limit: 2000) {
        id
        artist
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

async function updateArtistName(fishId, newArtist) {
  const mutation = `
    mutation UpdateArtistName($id: uuid!, $artist: String!) {
      update_fish_by_pk(
        pk_columns: { id: $id }
        _set: { artist: $artist }
      ) {
        id
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
      body: JSON.stringify({
        query: mutation,
        variables: { id: fishId, artist: newArtist }
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

async function updateAllArtistNames() {
  console.log('👤 开始批量更新artist名字...\n');
  
  try {
    // 获取所有需要更新的鱼
    const fishList = await getFishWithUnderscoreArtists();
    console.log(`📊 找到 ${fishList.length} 条需要更新artist的鱼\n`);
    
    if (fishList.length === 0) {
      console.log('✅ 所有鱼的artist都已经是合理格式！');
      return;
    }
    
    // 显示一些当前的artist示例
    console.log('当前artist格式示例:');
    fishList.slice(0, 5).forEach(f => {
      console.log(`   - "${f.artist}"`);
    });
    console.log('');
    
    let successCount = 0;
    let failCount = 0;
    
    console.log('开始更新...\n');
    
    for (let i = 0; i < fishList.length; i++) {
      const fish = fishList[i];
      const newArtist = generateUsername(i);
      
      const result = await updateArtistName(fish.id, newArtist);
      
      if (result) {
        successCount++;
        if (successCount % 50 === 0) {
          console.log(`✓ 已更新 ${successCount} 条...`);
        }
      } else {
        failCount++;
      }
      
      // 每10条休息一下
      if (i % 10 === 9) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    console.log('\n' + '='.repeat(50));
    console.log('📊 更新完成！');
    console.log(`✅ 成功: ${successCount} 条`);
    console.log(`❌ 失败: ${failCount} 条`);
    console.log('='.repeat(50));
    
    // 显示新的artist示例
    console.log('\n📝 新artist格式示例:');
    const samples = [];
    for (let i = 0; i < 10; i++) {
      samples.push(generateUsername(i));
    }
    samples.forEach((name, i) => {
      console.log(`   ${i + 1}. ${name}`);
    });
    
  } catch (error) {
    console.error('❌ 执行出错:', error.message);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  updateAllArtistNames();
}

module.exports = { updateAllArtistNames, generateUsername };

