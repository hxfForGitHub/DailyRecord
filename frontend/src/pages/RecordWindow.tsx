import React, { useEffect, useState } from 'react'
import {
  Card,
  Typography,
  Input,
  Select,
  Button,
  Space,
  message,
  Radio,
  Slider,
} from 'antd'
import { ClockCircleOutlined } from '@ant-design/icons'
import { TaskAPI, RecordAPI } from '../api/client'

const { Title, Text } = Typography
const { TextArea } = Input

interface RecordWindowProps {
  onClose: () => void
  message: string
}

const CATEGORIES = ['开发', '会议', '文档', '设计', '其他']
const QUICK_PROGRESS = [0, 25, 50, 75, 90, 100]

const RecordWindow: React.FC<RecordWindowProps> = ({ onClose, message: reminderMessage }) => {
  const [taskNames, setTaskNames] = useState<string[]>([])
  const [selectedName, setSelectedName] = useState<string | undefined>(undefined)
  const [customName, setCustomName] = useState('')
  const [category, setCategory] = useState('开发')
  const [priority, setPriority] = useState<number>(1)
  const [progress, setProgress] = useState(0)
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [mode, setMode] = useState<'select' | 'new'>('select')

  // 加载已有事项名称列表
  useEffect(() => {
    TaskAPI.getNames()
      .then((res) => setTaskNames(res.names))
      .catch(() => {})
  }, [])

  const handleSave = async () => {
    const name = mode === 'select' ? selectedName : customName
    if (!name?.trim()) {
      message.warning('请选择或输入事项名称')
      return
    }

    setSaving(true)
    try {
      await RecordAPI.create({
        task_name: name.trim(),
        category,
        priority,
        progress,
        note: note.trim(),
      })
      message.success('记录已保存')
      onClose()
    } catch {
      message.error('保存失败，请重试')
    } finally {
      setSaving(false)
    }
  }

  const handleSkip = async () => {
    try {
      await RecordAPI.skip()
    } catch {
      // ignore
    }
    onClose()
  }

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        background: 'rgba(0,0,0,0.02)',
        padding: 24,
      }}
    >
      <Card
        className="fade-in"
        style={{
          width: 600,
          borderRadius: 12,
          boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
        }}
        actions={[
          <Button key="skip" onClick={handleSkip} style={{ minWidth: 100 }}>
            本次跳过
          </Button>,
          <Button
            key="save"
            type="primary"
            onClick={handleSave}
            loading={saving}
            style={{ minWidth: 100 }}
          >
            保存
          </Button>,
        ]}
      >
        {/* 标题 */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <ClockCircleOutlined style={{ fontSize: 28, color: '#1677ff', marginBottom: 8 }} />
          <Title level={4} style={{ margin: 0 }}>
            记录当前工作
          </Title>
          <Text type="secondary">{reminderMessage}</Text>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* 事项选择 */}
          <div>
            <Text strong style={{ marginBottom: 8, display: 'block' }}>
              当前事项
            </Text>
            <Radio.Group
              value={mode}
              onChange={(e) => setMode(e.target.value)}
              style={{ marginBottom: 8 }}
            >
              <Radio.Button value="select">选择历史事项</Radio.Button>
              <Radio.Button value="new">新增事项</Radio.Button>
            </Radio.Group>

            {mode === 'select' ? (
              <Select
                value={selectedName}
                onChange={setSelectedName}
                placeholder="选择已有事项..."
                style={{ width: '100%' }}
                showSearch
                allowClear
                options={taskNames.map((n) => ({ label: n, value: n }))}
              />
            ) : (
              <Input
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="输入新事项名称..."
                autoFocus
              />
            )}
          </div>

          {/* 分类 */}
          <div>
            <Text strong style={{ marginBottom: 8, display: 'block' }}>
              分类
            </Text>
            <Select
              value={category}
              onChange={setCategory}
              style={{ width: '100%' }}
              options={CATEGORIES.map((c) => ({ label: c, value: c }))}
            />
          </div>

          {/* 优先级 */}
          <div>
            <Text strong style={{ marginBottom: 8, display: 'block' }}>
              优先级
            </Text>
            <Radio.Group
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              optionType="button"
              buttonStyle="solid"
            >
              <Radio.Button value={1}>低</Radio.Button>
              <Radio.Button value={2}>中</Radio.Button>
              <Radio.Button value={3}>高</Radio.Button>
            </Radio.Group>
          </div>

          {/* 完成进度 */}
          <div>
            <Text strong style={{ marginBottom: 8, display: 'block' }}>
              完成进度：<Text style={{ color: '#1677ff' }}>{progress}%</Text>
            </Text>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
              {QUICK_PROGRESS.map((p) => (
                <Button
                  key={p}
                  size="small"
                  type={progress === p ? 'primary' : 'default'}
                  onClick={() => setProgress(p)}
                >
                  {p}%
                </Button>
              ))}
            </div>
            <Slider
              value={progress}
              onChange={setProgress}
              min={0}
              max={100}
              marks={{ 0: '0%', 25: '25%', 50: '50%', 75: '75%', 100: '100%' }}
            />
          </div>

          {/* 备注 */}
          <div>
            <Text strong style={{ marginBottom: 8, display: 'block' }}>
              备注/进展
            </Text>
            <TextArea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="描述当前进展、遇到的问题等..."
              rows={3}
              maxLength={500}
              showCount
            />
          </div>
        </div>
      </Card>
    </div>
  )
}

export default RecordWindow
