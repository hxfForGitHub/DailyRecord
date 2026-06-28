import React, { useEffect, useState } from 'react'
import { Card, Typography, Button, Form, InputNumber, Switch, message, Space, Divider, Spin } from 'antd'
import { ArrowLeftOutlined } from '@ant-design/icons'
import { ConfigAPI } from '../api/client'

const { Title, Text } = Typography

interface SettingsProps {
  onBack: () => void
}

interface ConfigData {
  reminder: {
    interval_minutes: number
    enabled: boolean
  }
  storage: {
    path: string
    format: string
  }
  appearance: {
    theme: string
    language: string
  }
  notification: {
    sound: boolean
  }
}

const Settings: React.FC<SettingsProps> = ({ onBack }) => {
  const [config, setConfig] = useState<ConfigData | null>(null)
  const [loading, setLoading] = useState(true)
  const [interval, setInterval] = useState(20)
  const [enabled, setEnabled] = useState(true)
  const [sound, setSound] = useState(true)

  useEffect(() => {
    ConfigAPI.get()
      .then((data) => {
        const c = data as unknown as ConfigData
        setConfig(c)
        setInterval(c.reminder.interval_minutes)
        setEnabled(c.reminder.enabled)
        setSound(c.notification.sound)
      })
      .catch(() => message.error('加载配置失败'))
      .finally(() => setLoading(false))
  }, [])

  const handleSave = () => {
    message.success('配置已保存（本地配置文件）')
  }

  const handleTrigger = async () => {
    try {
      await ConfigAPI.triggerReminder()
      message.success('已触发提醒')
    } catch {
      message.error('触发失败')
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin />
      </div>
    )
  }

  return (
    <div style={{ padding: 24, maxWidth: 600, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <Button type="text" icon={<ArrowLeftOutlined />} onClick={onBack} size="large">
          返回
        </Button>
      </div>

      <Title level={4}>设置</Title>

      <Card title="提醒设置" style={{ marginBottom: 16, borderRadius: 8 }}>
        <Form layout="vertical">
          <Form.Item label="启用定时提醒">
            <Switch checked={enabled} onChange={setEnabled} />
          </Form.Item>
          <Form.Item label="提醒间隔（分钟）">
            <InputNumber
              value={interval}
              onChange={(v) => setInterval(v || 20)}
              min={1}
              max={120}
              style={{ width: '100%' }}
            />
          </Form.Item>
          <Form.Item label="提醒声音">
            <Switch checked={sound} onChange={setSound} />
          </Form.Item>
        </Form>
      </Card>

      <Card title="存储信息" style={{ marginBottom: 16, borderRadius: 8 }}>
        <div style={{ marginBottom: 8 }}>
          <Text strong>存储格式：</Text>
          <Text>{config?.storage.format || 'sqlite'}</Text>
        </div>
        <div style={{ marginBottom: 8 }}>
          <Text strong>存储路径：</Text>
          <Text code>{config?.storage.path || './data'}</Text>
        </div>
      </Card>

      <Card title="关于" style={{ marginBottom: 16, borderRadius: 8 }}>
        <div style={{ marginBottom: 8 }}>
          <Text strong>版本：</Text>
          <Text>v0.1.0</Text>
        </div>
        <div>
          <Text strong>主题：</Text>
          <Text>{config?.appearance.theme === 'auto' ? '跟随系统' : config?.appearance.theme}</Text>
        </div>
      </Card>

      <Space>
        <Button type="primary" onClick={handleSave}>
          保存设置
        </Button>
        <Button onClick={handleTrigger}>手动触发提醒测试</Button>
      </Space>
    </div>
  )
}

export default Settings
