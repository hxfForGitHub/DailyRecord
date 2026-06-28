/**
 * WebSocket 客户端
 * 接收后端推送的提醒和通知
 */

type MessageHandler = (data: Record<string, unknown>) => void

class WSClient {
  private ws: WebSocket | null = null
  private handlers: Map<string, MessageHandler[]> = new Map()
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private url: string

  constructor(url = 'ws://127.0.0.1:8765/ws') {
    this.url = url
  }

  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) return

    try {
      this.ws = new WebSocket(this.url)

      this.ws.onopen = () => {
        console.log('[WS] 已连接')
      }

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          const type = data.type as string
          const handlers = this.handlers.get(type) || []
          handlers.forEach((fn) => fn(data))
          // 也触发通用 handler
          const allHandlers = this.handlers.get('*') || []
          allHandlers.forEach((fn) => fn(data))
        } catch (e) {
          console.error('[WS] 消息解析失败:', e)
        }
      }

      this.ws.onclose = () => {
        console.log('[WS] 连接关闭，5秒后重连')
        this.scheduleReconnect()
      }

      this.ws.onerror = () => {
        console.error('[WS] 连接错误')
      }
    } catch (e) {
      console.error('[WS] 连接失败:', e)
      this.scheduleReconnect()
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      this.connect()
    }, 5000)
  }

  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    this.ws?.close()
    this.ws = null
  }

  send(data: Record<string, unknown>): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data))
    }
  }

  on(type: string, handler: MessageHandler): () => void {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, [])
    }
    this.handlers.get(type)!.push(handler)
    return () => {
      const list = this.handlers.get(type)
      if (list) {
        const idx = list.indexOf(handler)
        if (idx >= 0) list.splice(idx, 1)
      }
    }
  }

  get connected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN
  }
}

export const wsClient = new WSClient()
