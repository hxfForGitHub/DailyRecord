import React, { useEffect, useState } from 'react'
import { ConfigProvider, Layout } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import Dashboard from './pages/Dashboard'
import Settings from './pages/Settings'
import RecordWindow from './pages/RecordWindow'
import { wsClient } from './api/websocket'

const { Content } = Layout

const isElectron = !!window.electronAPI

function getHashPage(): string {
  return window.location.hash.replace('#/', '').split('?')[0] || 'dashboard'
}

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<string>(getHashPage())
  const [reminderVisible, setReminderVisible] = useState(false)
  const [reminderMessage, setReminderMessage] = useState('')

  // 同步 hash 变化
  useEffect(() => {
    const onHashChange = () => setCurrentPage(getHashPage())
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  // 切换页面时更新 hash
  const navigate = (page: string) => {
    setCurrentPage(page)
    window.location.hash = `#/${page}`
  }

  // 连接 WebSocket 接收提醒
  useEffect(() => {
    wsClient.connect()

    const unsubReminder = wsClient.on('reminder', (data) => {
      const msg = (data.message as string) || '时间到啦，记录一下当前在做什么？'
      setReminderMessage(msg)

      if (isElectron) {
        // Electron 模式：弹出 macOS 原生通知
        window.electronAPI!.showNotification({
          title: 'DailyRecord',
          body: msg,
        })
      } else {
        // Web 模式：显示页面内弹窗
        setReminderVisible(true)
      }
    })

    // 监听 Electron 通知点击 -> 打开记录窗口
    if (isElectron) {
      window.electronAPI!.onOpenRecordWindow(() => {
        navigate('record')
      })
    }

    return () => {
      unsubReminder()
      wsClient.disconnect()
    }
  }, [])

  const handleRecordClose = () => {
    setReminderVisible(false)
    navigate('dashboard')
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'record':
        return <RecordWindow onClose={handleRecordClose} message={reminderMessage} />
      case 'settings':
        return <Settings onBack={() => navigate('dashboard')} />
      case 'dashboard':
      default:
        return (
          <Dashboard
            onOpenRecord={() => navigate('record')}
            onOpenSettings={() => navigate('settings')}
          />
        )
    }
  }

  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        token: {
          colorPrimary: '#1677ff',
          borderRadius: 8,
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif",
        },
      }}
    >
      <Layout style={{ minHeight: '100vh', background: '#f5f5f5' }}>
        <Content>{renderPage()}</Content>
        {/* Web 模式提醒弹窗 */}
        {!isElectron && reminderVisible && currentPage !== 'record' && (
          <div className="fade-in" style={{
            position: 'fixed',
            top: 20,
            right: 20,
            zIndex: 1000,
            background: '#fff',
            borderRadius: 12,
            boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
            padding: '20px 24px',
            width: 360,
            border: '1px solid #e8e8e8',
          }}>
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 12, color: '#1f1f1f' }}>
              ⏰ 时间提醒
            </div>
            <div style={{ fontSize: 14, color: '#666', marginBottom: 16 }}>
              {reminderMessage}
            </div>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button
                className="no-drag"
                onClick={() => {
                  wsClient.send({ action: 'skip' })
                  setReminderVisible(false)
                }}
                style={{
                  padding: '6px 16px',
                  borderRadius: 6,
                  border: '1px solid #d9d9d9',
                  background: '#fff',
                  cursor: 'pointer',
                  fontSize: 14,
                }}
              >
                本次跳过
              </button>
              <button
                className="no-drag"
                onClick={() => navigate('record')}
                style={{
                  padding: '6px 16px',
                  borderRadius: 6,
                  border: '1px solid #1677ff',
                  background: '#1677ff',
                  color: '#fff',
                  cursor: 'pointer',
                  fontSize: 14,
                }}
              >
                填写
              </button>
            </div>
          </div>
        )}
      </Layout>
    </ConfigProvider>
  )
}

export default App
