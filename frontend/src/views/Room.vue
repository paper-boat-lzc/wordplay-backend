<template>
  <div class="room">
    <div class="container">
      <!-- 顶部栏 -->
      <div class="top-bar animate-fadeIn">
        <button class="btn btn-secondary back-btn" @click="goBack">
          ← 返回
        </button>
        <div class="room-info">
          <span class="room-id">房间号: {{ roomId }}</span>
          <button class="copy-btn" @click="copyRoomId">
            {{ copied ? '已复制!' : '复制' }}
          </button>
        </div>
        <div class="round-info">
          第 <span class="round-number">{{ round }}</span> 轮
        </div>
      </div>

      <!-- 主游戏区域 -->
      <div class="game-area">
        <!-- 左侧：用户列表 -->
        <div class="sidebar glass-card animate-fadeIn" style="animation-delay: 0.1s">
          <h3>在线玩家 ({{ users.length }})</h3>
          <div class="user-list">
            <div 
              v-for="user in users" 
              :key="user.id" 
              class="user-item"
            >
              <span class="user-avatar">{{ user.nickname.charAt(0) }}</span>
              <span class="user-name">{{ user.nickname }}</span>
              <span class="online-dot"></span>
            </div>
          </div>
        </div>

        <!-- 中间：游戏主区域 -->
        <div class="main-area">
          <!-- 游戏提示卡片 -->
          <div class="hint-card glass-card animate-fadeIn" style="animation-delay: 0.2s">
            <!-- 字数提示 -->
            <div class="word-length-display">
              📝 当前词语：<span class="length-number">{{ wordLength }}</span> 个字
            </div>
            
            <!-- AI智能提示 -->
            <div class="ai-hints" v-if="aiHints.length > 0">
              <div 
                v-for="(hint, index) in aiHints" 
                :key="index" 
                class="ai-hint-item"
              >
                💡 {{ hint }}
              </div>
            </div>
            
            <div class="category-badge">{{ categoryName }}</div>
            <div class="word-hint">
              <span 
                v-for="(char, index) in wordLength" 
                :key="index" 
                class="hint-char"
              >_</span>
            </div>
            <p class="hint-text">猜词次数：{{ guessCount }} 次</p>
          </div>

          <!-- 猜词输入区 -->
          <div class="input-area glass-card animate-fadeIn" style="animation-delay: 0.3s">
            <div class="guess-input-wrapper">
              <input 
                v-model="guessText" 
                type="text" 
                class="input guess-input" 
                placeholder="输入你的答案..."
                @keyup.enter="submitGuess"
                :disabled="showWinner"
              />
              <button 
                class="btn btn-primary submit-btn" 
                @click="submitGuess"
                :disabled="showWinner || !guessText.trim()"
              >
                发送
              </button>
            </div>
          </div>

          <!-- 猜词结果列表 -->
          <div class="guesses-area glass-card animate-fadeIn" style="animation-delay: 0.4s">
            <h3>猜词记录</h3>
            <div class="guesses-list" ref="guessesList">
              <div 
                v-for="(guess, index) in guesses" 
                :key="index" 
                class="guess-item"
                :style="{ animationDelay: `${index * 0.05}s` }"
              >
                <div class="guess-user">
                  <span class="guess-avatar">{{ guess.nickname.charAt(0) }}</span>
                  <span class="guess-name">{{ guess.nickname }}</span>
                </div>
                <div class="guess-text">{{ guess.text }}</div>
                <div class="similarity" :class="getSimilarityClass(guess.similarity.score)">
                  <div class="similarity-bar">
                    <div 
                      class="similarity-fill" 
                      :style="{ width: guess.similarity.score + '%' }"
                    ></div>
                  </div>
                  <span class="similarity-score">{{ guess.similarity.score }}%</span>
                </div>
              </div>
              <div v-if="guesses.length === 0" class="empty-state">
                还没有人猜词，快来第一个！
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 胜利弹窗 -->
      <div v-if="showWinner" class="winner-modal animate-fadeIn">
        <div class="winner-content glass-card">
          <div class="winner-icon">🎉</div>
          <h2>{{ winner.nickname }} 猜对了！</h2>
          <p class="winner-word">正确答案: <span>{{ correctWord }}</span></p>
          <p class="countdown">3秒后开始下一轮...</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useWebSocket } from '../composables/useWebSocket'

const router = useRouter()
const route = useRoute()
const { connect, send, on, disconnect } = useWebSocket()

const roomId = ref(route.params.roomId)
const nickname = ref(localStorage.getItem('nickname') || '匿名玩家')
const users = ref([])
const round = ref(1)
const wordLength = ref(0)
const category = ref('')
const guessText = ref('')
const guesses = ref([])
const showWinner = ref(false)
const winner = ref(null)
const correctWord = ref('')
const copied = ref(false)
const guessesList = ref(null)
const guessCount = ref(0)
const aiHints = ref([])

// 分类名称映射
const categoryNames = {
  animals: '🐾 动物',
  food: '🍔 食物',
  profession: '💼 职业',
  transportation: '🚗 交通工具',
  electronics: '📱 电子产品',
  sports: '⚽ 运动',
  nature: '🌿 自然景观',
  daily: '🏠 日常用品',
  places: '🏛️ 建筑场所',
  abstract: '💭 抽象概念'
}

const categoryName = ref('')

// 计算分类显示名称
watch(category, (newVal) => {
  categoryName.value = categoryNames[newVal] || newVal
})

// 连接WebSocket
onMounted(async () => {
  await connect()
  
  // 自动加入房间（带上token和userId支持重连）
  const savedToken = localStorage.getItem('userToken')
  const savedUserId = localStorage.getItem('userId')
  send('JOIN_ROOM', {
    roomId: roomId.value,
    nickname: nickname.value,
    token: savedToken,
    userId: savedUserId
  })

  // 监听房间信息
  on('ROOM_JOINED', (data) => {
    users.value = data.roomInfo.users
    round.value = data.roomInfo.round
    guesses.value = data.roomInfo.guesses || []
  })

  // 监听用户加入
  on('USER_JOINED', (data) => {
    users.value = data.roomInfo.users
  })

  // 监听用户离开
  on('USER_LEFT', (data) => {
    users.value = data.roomInfo.users
  })

  // 监听新一轮
  on('NEW_ROUND', (data) => {
    round.value = data.round
    wordLength.value = data.wordLength
    category.value = data.category
    guesses.value = []
    showWinner.value = false
    winner.value = null
    correctWord.value = ''
    guessCount.value = 0
    aiHints.value = []
  })

  // 监听新猜词
  on('NEW_GUESS', (data) => {
    guesses.value = data.allGuesses
    guessCount.value = data.guessCount
    aiHints.value = data.aiHints || []
    nextTick(() => {
      if (guessesList.value) {
        guessesList.value.scrollTop = guessesList.value.scrollHeight
      }
    })
  })

  // 监听有人获胜
  on('ROUND_WON', (data) => {
    showWinner.value = true
    winner.value = data.winner
    correctWord.value = data.correctWord
  })

  // 监听错误
  on('ERROR', (data) => {
    alert(data.message)
    if (data.message === '房间不存在') {
      router.push('/')
    }
  })
})

// 返回首页
function goBack() {
  send('LEAVE_ROOM', { roomId: roomId.value })
  disconnect()
  router.push('/')
}

// 复制房间号
function copyRoomId() {
  navigator.clipboard.writeText(roomId.value)
  copied.value = true
  setTimeout(() => copied.value = false, 2000)
}

// 提交猜词
function submitGuess() {
  if (!guessText.value.trim() || showWinner.value) return
  
  send('MAKE_GUESS', {
    roomId: roomId.value,
    text: guessText.value.trim()
  })
  
  guessText.value = ''
}

// 获取相似度样式类
function getSimilarityClass(score) {
  if (score >= 80) return 'high'
  if (score >= 50) return 'medium'
  return 'low'
}
</script>

<style scoped>
.room {
  min-height: 100vh;
  padding: 20px;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  position: relative;
  z-index: 1;
}

.top-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 12px;
}

.back-btn {
  padding: 10px 20px;
}

.room-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.room-id {
  font-size: 18px;
  font-weight: 600;
  color: var(--primary-light);
}

.copy-btn {
  padding: 6px 12px;
  background: var(--bg-input);
  border: 1px solid var(--border);
  border-radius: 8px;
  color: var(--text-primary);
  cursor: pointer;
  font-size: 13px;
  transition: all 0.3s;
}

.copy-btn:hover {
  border-color: var(--primary);
}

.round-info {
  font-size: 16px;
  color: var(--text-secondary);
}

.round-number {
  color: var(--primary-light);
  font-weight: 700;
  font-size: 20px;
}

.game-area {
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: 20px;
}

.sidebar {
  padding: 24px;
  height: fit-content;
  position: sticky;
  top: 20px;
}

.sidebar h3 {
  margin-bottom: 16px;
  font-size: 16px;
  color: var(--text-secondary);
}

.user-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.user-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px;
  background: var(--bg-input);
  border-radius: 10px;
}

.user-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--gradient);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 16px;
}

.user-name {
  flex: 1;
  font-weight: 500;
}

.online-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--success);
  animation: pulse 2s infinite;
}

.main-area {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.hint-card {
  padding: 32px;
  text-align: center;
}

.word-length-display {
  font-size: 24px;
  font-weight: 600;
  margin-bottom: 16px;
  color: var(--text-primary);
}

.length-number {
  color: var(--primary-light);
  font-size: 32px;
  font-weight: 700;
}

.ai-hints {
  margin-bottom: 20px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.ai-hint-item {
  padding: 10px 16px;
  background: rgba(16, 185, 129, 0.15);
  border: 1px solid rgba(16, 185, 129, 0.3);
  border-radius: 10px;
  color: #34d399;
  font-size: 15px;
  font-weight: 500;
  animation: fadeIn 0.3s ease;
}

.category-badge {
  display: inline-block;
  padding: 8px 20px;
  background: var(--gradient);
  border-radius: 20px;
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 24px;
}

.word-hint {
  display: flex;
  justify-content: center;
  gap: 12px;
  margin-bottom: 16px;
}

.hint-char {
  width: 40px;
  height: 50px;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  font-size: 32px;
  font-weight: 700;
  color: var(--primary-light);
  border-bottom: 3px solid var(--primary);
}

.hint-text {
  color: var(--text-secondary);
  font-size: 14px;
}

.input-area {
  padding: 20px;
}

.guess-input-wrapper {
  display: flex;
  gap: 12px;
}

.guess-input {
  flex: 1;
}

.submit-btn {
  padding: 14px 28px;
}

.guesses-area {
  padding: 24px;
  flex: 1;
  min-height: 300px;
  display: flex;
  flex-direction: column;
}

.guesses-area h3 {
  margin-bottom: 16px;
  font-size: 16px;
  color: var(--text-secondary);
}

.guesses-list {
  flex: 1;
  overflow-y: auto;
  max-height: 400px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-right: 8px;
}

.guess-item {
  display: grid;
  grid-template-columns: 120px 1fr 100px;
  align-items: center;
  gap: 16px;
  padding: 12px 16px;
  background: var(--bg-input);
  border-radius: 12px;
  animation: slideIn 0.3s ease forwards;
}

.guess-user {
  display: flex;
  align-items: center;
  gap: 8px;
}

.guess-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--gradient);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 12px;
}

.guess-name {
  font-size: 13px;
  font-weight: 500;
  max-width: 70px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.guess-text {
  font-size: 15px;
  font-weight: 500;
}

.similarity {
  display: flex;
  align-items: center;
  gap: 8px;
}

.similarity-bar {
  flex: 1;
  height: 8px;
  background: var(--bg-dark);
  border-radius: 4px;
  overflow: hidden;
}

.similarity-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.5s ease;
}

.similarity.high .similarity-fill {
  background: linear-gradient(90deg, #10b981, #34d399);
}

.similarity.medium .similarity-fill {
  background: linear-gradient(90deg, #f59e0b, #fbbf24);
}

.similarity.low .similarity-fill {
  background: linear-gradient(90deg, #64748b, #94a3b8);
}

.similarity-score {
  font-size: 14px;
  font-weight: 700;
  min-width: 40px;
  text-align: right;
}

.similarity.high .similarity-score {
  color: #34d399;
}

.similarity.medium .similarity-score {
  color: #fbbf24;
}

.similarity.low .similarity-score {
  color: #94a3b8;
}

.empty-state {
  text-align: center;
  padding: 40px 20px;
  color: var(--text-secondary);
}

.winner-modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  backdrop-filter: blur(8px);
}

.winner-content {
  padding: 48px;
  text-align: center;
  max-width: 400px;
}

.winner-icon {
  font-size: 64px;
  margin-bottom: 16px;
  animation: bounce 1s infinite;
}

.winner-content h2 {
  font-size: 28px;
  margin-bottom: 16px;
  background: var(--gradient);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.winner-word {
  font-size: 18px;
  margin-bottom: 12px;
}

.winner-word span {
  color: var(--success);
  font-weight: 700;
  font-size: 24px;
}

.countdown {
  color: var(--text-secondary);
  font-size: 14px;
}

@media (max-width: 900px) {
  .game-area {
    grid-template-columns: 1fr;
  }
  
  .sidebar {
    position: static;
    order: 2;
  }
  
  .main-area {
    order: 1;
  }
  
  .guess-item {
    grid-template-columns: 100px 1fr 80px;
    gap: 10px;
  }
}

@media (max-width: 600px) {
  .top-bar {
    flex-direction: column;
    align-items: stretch;
  }
  
  .room-info {
    justify-content: center;
  }
  
  .hint-card {
    padding: 24px 16px;
  }
  
  .hint-char {
    width: 30px;
    height: 40px;
    font-size: 24px;
  }
  
  .guess-item {
    grid-template-columns: 1fr;
    gap: 8px;
  }
  
  .guess-user {
    justify-content: flex-start;
  }
}
</style>