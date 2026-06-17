const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

// ============================================
// 1. 加载JSON配置文件（Git驱动的可配置系统）
// ============================================
const CONFIG_DIR = path.join(__dirname, 'config');

function loadJSONConfig(filename) {
  try {
    const filePath = path.join(CONFIG_DIR, filename);
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
  } catch (e) {
    console.log(`[配置加载] ${filename} 不存在或加载失败，使用默认值`);
  }
  return null;
}

const wordBankConfig = loadJSONConfig('wordBank.json');
const synonymsConfig = loadJSONConfig('synonyms.json');
const hintsConfig = loadJSONConfig('hints.json');
const similarityMapConfig = loadJSONConfig('similarityMap.json');

console.log('[配置系统] JSON配置文件已加载');

// ============================================
// 2. 词库系统（过滤单字词，只保留>=2字）
// ============================================
const CATEGORIES = wordBankConfig ? wordBankConfig.categories : {
  animals: ['老虎', '狮子', '大象', '熊猫', '猴子', '兔子', '猫咪', '狗狗'],
  food: ['苹果', '香蕉', '橙子', '葡萄', '西瓜', '草莓', '芒果', '菠萝'],
  profession: ['教师', '医生', '护士', '警察', '消防员', '厨师', '司机'],
  transportation: ['汽车', '火车', '飞机', '轮船', '地铁', '高铁', '自行车'],
  electronics: ['手机', '电脑', '平板', '电视', '冰箱', '空调', '洗衣机'],
  sports: ['足球', '篮球', '排球', '网球', '羽毛球', '乒乓球', '游泳'],
  nature: ['太阳', '月亮', '星星', '云朵', '彩虹', '大海', '河流'],
  daily: ['牙刷', '毛巾', '镜子', '眼镜', '雨伞', '帽子', '鞋子'],
  places: ['学校', '医院', '商场', '公园', '电影院', '餐厅', '酒店'],
  abstract: ['爱情', '友情', '梦想', '希望', '幸福', '快乐', '时间'],
  idiom: ['守株待兔', '亡羊补牢', '画蛇添足', '对牛弹琴', '掩耳盗铃'],
  anime: ['火影忍者', '海贼王', '龙珠', '柯南', '皮卡丘', '哆啦A梦'],
  game: ['王者荣耀', '英雄联盟', '吃鸡', '原神', '崩坏', '我的世界'],
  movie: ['泰坦尼克号', '阿凡达', '复仇者联盟', '钢铁侠', '蜘蛛侠'],
  brand: ['苹果', '华为', '小米', '耐克', '阿迪达斯', '星巴克']
};

// 分类中文名映射
const CATEGORY_NAMES = {
  animals: '动物',
  food: '水果',
  profession: '职业',
  transportation: '交通工具',
  electronics: '电器',
  sports: '运动',
  nature: '自然',
  daily: '日用品',
  places: '场所',
  abstract: '抽象',
  idiom: '成语',
  anime: '动漫',
  game: '游戏',
  movie: '电影',
  brand: '品牌'
};

// ============================================
// ✨ 重写：智能提示系统（兜底机制）
// ============================================
const WORD_HINTS = hintsConfig ? hintsConfig : {};

// 获取词语分类
function getWordCategory(word) {
  for (const [category, words] of Object.entries(CATEGORIES)) {
    if (words.includes(word)) {
      return CATEGORY_NAMES[category] || category;
    }
  }
  return '词语';
}

// 获取拼音首字母（简单实现）
function getFirstPinyin(word) {
  const firstChar = word.charAt(0);
  // 简单映射常用字
  const pinyinMap = {
    '老': 'L', '狮': 'S', '大': 'D', '熊': 'X', '猴': 'H', '兔': 'T', '猫': 'M', '狗': 'G',
    '苹': 'P', '香': 'X', '橙': 'C', '葡': 'P', '西': 'X', '草': 'C', '芒': 'M', '菠': 'B',
    '教': 'J', '医': 'Y', '护': 'H', '警': 'J', '消': 'X', '厨': 'C', '司': 'S',
    '汽': 'Q', '火': 'H', '飞': 'F', '轮': 'L', '地': 'D', '高': 'G', '自': 'Z',
    '手': 'S', '电': 'D', '平': 'P', '冰': 'B', '空': 'K', '洗': 'X',
    '足': 'Z', '篮': 'L', '排': 'P', '网': 'W', '羽': 'Y', '乒': 'P', '游': 'Y',
    '太': 'T', '月': 'Y', '星': 'X', '云': 'Y', '彩': 'C', '海': 'H', '河': 'H',
    '牙': 'Y', '毛': 'M', '镜': 'J', '眼': 'Y', '雨': 'Y', '帽': 'M', '鞋': 'X',
    '学': 'X', '医': 'Y', '商': 'S', '公': 'G', '电': 'D', '餐': 'C', '酒': 'J',
    '爱': 'A', '友': 'Y', '梦': 'M', '希': 'X', '幸': 'X', '快': 'K', '时': 'S',
    '守': 'S', '亡': 'W', '画': 'H', '对': 'D', '掩': 'Y',
    '华': 'H', '小': 'X', '耐': 'N', '阿': 'A', '星': 'X'
  };
  return pinyinMap[firstChar] || firstChar;
}

// ✨ 智能获取提示（兜底机制）
function getSmartHints(word, category) {
  // 优先使用预定义提示
  if (WORD_HINTS[word] && WORD_HINTS[word].length >= 3) {
    return WORD_HINTS[word];
  }
  
  // 兜底机制：自动生成3个有用的提示
  const categoryName = CATEGORY_NAMES[category] || getWordCategory(word);
  const wordLength = word.length;
  const firstLetter = getFirstPinyin(word);
  
  return [
    categoryName,                    // 第1个提示：分类
    `${wordLength}个字`,             // 第2个提示：字数
    `首字母${firstLetter}`           // 第3个提示：拼音首字母
  ];
}

console.log('[提示系统] 智能提示已加载，支持兜底机制');

// ============================================
// 同义词库
// ============================================
const SYNONYMS = synonymsConfig ? synonymsConfig : {
  '苹果': ['红富士', '蛇果', '水果'],
  '教师': ['老师', '教授', '教员', '导师'],
  '医生': ['大夫', '医师', '白衣天使'],
  '手机': ['电话', '智能手机', '移动电话'],
  '电脑': ['计算机', 'PC', '微机', '笔记本']
};

function getAllWords() {
  const allWords = [];
  for (const [category, words] of Object.entries(CATEGORIES)) {
    for (const word of words) {
      if (word.length >= 2) {
        allWords.push({ word, category });
      }
    }
  }
  return allWords;
}

let ALL_WORDS = getAllWords();
const TOTAL_WORDS = ALL_WORDS.length;

function shuffleArray(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1) + Date.now() % 100 / 100) % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

ALL_WORDS = shuffleArray(ALL_WORDS);

function getRandomWord() {
  if (Math.random() > 0.7) {
    ALL_WORDS = shuffleArray(ALL_WORDS);
  }
  const timeSeed = Date.now() % 1000;
  const random1 = Math.random();
  const random2 = Math.random();
  const combinedRandom = (random1 * 0.6 + random2 * 0.3 + timeSeed / 3000 * 0.1);
  const index = Math.floor(combinedRandom * ALL_WORDS.length) % ALL_WORDS.length;
  return ALL_WORDS[index];
}

function getCategories() {
  return Object.keys(CATEGORIES);
}

console.log(`[词库] 已加载 ${TOTAL_WORDS} 个词汇（全部>=2字）, ${getCategories().length} 个分类`);
console.log(`[随机测试] 启动测试选词: ${getRandomWord().word}, ${getRandomWord().word}, ${getRandomWord().word}`);

// ============================================
// 6. AI智能相似度算法
// ============================================
const AI_CACHE = new Map();
const AI_CACHE_TTL = 24 * 60 * 60 * 1000;

async function calculateSimilarity(guess, answer) {
  const cacheKey = `${guess.trim().toLowerCase()}|${answer.trim().toLowerCase()}`;
  
  const cached = AI_CACHE.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < AI_CACHE_TTL) {
    return cached.result;
  }
  
  const score = smartHeuristicCalculation(guess, answer);
  const result = normalizeAIScore(score, guess, answer);
  
  AI_CACHE.set(cacheKey, { result, timestamp: Date.now() });
  return result;
}

function smartHeuristicCalculation(guess, answer) {
  const g = guess.trim().toLowerCase();
  const a = answer.trim().toLowerCase();
  
  if (g === a) return 100;
  
  for (const [main, syns] of Object.entries(SYNONYMS)) {
    if ((main === a && syns.includes(g)) || (main === g && syns.includes(a))) {
      return 95 + Math.floor(Math.random() * 6);
    }
  }
  
  if (g.includes(a)) {
    return 85 + Math.floor(Math.random() * 6);
  }
  if (a.includes(g) && g.length >= 2) {
    return 75 + Math.floor(Math.random() * 6);
  }
  
  for (const cats of Object.values(CATEGORIES)) {
    if (cats.some(c => c.toLowerCase() === g) && cats.some(c => c.toLowerCase() === a)) {
      return 65 + Math.floor(Math.random() * 16);
    }
  }
  
  const associations = similarityMapConfig ? similarityMapConfig.associations : {
    '苹果': { '水果': 85, '香蕉': 65, '红色': 50 },
    '教师': { '学生': 70, '学校': 65, '教育': 75 },
    '医生': { '医院': 75, '病人': 70, '护士': 60 },
    '手机': { '电话': 95, '拍照': 60, '微信': 65 },
    '电脑': { '键盘': 65, '鼠标': 65, '上网': 60 },
    '爱情': { '恋爱': 85, '喜欢': 75, '浪漫': 70 }
  };
  
  if (associations[a] && associations[a][g]) {
    return associations[a][g] + Math.floor(Math.random() * 10) - 5;
  }
  if (associations[g] && associations[g][a]) {
    return associations[g][a] + Math.floor(Math.random() * 10) - 5;
  }
  
  const generalAssoc = similarityMapConfig ? similarityMapConfig.generalAssociations : {
    '吃': ['食物', '饭', '饿', '美味'],
    '喝': ['水', '饮料', '渴', '茶'],
    '玩': ['游戏', '开心', '娱乐']
  };
  
  for (const [key, values] of Object.entries(generalAssoc)) {
    if ((key === g && values.includes(a)) || (key === a && values.includes(g))) {
      return 30 + Math.floor(Math.random() * 16);
    }
  }
  
  return 15 + Math.floor(Math.random() * 11);
}

function normalizeAIScore(score, guess, answer) {
  let normalized = Math.max(0, Math.min(100, Math.round(score)));
  
  if (guess.trim().toLowerCase() === answer.trim().toLowerCase()) {
    normalized = 100;
  }
  
  let reason = '';
  if (normalized >= 90) reason = '非常接近！';
  else if (normalized >= 70) reason = '很接近了！';
  else if (normalized >= 50) reason = '有点关联！';
  else if (normalized >= 30) reason = '勉强相关';
  else if (normalized >= 15) reason = '微相关';
  else reason = '不太相关';
  
  return {
    score: normalized,
    isCorrect: normalized >= 85,
    reason: reason
  };
}

// ============================================
// Express + WebSocket 服务器
// ============================================
const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const FRONTEND_URL = process.env.FRONTEND_URL || '*';
app.use(cors({
  origin: FRONTEND_URL,
  credentials: true
}));
app.use(express.json());

if (fs.existsSync(path.join(__dirname, '../frontend/dist'))) {
  app.use(express.static(path.join(__dirname, '../frontend/dist')));
}

// ============================================
// 核心配置
// ============================================
const ROOM_EXPIRE_TIME = 2 * 60 * 60 * 1000;
const USER_OFFLINE_TIMEOUT = 30 * 1000;
const SKIP_VOTE_THRESHOLD = 0.75;

const rooms = new Map();
const clients = new Map();
const userReconnectTimers = new Map();

function generateId() {
  return Math.random().toString(36).substring(2, 10);
}

function generateToken() {
  return 'user_' + Math.random().toString(36).substring(2, 15);
}

setInterval(() => {
  const now = Date.now();
  rooms.forEach((room, roomId) => {
    const roomAge = now - room.createdAt;
    const hasActiveUsers = room.users.some(u => u.online);
    if (roomAge > ROOM_EXPIRE_TIME && !hasActiveUsers) {
      rooms.delete(roomId);
    }
  });
}, 5 * 60 * 1000);

function broadcastToRoom(roomId, message, excludeClientId = null) {
  const room = rooms.get(roomId);
  if (!room) return;
  
  room.users.forEach(user => {
    if (!user.online) return;
    if (excludeClientId && user.clientId === excludeClientId) return;
    
    const client = clients.get(user.clientId);
    if (client && client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
    }
  });
}

// ============================================
// 🏆 排行榜功能
// ============================================
function getLeaderboard(room) {
  const sorted = [...room.users]
    .sort((a, b) => (b.correctCount || 0) - (a.correctCount || 0))
    .map((user, index) => ({
      id: user.id,
      nickname: user.nickname,
      correctCount: user.correctCount || 0,
      rank: index + 1,
      online: user.online
    }));
  
  return sorted;
}

function broadcastLeaderboard(roomId) {
  const room = rooms.get(roomId);
  if (!room) return;
  
  broadcastToRoom(roomId, {
    type: 'LEADERBOARD_UPDATE',
    data: {
      leaderboard: getLeaderboard(room)
    }
  });
}

// ============================================
// 获取完整游戏状态
// ============================================
function getFullGameState(roomId) {
  const room = rooms.get(roomId);
  if (!room) return null;
  
  return {
    roomId: room.id,
    users: room.users.map(u => ({
      id: u.id,
      nickname: u.nickname,
      online: u.online
    })),
    currentCategory: room.currentCategory,
    wordLength: room.currentWord ? room.currentWord.length : 0,
    round: room.round,
    guesses: room.guesses,
    guessCount: room.guessCount,
    aiHints: room.aiHints,
    gameStarted: room.gameStarted,
    skipVote: getSkipVoteStatus(room),
    leaderboard: getLeaderboard(room)
  };
}

function getSkipVoteStatus(room) {
  const onlineUsers = room.users.filter(u => u.online).length;
  const votedCount = room.skipVotes ? room.skipVotes.size : 0;
  const percent = onlineUsers > 0 ? Math.round((votedCount / onlineUsers) * 100) : 0;
  
  return {
    votes: votedCount,
    total: onlineUsers,
    percent: percent,
    canSkip: percent >= SKIP_VOTE_THRESHOLD * 100
  };
}

// ============================================
// ✨ 重写：触发智能提示系统
// ============================================
function triggerHints(room) {
  const word = room.currentWord;
  const category = room.currentCategory;
  const hints = getSmartHints(word, category); // ✨ 使用智能提示
  const count = room.guessCount;
  
  console.log(`[提示系统] ${word} 提示: ${hints.join(', ')}`);
  
  // 第10次猜词：显示第1个提示（分类/上位词）
  if (count === 10 && room.aiHints.length === 0) {
    room.aiHints.push(hints[0]);
    console.log(`[提示] 第10次，显示: ${hints[0]}`);
  }
  
  // 第15次猜词：显示第2个提示（特征/属性）
  if (count === 15 && room.aiHints.length === 1) {
    room.aiHints.push(hints[1]);
    console.log(`[提示] 第15次，显示: ${hints[0]}, ${hints[1]}`);
  }
  
  // 第20次猜词：显示第3个提示（功能/用途）
  if (count === 20 && room.aiHints.length === 2) {
    room.aiHints.push(hints[2]);
    console.log(`[提示] 第20次，显示: ${hints.join(', ')}`);
  }
}

function startNewRound(roomId) {
  const room = rooms.get(roomId);
  if (!room) return;
  
  const { word, category } = getRandomWord();
  room.currentWord = word;
  room.currentCategory = category;
  room.round++;
  room.guesses = [];
  room.guessCount = 0;
  room.aiHints = [];
  room.skipVotes = new Set();
  room.gameStarted = true;
  
  const hints = getSmartHints(word, category);
  console.log(`[新一轮] 答案: ${word}, 分类: ${category}, 提示: ${hints.join(', ')}`);
  
  broadcastToRoom(roomId, {
    type: 'NEW_ROUND',
    data: {
      round: room.round,
      category: category,
      wordLength: word.length,
      guessCount: 0,
      aiHints: [],
      skipVote: getSkipVoteStatus(room)
    }
  });
}

function handleVoteSkip(clientId, { roomId }) {
  const normalizedRoomId = roomId.toUpperCase();
  const room = rooms.get(normalizedRoomId);
  if (!room) return;
  
  const user = room.users.find(u => u.clientId === clientId);
  if (!user) return;
  
  if (!room.skipVotes) {
    room.skipVotes = new Set();
  }
  
  room.skipVotes.add(user.id);
  const voteStatus = getSkipVoteStatus(room);
  
  broadcastToRoom(normalizedRoomId, {
    type: 'SKIP_VOTE_UPDATE',
    data: voteStatus
  });
  
  if (voteStatus.canSkip) {
    console.log(`[跳过本轮] 达到75%，答案: ${room.currentWord}`);
    broadcastToRoom(normalizedRoomId, {
      type: 'ROUND_SKIPPED',
      data: { correctWord: room.currentWord }
    });
    
    setTimeout(() => {
      if (rooms.has(normalizedRoomId)) {
        startNewRound(normalizedRoomId);
      }
    }, 3000);
  }
}

// ============================================
// WebSocket消息处理
// ============================================
wss.on('connection', (ws) => {
  const clientId = generateId();
  clients.set(clientId, ws);
  
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data);
      handleMessage(ws, clientId, message);
    } catch (e) {
      console.error('[消息错误]', e);
    }
  });
  
  ws.on('close', () => {
    handleDisconnect(clientId);
  });
  
  ws.on('error', () => {
    handleDisconnect(clientId);
  });
});

function handleMessage(ws, clientId, message) {
  const { type, data } = message;
  
  switch (type) {
    case 'PING':
      ws.send(JSON.stringify({ type: 'PONG' }));
      break;
    case 'CREATE_ROOM':
      handleCreateRoom(ws, clientId, data);
      break;
    case 'JOIN_ROOM':
      handleJoinRoom(ws, clientId, data);
      break;
    case 'MAKE_GUESS':
      handleMakeGuess(clientId, data);
      break;
    case 'VOTE_SKIP':
      handleVoteSkip(clientId, data);
      break;
    case 'LEAVE_ROOM':
      handleLeaveRoom(clientId, data);
      break;
  }
}

function handleCreateRoom(ws, clientId, { nickname }) {
  const roomId = generateId().toUpperCase();
  const userId = generateId();
  const token = generateToken();
  
  const user = {
    id: userId,
    clientId: clientId,
    nickname: nickname || '匿名玩家',
    token: token,
    online: true,
    correctCount: 0
  };
  
  const room = {
    id: roomId,
    users: [user],
    currentWord: null,
    currentCategory: null,
    round: 0,
    guesses: [],
    guessCount: 0,
    aiHints: [],
    skipVotes: new Set(),
    gameStarted: false,
    createdAt: Date.now()
  };
  
  rooms.set(roomId, room);
  startNewRound(roomId);
  
  ws.send(JSON.stringify({
    type: 'ROOM_CREATED',
    data: {
      roomId,
      token,
      userId,
      user: { id: userId, nickname: user.nickname },
      gameState: getFullGameState(roomId)
    }
  }));
}

function handleJoinRoom(ws, clientId, { roomId, nickname, token, userId }) {
  const normalizedRoomId = roomId.toUpperCase();
  const room = rooms.get(normalizedRoomId);
  
  if (!room) {
    ws.send(JSON.stringify({
      type: 'ERROR',
      data: { message: '房间不存在，请检查房间号' }
    }));
    return;
  }
  
  let existingUser = null;
  if (token) existingUser = room.users.find(u => u.token === token);
  if (!existingUser && userId) existingUser = room.users.find(u => u.id === userId);
  
  if (existingUser) {
    if (userReconnectTimers.has(existingUser.id)) {
      clearTimeout(userReconnectTimers.get(existingUser.id));
      userReconnectTimers.delete(existingUser.id);
    }
    existingUser.clientId = clientId;
    existingUser.online = true;
  } else {
    const newUserId = generateId();
    const newToken = token || generateToken();
    const user = {
      id: newUserId,
      clientId: clientId,
      nickname: nickname || '匿名玩家',
      token: newToken,
      online: true,
      correctCount: 0
    };
    room.users.push(user);
    existingUser = user;
  }
  
  broadcastToRoom(normalizedRoomId, {
    type: 'USER_JOINED',
    data: {
      user: { id: existingUser.id, nickname: existingUser.nickname },
      gameState: getFullGameState(normalizedRoomId)
    }
  }, clientId);
  
  ws.send(JSON.stringify({
    type: 'ROOM_JOINED',
    data: {
      roomId: normalizedRoomId,
      token: existingUser.token,
      userId: existingUser.id,
      user: { id: existingUser.id, nickname: existingUser.nickname },
      gameState: getFullGameState(normalizedRoomId)
    }
  }));
  
  if (!room.gameStarted) {
    startNewRound(normalizedRoomId);
  }
}

async function handleMakeGuess(clientId, { roomId, text }) {
  const normalizedRoomId = roomId.toUpperCase();
  const room = rooms.get(normalizedRoomId);
  if (!room) return;
  
  const user = room.users.find(u => u.clientId === clientId);
  if (!user) return;
  
  const similarity = await calculateSimilarity(text, room.currentWord);
  
  const guess = {
    userId: user.id,
    nickname: user.nickname,
    text: text,
    similarity: similarity,
    timestamp: Date.now()
  };
  
  room.guesses.push(guess);
  room.guessCount++;
  
  triggerHints(room);
  
  broadcastToRoom(normalizedRoomId, {
    type: 'NEW_GUESS',
    data: {
      guess: guess,
      allGuesses: room.guesses,
      guessCount: room.guessCount,
      aiHints: room.aiHints,
      skipVote: getSkipVoteStatus(room)
    }
  });
  
  if (similarity.isCorrect) {
    user.correctCount = (user.correctCount || 0) + 1;
    console.log(`[排行榜] ${user.nickname} 猜对了！累计: ${user.correctCount}次`);
    broadcastLeaderboard(normalizedRoomId);
    
    broadcastToRoom(normalizedRoomId, {
      type: 'ROUND_WON',
      data: {
        winner: { id: user.id, nickname: user.nickname },
        correctWord: room.currentWord
      }
    });
    
    setTimeout(() => {
      if (rooms.has(normalizedRoomId)) {
        startNewRound(normalizedRoomId);
      }
    }, 3000);
  }
}

function handleLeaveRoom(clientId, { roomId }) {
  const normalizedRoomId = roomId.toUpperCase();
  const room = rooms.get(normalizedRoomId);
  if (!room) return;
  
  const userIndex = room.users.findIndex(u => u.clientId === clientId);
  if (userIndex !== -1) {
    const user = room.users[userIndex];
    room.users.splice(userIndex, 1);
    
    if (room.skipVotes) {
      room.skipVotes.delete(user.id);
    }
    
    broadcastToRoom(normalizedRoomId, {
      type: 'USER_LEFT',
      data: {
        userId: user.id,
        gameState: getFullGameState(normalizedRoomId)
      }
    });
    
    broadcastLeaderboard(normalizedRoomId);
  }
}

function handleDisconnect(clientId) {
  clients.delete(clientId);
  
  rooms.forEach((room, roomId) => {
    const user = room.users.find(u => u.clientId === clientId);
    if (user) {
      user.online = false;
      
      if (room.skipVotes) {
        room.skipVotes.delete(user.id);
      }
      
      broadcastToRoom(roomId, {
        type: 'USER_OFFLINE',
        data: {
          userId: user.id,
          gameState: getFullGameState(roomId)
        }
      });
      
      broadcastLeaderboard(roomId);
      
      const timer = setTimeout(() => {
        if (!user.online && rooms.has(roomId)) {
          const finalRoom = rooms.get(roomId);
          const userIndex = finalRoom.users.findIndex(u => u.id === user.id);
          if (userIndex !== -1) {
            finalRoom.users.splice(userIndex, 1);
            broadcastToRoom(roomId, {
              type: 'USER_LEFT',
              data: {
                userId: user.id,
                gameState: getFullGameState(roomId)
              }
            });
            broadcastLeaderboard(roomId);
          }
        }
        userReconnectTimers.delete(user.id);
      }, USER_OFFLINE_TIMEOUT);
      
      userReconnectTimers.set(user.id, timer);
    }
  });
}

app.get('/api/stats', (req, res) => {
  res.json({
    totalRooms: rooms.size,
    totalClients: clients.size,
    wordBankSize: TOTAL_WORDS,
    categories: getCategories()
  });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════╗
║      心有灵犀 - 多人在线猜词游戏 v3.3            ║
╠══════════════════════════════════════════════════╣
║  端口: ${PORT}                                       ║
║  词库: ${TOTAL_WORDS} 个词汇（全部>=2字）               ║
║  🏆 排行榜功能                                       ║
║  ✨ 智能提示系统（支持兜底机制）                     ║
║  配置: JSON文件驱动，Git推送即生效                 ║
║  跳过投票: 75%玩家同意自动跳过                     ║
╚══════════════════════════════════════════════════╝
  `);
});
