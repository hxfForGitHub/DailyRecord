import React from 'react'
import { Button } from 'antd'
import { RecordAPI } from '../api/client'

const ReminderPopup: React.FC = () => {
  const params = new URLSearchParams(window.location.hash.split('?')[1] || '')
  const message = params.get('message') || '时间到啦，记录一下当前在做什么？'
  const timestamp = params.get('ts') || ''

  const handleSkip = async () => {
    try {
      await RecordAPI.skip()
    } catch (e) {
      console.error('跳过失败:', e)
    }
    window.electronAPI?.closeReminderPopup()
  }

  const handleFill = () => {
    window.electronAPI?.openRecordWindow()
    window.electronAPI?.closeReminderPopup()
  }

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        justifyContent: 'center',
        background: 'transparent',
        WebkitAppRegion: 'drag',
        userSelect: 'none',
      }}
    >
      <div
        className="no-drag"
        style={{
          width: 360,
          background: 'rgba(255,255,255,0.98)',
          borderRadius: '0 0 12px 12px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
          padding: '20px 24px',
          backdropFilter: 'blur(20px)',
          height: 'fit-content',
          WebkitAppRegion: 'no-drag',
        }}
      >
        <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 12, color: '#1f1f1f' }}>
          ⏰ 时间提醒
          {timestamp && (
            <span style={{ fontSize: 12, fontWeight: 400, color: '#999', marginLeft: 8 }}>
              {timestamp}
            </span>
          )}
        </div>
        <div style={{ fontSize: 14, color: '#666', marginBottom: 16, lineHeight: 1.5 }}>
          {message}
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <Button onClick={handleSkip}>本次跳过</Button>
          <Button type="primary" onClick={handleFill}>
            填写
          </Button>
        </div>
      </div>
    </div>
  )
}

export default ReminderPopup
