/**
 * WebSocket全局单例管理
 * 路由切换时保持连接不断开
 */

import { ref } from 'vue'

// 全局单例状态
let wsInstance = null
let isConnecting = false
let messageHandlers = new Map()
let reconnectAttempts = 0
const MAX_RECONNECT_ATTEMPTS = 5

const isConnected = ref(false)
const connectionError = ref(null)

// 获取WebSocket URL
function getWsUrl() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  const host = window.location.host
  return `${protocol}//${host}`
}

// 初始化WebSocket连接
function initConnection() {
  if (wsInstance && wsInstance.readyState === WebSocket.OPEN) {
    console.log('[WebSocket] 已有连接，复用')
    return Promise.resolve()
  }

  if (isConnecting) {
    console.log('[WebSocket] 正在连接中，等待...')
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (wsInstance && wsInstance.readyState === WebSocket.OPEN) {
          clearInterval(checkInterval)
          resolve()
        }
      }, 100)
    })
  }

  isConnecting = true
  console.log('[WebSocket] 开始建立新连接...')

  return new Promise((resolve, reject) => {
    try {
      const wsUrl = getWsUrl()
      wsInstance = new WebSocket(wsUrl)

      wsInstance.onopen = () => {
        console.log('[WebSocket] 连接成功')
        isConnected.value = true
        isConnecting = false
        connectionError.value = null
        reconnectAttempts = 0
        resolve()
      }

      wsInstance.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data)
          const handlers = messageHandlers.get(message.type) || []
          handlers.forEach(handler => handler(message.data))
        } catch (e) {
          console.error('[WebSocket] 消息解析错误', e)
        }
      }

      wsInstance.onerror = (error) => {
        console.error('[WebSocket] 连接错误', error)
        connectionError.value = '连接失败'
        isConnecting = false
      }

      wsInstance.onclose = (event) => {
        console.log(`[WebSocket] 连接关闭 (code: ${event.code})`)
        isConnected.value = false
        isConnecting = false

        // 自动重连（非主动关闭时）
        if (event.code !== 1000 && reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
          reconnectAttempts++
          console.log(`[WebSocket] ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS} 秒后重连...`)
          setTimeout(() => {
            initConnection()
          }, 2000)
        }
      }
    } catch (e) {
      console.error('[WebSocket] 创建连接失败', e)
      isConnecting = false
      reject(e)
    }
  })
}

// 发送消息
function send(type, data = {}) {
  if (!wsInstance || wsInstance.readyState !== WebSocket.OPEN) {
    console.warn('[WebSocket] 未连接，消息丢失:', type)
    return
  }
  wsInstance.send(JSON.stringify({ type, data }))
}

// 监听消息
function on(type, handler) {
  if (!messageHandlers.has(type)) {
    messageHandlers.set(type, [])
  }
  messageHandlers.get(type).push(handler)
}

// 移除监听
function off(type, handler) {
  const handlers = messageHandlers.get(type)
  if (handlers) {
    const index = handlers.indexOf(handler)
    if (index > -1) {
      handlers.splice(index, 1)
    }
  }
}

// 断开连接（主动断开不重连）
function disconnect() {
  if (wsInstance) {
    console.log('[WebSocket] 主动断开连接')
    wsInstance.close(1000, '主动断开')
    wsInstance = null
  }
  messageHandlers.clear()
}

// 导出composable
export function useWebSocket() {
  return {
    connect: initConnection,
    send,
    on,
    off,
    disconnect,
    isConnected,
    connectionError
  }
}