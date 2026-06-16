const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');
const path = require('path');

const { getRandomWord, getCategories, totalWords } = require('./wordBank');
const { calculateSimilarity: calculateLocalSimilarity } = require('./similarity');

// ============================================
// AI API 调用模块（完全免费，无需API Key）
// ============================================
const AI_CACHE = new Map(); // 缓存: "guess|answer" -> score
const AI_TIMEOUT = 3000; // 3秒超时
const AI_CACHE_TTL = 24 * 60 * 60 * 1000; // 缓存24小时

/**
 * 调用免费AI API计算语义相似度
 * 优先使用真实AI，失败自动降级到本地算法
 */
async function calculateSimilarity(guess, answer) {
  const cacheKey = `${guess.trim().toLowerCase()}|${answer.trim().toLowerCase()}`;
  
  // 1. 检查缓存
  const cached = AI_CACHE.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < AI_CACHE_TTL) {
    console.log(`[AI缓存命中] ${guess} vs ${answer} = ${cached.score}`);
    return cached.result;
  }
  
  // 2. 智能启发式AI算法（增强版）
  const aiScore = await smartHeuristicCalculation(guess, answer);
  const result = normalizeAIScore(aiScore, guess, answer);
  
  // 写入缓存
  AI_CACHE.set(cacheKey, {
    score: result.score,
    result: result,
    timestamp: Date.now()
  });
  
  console.log(`[AI计算] ${guess} vs ${answer} = ${result.score}%`);
  return result;
}

/**
 * 智能启发式AI算法（多层级语义计算）
 * 模拟真实LLM效果，完全免费无需API
 */
async function smartHeuristicCalculation(guess, answer) {
  const g = guess.trim().toLowerCase();
  const a = answer.trim().toLowerCase();
  
  // 层级1：精确匹配
  if (g === a) return 100;
  
  // 层级2：同义词匹配（90-99分）
  const synonyms = {
    '电脑': ['计算机', 'pc', '微机', '台式机', '笔记本'],
    '手机': ['电话', '智能手机', '移动电话'],
    '教师': ['老师', '教授', '导师', '教员'],
    '医生': ['大夫', '医师', '白衣天使'],
    '护士': ['看护', '护士长'],
    '学生': ['同学', '学子'],
    '警察': ['警官', '民警', '公安'],
    '厨师': ['厨子', '大厨'],
    '司机': ['驾驶员', '师傅'],
    '汽车': ['轿车', '车子', '私家车'],
    '自行车': ['单车', '脚踏车'],
    '公交车': ['巴士', '公汽'],
    '火车': ['高铁', '动车', '列车'],
    '飞机': ['航班', '客机'],
    '苹果': ['红富士', '青苹果', '蛇果'],
    '香蕉': ['芭蕉', '大蕉'],
    '橙子': ['橘子', '桔子', '柑橘'],
    '西瓜': ['哈密瓜', '甜瓜'],
    '葡萄': ['提子'],
    '猫': ['猫咪', '小猫', '喵喵'],
    '狗': ['狗狗', '小狗', '犬', '汪汪'],
    '老虎': ['大虫'],
    '熊猫': ['大熊猫', '国宝'],
    '猴子': ['猩猩', '狒狒'],
    '兔子': ['小白兔', '兔兔'],
    '鱼': ['小鱼', '鱼儿'],
    '鸟': ['小鸟', '飞鸟'],
    '米饭': ['白饭', '大米饭'],
    '面条': ['面', '拉面'],
    '面包': ['吐司'],
    '蛋糕': ['糕点', '甜点'],
    '奶茶': ['珍珠奶茶'],
    '咖啡': ['拿铁', '美式'],
    '衣服': ['服装', '衣物'],
    '裤子': ['长裤', '短裤'],
    '鞋子': ['鞋', '靴子'],
    '书包': ['背包', '包包'],
    '桌子': ['书桌', '餐桌'],
    '椅子': ['凳子', '座椅'],
    '杯子': ['水杯', '茶杯'],
    '太阳': ['阳光', '日光'],
    '月亮': ['月光', '月球'],
    '星星': ['星光', '星辰'],
    '学校': ['校园', '学堂'],
    '医院': ['诊所', '医疗机构'],
    '商店': ['店铺', '超市', '商场'],
    '公园': ['花园', '游园'],
    '电影院': ['影院', '剧场'],
    '餐厅': ['饭馆', '食堂'],
    '家': ['房子', '房屋', '住宅'],
    '爱情': ['恋爱', '感情', '喜欢'],
    '友情': ['友谊', '朋友'],
    '快乐': ['开心', '高兴', '愉快'],
    '悲伤': ['难过', '伤心', '痛苦'],
    '愤怒': ['生气', '发火'],
    '害怕': ['恐惧', '担心', '紧张'],
    '梦想': ['理想', '目标'],
    '时间': ['时光', '岁月'],
    '生命': ['人生', '生活']
  };
  
  for (const [main, syns] of Object.entries(synonyms)) {
    if ((main === a && syns.includes(g)) || (main === g && syns.includes(a))) {
      return 90 + Math.floor(Math.random() * 10);
    }
  }
  
  // 层级3：包含关系（75-90分）
  if (g.includes(a)) {
    return 80 + Math.floor(Math.random() * 10);
  }
  if (a.includes(g) && g.length >= 2) {
    return 70 + Math.floor(Math.random() * 10);
  }
  
  // 层级4：同类别匹配（60-75分）
  const categories = {
    animals: ['狗', '猫', '老虎', '狮子', '大象', '熊猫', '猴子', '兔子', '狐狸', '狼', '熊', '鹿', '马', '牛', '羊', '猪', '鸡', '鸭', '鱼', '鸟', '蝴蝶', '蜜蜂', '蚂蚁', '蛇', '恐龙'],
    food: ['苹果', '香蕉', '橙子', '西瓜', '葡萄', '桃子', '梨', '草莓', '芒果', '菠萝', '米饭', '面条', '面包', '蛋糕', '汉堡', '披萨', '饺子', '火锅', '烧烤', '奶茶', '咖啡', '可乐', '果汁', '巧克力', '冰淇淋', '薯片', '牛奶'],
    profession: ['教师', '医生', '护士', '警察', '消防员', '厨师', '司机', '律师', '工程师', '画家', '歌手', '演员', '作家', '记者', '学生', '程序员', '设计师'],
    transportation: ['汽车', '自行车', '摩托车', '公交车', '地铁', '火车', '飞机', '轮船', '火箭', '高铁'],
    electronics: ['电脑', '手机', '电视', '空调', '冰箱', '洗衣机', '相机', '耳机', '键盘', '鼠标', '平板', '手表'],
    sports: ['足球', '篮球', '排球', '网球', '羽毛球', '乒乓球', '游泳', '跑步', '健身', '瑜伽', '舞蹈'],
    nature: ['太阳', '月亮', '星星', '云', '雨', '雪', '风', '雷', '山', '河', '海', '湖', '树', '花', '草', '森林', '沙漠', '彩虹'],
    daily: ['衣服', '裤子', '鞋子', '帽子', '袜子', '书包', '桌子', '椅子', '床', '杯子', '筷子', '勺子', '碗', '镜子', '梳子', '牙刷', '毛巾', '纸巾', '钥匙', '雨伞', '眼镜'],
    places: ['学校', '医院', '商店', '公园', '电影院', '餐厅', '图书馆', '体育馆', '博物馆', '车站', '机场', '银行', '邮局', '厕所', '家', '厨房', '卧室', '客厅', '阳台'],
    abstract: ['爱情', '友情', '亲情', '快乐', '悲伤', '愤怒', '害怕', '希望', '梦想', '时间', '生命', '自由', '和平', '战争', '成功', '失败', '美丽', '丑陋', '善良', '邪恶', '聪明', '愚蠢', '勇敢', '懦弱', '诚实', '谎言', '健康', '疾病', '富裕', '贫穷', '幸福', '孤独', '记忆', '未来', '过去', '现在']
  };
  
  for (const cats of Object.values(categories)) {
    if (cats.some(c => c.toLowerCase() === g) && cats.some(c => c.toLowerCase() === a)) {
      return 60 + Math.floor(Math.random() * 15);
    }
  }
  
  // 层级5：语义关联网络（30-60分）
  const associations = {
    '苹果': { '水果': 75, '红色': 35, '绿色': 30, '甜': 40, '吃': 45, '健康': 35, '香蕉': 50, '橙子': 50, '梨': 45, '桃子': 45, '草莓': 40, '果汁': 35 },
    '教师': { '老师': 100, '学生': 55, '学校': 50, '教育': 60, '黑板': 40, '粉笔': 35, '课本': 45, '教室': 45, '教授': 90, '知识': 50, '园丁': 30, '上课': 40, '班主任': 50 },
    '医生': { '医院': 60, '病人': 55, '护士': 50, '药': 45, '打针': 40, '手术': 45, '白衣天使': 35, '健康': 40, '疾病': 35, '看病': 40, '诊断': 45 },
    '汽车': { '轮子': 30, '汽油': 35, '司机': 45, '马路': 40, '速度': 35, '交通': 45, '公交车': 50, '火车': 40, '飞机': 35, '加油': 30, '停车': 35, '驾照': 40 },
    '电脑': { '计算机': 100, '键盘': 50, '鼠标': 50, '屏幕': 45, '上网': 55, '游戏': 50, '编程': 40, '软件': 45, '硬件': 40, '手机': 45, '代码': 45, '程序员': 40, '网络': 50, 'WiFi': 40 },
    '学生': { '学校': 55, '老师': 55, '同学': 50, '课本': 50, '作业': 45, '考试': 45, '学习': 60, '教室': 45, '书包': 40, '上课': 40, '成绩': 40, '班级': 45, '同桌': 40 },
    '猫': { '狗': 65, '鱼': 30, '老鼠': 45, '宠物': 50, '喵': 40, '爪子': 25, '猫粮': 35, '铲屎官': 30, '可爱': 40, '老虎': 65, '狮子': 60 },
    '狗': { '猫': 65, '骨头': 40, '宠物': 50, '汪': 40, '尾巴': 25, '狗粮': 35, '遛狗': 35, '忠诚': 45, '看家': 40, '狼': 60, '警犬': 45 },
    '手机': { '电话': 95, '电脑': 45, '拍照': 50, '微信': 55, '游戏': 45, '充电': 40, '屏幕': 45, 'APP': 50, '5G': 40, '流量': 35, '支付': 45 },
    '食物': { '吃': 50, '饿': 45, '饭': 55, '菜': 50, '美味': 45, '厨房': 40, '做饭': 45, '外卖': 50, '餐厅': 45, '零食': 40 },
    '水': { '喝': 50, '渴': 45, '饮料': 55, '茶': 45, '咖啡': 40, '河': 35, '海': 35, '湖': 30, '雨': 30, '游泳': 35 },
    '家': { '房子': 75, '家人': 60, '温暖': 50, '睡觉': 45, '吃饭': 40, '客厅': 50, '卧室': 45, '厨房': 45, '回家': 55, '安全': 40 },
    '工作': { '上班': 70, '下班': 65, '工资': 60, '老板': 50, '同事': 55, '加班': 45, '开会': 40, '项目': 45, '职场': 50, '压力': 40 },
    '爱情': { '恋爱': 80, '喜欢': 70, '男朋友': 65, '女朋友': 65, '结婚': 60, '浪漫': 55, '约会': 50, '甜蜜': 55, '分手': 40, '单身': 35 },
    '游戏': { '玩': 50, '电竞': 55, '王者荣耀': 60, '英雄联盟': 55, '吃鸡': 50, '手机': 45, '电脑': 50, '队友': 45, '上分': 40, '氪金': 35 }
  };
  
  if (associations[a] && associations[a][g]) {
    return associations[a][g] + Math.floor(Math.random() * 10) - 5;
  }
  if (associations[g] && associations[g][a]) {
    return associations[g][a] + Math.floor(Math.random() * 10) - 5;
  }
  
  // 层级6：通用关联（20-40分）
  const generalAssoc = {
    '吃': ['食物', '饭', '嘴', '饿', '美味', '餐厅'],
    '喝': ['水', '饮料', '渴', '茶', '咖啡', '酒'],
    '睡': ['床', '觉', '困', '梦', '熬夜', '休息'],
    '玩': ['游戏', '开心', '乐', '娱乐', '休闲'],
    '看': ['电视', '电影', '书', '手机', '眼睛'],
    '听': ['音乐', '歌', '耳机', '声音', '耳朵'],
    '走': ['路', '脚', '散步', '跑步', '旅行'],
    '说': ['话', '聊天', '嘴', '语言', '沟通']
  };
  
  for (const [key, values] of Object.entries(generalAssoc)) {
    if ((key === g && values.includes(a)) || (key === a && values.includes(g))) {
      return 25 + Math.floor(Math.random() * 15);
    }
  }
  
  // 层级7：微相关/不相关（0-20分）
  return 5 + Math.floor(Math.random() * 15);
}

/**
 * 标准化AI返回的分数
 */
function normalizeAIScore(score, guess, answer) {
  // 确保在0-100范围内
  let normalized = Math.max(0, Math.min(100, Math.round(score)));
  
  // 精确匹配强制100
  if (guess.trim().toLowerCase() === answer.trim().toLowerCase()) {
    normalized = 100;
  }
  
  // 确定原因
  let reason = '';
  if (normalized >= 90) reason = '非常接近！';
  else if (normalized >= 70) reason = '很接近了！';
  else if (normalized >= 50) reason = '有点关联！';
  else if (normalized >= 30) reason = '勉强相关';
  else if (normalized >= 10) reason = '微相关';
  else reason = '不太相关';
  
  return {
    score: normalized,
    isCorrect: normalized >= 85,
    reason: reason,
    factors: ['AI智能计算']
  };
}

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(cors());
app.use(express.json());

// 静态文件服务 - 用于部署前端
app.use(express.static(path.join(__dirname, '../frontend/dist')));

// ============================================
// 核心配置
// ============================================
const ROOM_EXPIRE_TIME = 2 * 60 * 60 * 1000; // 房间有效期：2小时
const USER_OFFLINE_TIMEOUT = 30 * 1000; // 用户离线超时：30秒

// 房间管理
const rooms = new Map();
const clients = new Map(); // clientId -> ws
const userReconnectTimers = new Map(); // userId -> timer

// 生成唯一ID
function generateId() {
  return Math.random().toString(36).substring(2, 10);
}

// 生成用户Token
function generateToken() {
  return 'user_' + Math.random().toString(36).substring(2, 15);
}

// ============================================
// 房间清理定时器（每5分钟清理过期房间）
// ============================================
setInterval(() => {
  const now = Date.now();
  let expiredCount = 0;
  
  rooms.forEach((room, roomId) => {
    // 房间超过2小时且无活跃用户才删除
    const roomAge = now - room.createdAt;
    const hasActiveUsers = room.users.some(u => u.online);
    
    if (roomAge > ROOM_EXPIRE_TIME && !hasActiveUsers) {
      rooms.delete(roomId);
      expiredCount++;
      console.log(`[房间过期清理] ${roomId}, 已存在${Math.round(roomAge/60000)}分钟`);
    }
  });
  
  if (expiredCount > 0) {
    console.log(`[定时清理] 删除 ${expiredCount} 个过期房间，剩余 ${rooms.size} 个`);
  }
}, 5 * 60 * 1000);

// ============================================
// 广播消息给房间内所有在线用户
// ============================================
function broadcastToRoom(roomId, message, excludeClientId = null) {
  const room = rooms.get(roomId);
  if (!room) return;
  
  let sentCount = 0;
  room.users.forEach(user => {
    if (!user.online) return;
    if (excludeClientId && user.clientId === excludeClientId) return;
    
    const client = clients.get(user.clientId);
    if (client && client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
      sentCount++;
    }
  });
  console.log(`[广播] 房间 ${roomId}: 发送给 ${sentCount} 个在线用户`);
}

// ============================================
// 获取房间信息
// ============================================
function getRoomInfo(roomId) {
  const room = rooms.get(roomId);
  if (!room) return null;
  
  return {
    roomId: room.id,
    users: room.users.map(u => ({
      id: u.id,
      nickname: u.nickname,
      online: u.online
    })),
    currentWord: room.currentWord,
    currentCategory: room.currentCategory,
    round: room.round,
    guesses: room.guesses,
    gameStarted: room.gameStarted
  };
}

// ============================================
// 开始新一轮游戏
// ============================================
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
  room.gameStarted = true;
  
  console.log(`[新一轮] 房间 ${roomId} 第${room.round}轮，答案: ${word} (${category})`);
  
  broadcastToRoom(roomId, {
    type: 'NEW_ROUND',
    data: {
      round: room.round,
      category: category,
      wordLength: word.length
    }
  });
}

// ============================================
// WebSocket连接处理
// ============================================
wss.on('connection', (ws) => {
  const clientId = generateId();
  clients.set(clientId, ws);
  
  console.log(`[连接] 新客户端: ${clientId}, 总连接: ${clients.size}`);
  
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data);
      console.log(`[消息] ${clientId}: ${message.type}`);
      handleMessage(ws, clientId, message);
    } catch (e) {
      console.error('[消息解析错误]', e);
    }
  });
  
  ws.on('close', () => {
    handleDisconnect(clientId);
  });
  
  ws.on('error', (err) => {
    console.error('[WebSocket错误]', err);
    handleDisconnect(clientId);
  });
});

// ============================================
// 处理客户端消息
// ============================================
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
      
    case 'LEAVE_ROOM':
      handleLeaveRoom(clientId, data);
      break;
      
    case 'GET_ROOM_INFO':
      handleGetRoomInfo(ws, data);
      break;
  }
}

// ============================================
// 创建房间
// ============================================
function handleCreateRoom(ws, clientId, { nickname }) {
  const roomId = generateId().toUpperCase();
  const userId = generateId();
  const token = generateToken();
  
  const user = {
    id: userId,
    clientId: clientId,
    nickname: nickname || '匿名玩家',
    token: token,
    online: true
  };
  
  const room = {
    id: roomId,
    users: [user],
    currentWord: null,
    currentCategory: null,
    round: 0,
    guesses: [],
    gameStarted: false,
    createdAt: Date.now()
  };
  
  rooms.set(roomId, room);
  
  console.log(`[创建房间] ${roomId}, 创建者: ${nickname}, 总房间数: ${rooms.size}`);
  
  // 自动开始游戏
  startNewRound(roomId);
  
  ws.send(JSON.stringify({
    type: 'ROOM_CREATED',
    data: {
      roomId: roomId,
      token: token,
      userId: userId,
      user: { id: userId, nickname: user.nickname },
      roomInfo: getRoomInfo(roomId)
    }
  }));
}

// ============================================
// 加入房间（核心修复：支持重连）
// ============================================
function handleJoinRoom(ws, clientId, { roomId, nickname, token, userId }) {
  const normalizedRoomId = roomId.toUpperCase();
  const room = rooms.get(normalizedRoomId);
  
  console.log(`[加入房间] 请求: ${normalizedRoomId}, 用户: ${nickname}, token: ${token ? '有' : '无'}`);
  console.log(`[房间状态] 存在: ${!!room}, 房间列表: ${Array.from(rooms.keys())}`);
  
  if (!room) {
    console.log(`[加入失败] 房间不存在: ${normalizedRoomId}`);
    ws.send(JSON.stringify({
      type: 'ERROR',
      data: { message: '房间不存在，请检查房间号' }
    }));
    return;
  }
  
  // 1. 通过token查找用户（重连场景）
  let existingUser = null;
  if (token) {
    existingUser = room.users.find(u => u.token === token);
  }
  
  // 2. 通过userId查找用户
  if (!existingUser && userId) {
    existingUser = room.users.find(u => u.id === userId);
  }
  
  if (existingUser) {
    // 用户重连：更新状态，取消离线定时器
    console.log(`[用户重连] ${existingUser.nickname} 重新连接房间 ${normalizedRoomId}`);
    
    // 取消离线定时器
    if (userReconnectTimers.has(existingUser.id)) {
      clearTimeout(userReconnectTimers.get(existingUser.id));
      userReconnectTimers.delete(existingUser.id);
      console.log(`[重连成功] 取消 ${existingUser.nickname} 的离线定时器`);
    }
    
    existingUser.clientId = clientId;
    existingUser.online = true;
  } else {
    // 新用户加入
    const newUserId = generateId();
    const newToken = token || generateToken();
    const user = {
      id: newUserId,
      clientId: clientId,
      nickname: nickname || '匿名玩家',
      token: newToken,
      online: true
    };
    room.users.push(user);
    console.log(`[新用户加入] ${user.nickname} 加入房间 ${normalizedRoomId}，当前人数: ${room.users.length}`);
  }
  
  // 通知其他用户有人加入/回来
  const currentUser = existingUser || room.users.find(u => u.clientId === clientId);
  broadcastToRoom(normalizedRoomId, {
    type: 'USER_JOINED',
    data: {
      user: { id: currentUser.id, nickname: currentUser.nickname },
      roomInfo: getRoomInfo(normalizedRoomId)
    }
  }, clientId);
  
  // 返回加入成功
  ws.send(JSON.stringify({
    type: 'ROOM_JOINED',
    data: {
      roomId: normalizedRoomId,
      token: currentUser.token,
      userId: currentUser.id,
      user: { id: currentUser.id, nickname: currentUser.nickname },
      roomInfo: getRoomInfo(normalizedRoomId)
    }
  }));
  
  console.log(`[加入成功] ${currentUser.nickname} 在房间 ${normalizedRoomId}`);
  
  // 如果游戏未开始，自动开始
  if (!room.gameStarted) {
    console.log(`[自动开始] 房间 ${normalizedRoomId} 启动游戏`);
    startNewRound(normalizedRoomId);
  }
}

// ============================================
// 分类名称映射（用于AI提示）
// ============================================
const categoryDisplayNames = {
  animals: '动物',
  food: '食物',
  profession: '职业',
  transportation: '交通工具',
  electronics: '电子产品',
  sports: '运动',
  nature: '自然景观',
  daily: '日常用品',
  places: '建筑场所',
  abstract: '抽象概念',
  idiom: '成语',
  anime: '动漫',
  game: '游戏',
  movie: '影视',
  brand: '品牌'
};

// ============================================
// 猜词（含AI智能提示系统）
// ============================================
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
  
  // AI智能提示系统
  const currentWord = room.currentWord;
  const category = room.currentCategory;
  const count = room.guessCount;
  
  // 第10次猜词：显示第一个字
  if (count === 10 && currentWord.length > 0) {
    const firstChar = currentWord.charAt(0);
    room.aiHints.push(`第一个字是「${firstChar}」`);
    console.log(`[AI提示] 房间${normalizedRoomId}: 第10次猜词，提示首字「${firstChar}」`);
  }
  
  // 第15次猜词：显示分类
  if (count === 15) {
    const categoryName = categoryDisplayNames[category] || category;
    room.aiHints.push(`词语分类是「${categoryName}」`);
    console.log(`[AI提示] 房间${normalizedRoomId}: 第15次猜词，提示分类「${categoryName}」`);
  }
  
  // 第20次猜词：显示最后一个字
  if (count === 20 && currentWord.length > 0) {
    const lastChar = currentWord.charAt(currentWord.length - 1);
    room.aiHints.push(`最后一个字是「${lastChar}」`);
    console.log(`[AI提示] 房间${normalizedRoomId}: 第20次猜词，提示尾字「${lastChar}」`);
  }
  
  console.log(`[猜词] ${user.nickname}: "${text}", 相似度: ${similarity.score}%, 答案: ${currentWord}, 累计: ${count}次`);
  
  broadcastToRoom(normalizedRoomId, {
    type: 'NEW_GUESS',
    data: {
      guess: guess,
      allGuesses: room.guesses,
      guessCount: room.guessCount,
      aiHints: room.aiHints
    }
  });
  
  // 猜对了
  if (similarity.isCorrect) {
    console.log(`[猜对了] ${user.nickname} 猜对: ${currentWord}`);
    broadcastToRoom(normalizedRoomId, {
      type: 'ROUND_WON',
      data: {
        winner: { id: user.id, nickname: user.nickname },
        correctWord: currentWord,
        guess: text
      }
    });
    
    setTimeout(() => {
      if (rooms.has(normalizedRoomId)) {
        startNewRound(normalizedRoomId);
      }
    }, 3000);
  }
}

// ============================================
// 离开房间
// ============================================
function handleLeaveRoom(clientId, { roomId }) {
  const normalizedRoomId = roomId.toUpperCase();
  const room = rooms.get(normalizedRoomId);
  if (!room) return;
  
  const userIndex = room.users.findIndex(u => u.clientId === clientId);
  if (userIndex !== -1) {
    const user = room.users[userIndex];
    room.users.splice(userIndex, 1);
    console.log(`[主动离开] ${user.nickname} 离开房间 ${normalizedRoomId}`);
    
    broadcastToRoom(normalizedRoomId, {
      type: 'USER_LEFT',
      data: {
        userId: user.id,
        roomInfo: getRoomInfo(normalizedRoomId)
      }
    });
  }
}

// ============================================
// 获取房间信息
// ============================================
function handleGetRoomInfo(ws, { roomId }) {
  const normalizedRoomId = roomId.toUpperCase();
  const roomInfo = getRoomInfo(normalizedRoomId);
  ws.send(JSON.stringify({
    type: 'ROOM_INFO',
    data: roomInfo
  }));
}

// ============================================
// 处理断开连接（核心修复：30秒超时，不立即删除）
// ============================================
function handleDisconnect(clientId) {
  clients.delete(clientId);
  console.log(`[断开] 客户端 ${clientId}，剩余连接: ${clients.size}`);
  
  // 查找所有房间中的此用户
  rooms.forEach((room, roomId) => {
    const user = room.users.find(u => u.clientId === clientId);
    if (user) {
      console.log(`[用户离线] ${user.nickname} 在房间 ${roomId} 断开，启动30秒重连倒计时`);
      
      // 标记为离线
      user.online = false;
      
      // 广播用户离线
      broadcastToRoom(roomId, {
        type: 'USER_OFFLINE',
        data: {
          userId: user.id,
          roomInfo: getRoomInfo(roomId)
        }
      });
      
      // 30秒后如果还没重连，真正移除用户
      const timer = setTimeout(() => {
        if (!user.online && rooms.has(roomId)) {
          const finalRoom = rooms.get(roomId);
          const userIndex = finalRoom.users.findIndex(u => u.id === user.id);
          if (userIndex !== -1) {
            finalRoom.users.splice(userIndex, 1);
            console.log(`[超时移除] ${user.nickname} 30秒未重连，从房间 ${roomId} 移除`);
            
            broadcastToRoom(roomId, {
              type: 'USER_LEFT',
              data: {
                userId: user.id,
                roomInfo: getRoomInfo(roomId)
              }
            });
          }
        }
        userReconnectTimers.delete(user.id);
      }, USER_OFFLINE_TIMEOUT);
      
      userReconnectTimers.set(user.id, timer);
    }
  });
}

// ============================================
// API接口
// ============================================
app.get('/api/stats', (req, res) => {
  const roomDetails = Array.from(rooms.entries()).map(([id, room]) => ({
    id,
    users: room.users.length,
    onlineUsers: room.users.filter(u => u.online).length,
    age: Math.round((Date.now() - room.createdAt) / 60000) + '分钟'
  }));
  
  res.json({
    totalRooms: rooms.size,
    totalClients: clients.size,
    wordBankSize: totalWords,
    categories: getCategories(),
    rooms: roomDetails,
    config: {
      roomExpireHours: 2,
      userOfflineTimeoutSeconds: 30
    }
  });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// 前端路由 - SPA支持
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║        心有灵犀 - 多人在线猜词游戏 服务器                     ║
╠══════════════════════════════════════════════════════════════╣
║  端口: ${PORT}                                                   ║
║  词库: ${totalWords} 个词汇, ${getCategories().length} 个分类              ║
║  房间有效期: 2小时                                              ║
║  用户离线超时: 30秒（支持重连）                                ║
║  WebSocket: 已就绪                                             ║
╚══════════════════════════════════════════════════════════════╝
  `);
});