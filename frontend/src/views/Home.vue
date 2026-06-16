<template>
  <div class="home">
    <div class="container">
      <!-- Logo和标题 -->
      <div class="header animate-fadeIn">
        <div class="logo">
          <span class="logo-icon">✨</span>
          <h1>心有灵犀</h1>
        </div>
        <p class="subtitle">多人在线猜词游戏 · AI智能语义匹配</p>
      </div>

      <!-- 主卡片 -->
      <div class="main-card glass-card animate-fadeIn" style="animation-delay: 0.1s">
        <!-- 昵称输入 -->
        <div class="input-group">
          <label>你的昵称</label>
          <input 
            v-model="nickname" 
            type="text" 
            class="input" 
            placeholder="输入一个好听的名字..."
            maxlength="12"
          />
        </div>

        <!-- 操作按钮 -->
        <div class="actions">
          <button class="btn btn-primary" @click="createRoom">
            <span>🎮</span> 创建房间
          </button>

          <div class="divider">或</div>

          <div class="join-group">
            <input 
              v-model="roomIdInput" 
              type="text" 
              class="input" 
              placeholder="输入房间号..."
              maxlength="8"
              style="flex: 1; min-width: 0; height: 52px;"
            />
            <button class="btn btn-secondary" @click="joinRoom" style="width: 120px; flex-shrink: 0; height: 52px;">
              加入房间
            </button>
          </div>
        </div>
      </div>

      <!-- 功能介绍 -->
      <div class="features animate-fadeIn" style="animation-delay: 0.2s">
        <div class="feature">
          <div class="feature-icon">🚀</div>
          <h3>实时对战</h3>
          <p>多人同时在线，低延迟实时互动</p>
        </div>
        <div class="feature">
          <div class="feature-icon">🤖</div>
          <h3>AI智能</h3>
          <p>语义相似度算法，精准判断关联度</p>
        </div>
        <div class="feature">
          <div class="feature-icon">📚</div>
          <h3>海量词库</h3>
          <p>1000+词汇，10大分类持续更新</p>
        </div>
      </div>

      <!-- 错误提示 -->
      <div v-if="error" class="error-message animate-fadeIn">
        {{ error }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useWebSocket } from '../composables/useWebSocket'

const router = useRouter()
const { connect, send, on } = useWebSocket()

const nickname = ref('')
const roomIdInput = ref('')
const error = ref('')

// 初始化WebSocket
connect().catch(() => {
  error.value = '连接服务器失败，请刷新重试'
})

// 监听房间创建成功
on('ROOM_CREATED', (data) => {
  localStorage.setItem('userToken', data.token)
  localStorage.setItem('userId', data.userId)
  localStorage.setItem('nickname', nickname.value)
  router.push(`/room/${data.roomId}`)
})

// 监听加入房间成功
on('ROOM_JOINED', (data) => {
  localStorage.setItem('userToken', data.token)
  localStorage.setItem('userId', data.userId)
  localStorage.setItem('nickname', nickname.value)
  router.push(`/room/${data.roomId}`)
})

// 监听错误
on('ERROR', (data) => {
  error.value = data.message
  setTimeout(() => error.value = '', 3000)
})

// 创建房间
function createRoom() {
  if (!nickname.value.trim()) {
    error.value = '请输入昵称'
    return
  }
  send('CREATE_ROOM', { nickname: nickname.value.trim() })
}

// 加入房间
function joinRoom() {
  if (!nickname.value.trim()) {
    error.value = '请输入昵称'
    return
  }
  if (!roomIdInput.value.trim()) {
    error.value = '请输入房间号'
    return
  }
  send('JOIN_ROOM', { 
    roomId: roomIdInput.value.trim().toUpperCase(),
    nickname: nickname.value.trim()
  })
}
</script>

<style scoped>
.home {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.container {
  width: 100%;
  max-width: 500px;
  position: relative;
  z-index: 1;
}

.header {
  text-align: center;
  margin-bottom: 32px;
}

.logo {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-bottom: 12px;
}

.logo-icon {
  font-size: 42px;
}

.logo h1 {
  font-size: 42px;
  font-weight: 700;
  background: var(--gradient);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.subtitle {
  color: var(--text-secondary);
  font-size: 16px;
}

.main-card {
  padding: 32px;
  margin-bottom: 32px;
}

.input-group {
  margin-bottom: 24px;
}

.input-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 600;
  color: var(--text-secondary);
}

/* 增大输入框尺寸 */
.input {
  width: 100%;
  height: 52px !important;
  padding: 14px 18px !important;
  font-size: 17px !important;
  border-radius: 12px;
  border: 2px solid var(--border);
  background: rgba(255, 255, 255, 0.08);
  color: var(--text);
  transition: all 0.3s ease;
  box-sizing: border-box;
}

.input:focus {
  outline: none;
  border-color: var(--primary);
  background: rgba(255, 255, 255, 0.12);
  box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.2);
}

.input::placeholder {
  color: var(--text-muted);
}

.actions {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.actions .btn {
  width: 100%;
  padding: 16px;
  font-size: 18px;
}

.divider {
  text-align: center;
  color: var(--text-secondary);
  position: relative;
}

.divider::before,
.divider::after {
  content: '';
  position: absolute;
  top: 50%;
  width: 40%;
  height: 1px;
  background: var(--border);
}

.divider::before {
  left: 0;
}

.divider::after {
  right: 0;
}

.join-group {
  display: flex;
  gap: 12px;
}

.join-group .input {
  flex: 1;
  min-width: 0;
}

.features {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

.feature {
  text-align: center;
  padding: 20px;
}

.feature-icon {
  font-size: 32px;
  margin-bottom: 8px;
}

.feature h3 {
  font-size: 16px;
  margin-bottom: 4px;
}

.feature p {
  font-size: 13px;
  color: var(--text-secondary);
}

.error-message {
  margin-top: 16px;
  padding: 12px 16px;
  background: rgba(239, 68, 68, 0.2);
  border: 1px solid var(--danger);
  border-radius: 12px;
  color: #fca5a5;
  text-align: center;
}

@media (max-width: 600px) {
  .logo h1 {
    font-size: 32px;
  }
  
  .main-card {
    padding: 24px;
  }
  
  .features {
    grid-template-columns: 1fr;
    gap: 8px;
  }
  
  .feature {
    padding: 12px;
  }
}
</style>