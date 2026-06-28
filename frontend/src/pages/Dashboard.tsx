import React, { useEffect, useState, useCallback } from 'react'
import {
  Layout,
  Typography,
  Button,
  Space,
  Row,
  Col,
  Card,
  Tag,
  Progress,
  Modal,
  Input,
  Select,
  Empty,
  Spin,
  message,
  Dropdown,
  Timeline,
  Badge,
} from 'antd'
import {
  PlusOutlined,
  SettingOutlined,
  EditOutlined,
  DeleteOutlined,
  ClockCircleOutlined,
  MoreOutlined,
  UnorderedListOutlined,
} from '@ant-design/icons'
import { TaskAPI, TaskData, RecordAPI, RecordData } from '../api/client'

const { Header, Content: AntContent } = Layout
const { Title, Text } = Typography

// 状态颜色映射
const statusColors: Record<string, string> = {
  todo: 'default',
  in_progress: 'processing',
  done: 'success',
  cancelled: 'error',
}

const statusLabels: Record<string, string> = {
  todo: '待办',
  in_progress: '处理中',
  done: '已完成',
  cancelled: '已取消',
}

const priorityLabels: Record<number, string> = {
  1: '低',
  2: '中',
  3: '高',
}

const priorityColors: Record<number, string> = {
  1: 'default',
  2: 'orange',
  3: 'red',
}

interface DashboardProps {
  onOpenRecord: () => void
  onOpenSettings: () => void
}

const Dashboard: React.FC<DashboardProps> = ({ onOpenRecord, onOpenSettings }) => {
  const [tasks, setTasks] = useState<TaskData[]>([])
  const [timeline, setTimeline] = useState<RecordData[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editTask, setEditTask] = useState<TaskData | null>(null)
  const [formName, setFormName] = useState('')
  const [formCategory, setFormCategory] = useState('其他')
  const [formPriority, setFormPriority] = useState<number>(1)

  const fetchData = useCallback(async () => {
    try {
      const [tasksRes, timelineRes] = await Promise.all([
        TaskAPI.list(),
        RecordAPI.timeline(),
      ])
      setTasks(tasksRes.tasks)
      setTimeline(timelineRes.timeline)
    } catch (e) {
      console.error('获取数据失败:', e)
      message.error('无法连接到后端服务')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
    const timer = setInterval(fetchData, 30000) // 30 秒刷新一次
    return () => clearInterval(timer)
  }, [fetchData])

  // 按状态分组
  const columns = [
    { status: 'todo', title: '待办', color: '#e6f4ff' },
    { status: 'in_progress', title: '处理中', color: '#fff7e6' },
    { status: 'done', title: '已完成', color: '#f6ffed' },
  ]

  const openCreateModal = () => {
    setEditTask(null)
    setFormName('')
    setFormCategory('其他')
    setFormPriority(1)
    setModalOpen(true)
  }

  const openEditModal = (task: TaskData) => {
    setEditTask(task)
    setFormName(task.name)
    setFormCategory(task.category)
    setFormPriority(task.priority)
    setModalOpen(true)
  }

  const handleSave = async () => {
    if (!formName.trim()) {
      message.warning('请输入事项名称')
      return
    }
    try {
      if (editTask) {
        await TaskAPI.update(editTask.id, {
          name: formName.trim(),
          category: formCategory,
          priority: formPriority,
        })
        message.success('事项已更新')
      } else {
        await TaskAPI.create({
          name: formName.trim(),
          category: formCategory,
          priority: formPriority,
        })
        message.success('事项已创建')
      }
      setModalOpen(false)
      fetchData()
    } catch (e) {
      message.error('保存失败')
    }
  }

  const handleDelete = (taskId: string) => {
    Modal.confirm({
      title: '确认删除',
      content: '删除后不可恢复，确定要删除该事项吗？',
      onOk: async () => {
        try {
          await TaskAPI.delete(taskId)
          message.success('已删除')
          fetchData()
        } catch {
          message.error('删除失败')
        }
      },
    })
  }

  const handleStatusChange = async (taskId: string, status: string) => {
    try {
      await TaskAPI.update(taskId, { status })
      fetchData()
    } catch {
      message.error('更新状态失败')
    }
  }

  // 今日统计
  const todayRecords = timeline.length
  const filledRecords = timeline.filter((r) => r.status === 'filled').length
  const skippedRecords = timeline.filter((r) => r.status === 'skipped').length

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin size="large" tip="加载中..." />
      </div>
    )
  }

  return (
    <Layout style={{ background: '#f5f5f5', minHeight: '100vh' }}>
      {/* 顶部栏 */}
      <Header
        style={{
          background: '#fff',
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid #f0f0f0',
          height: 56,
        }}
      >
        <div className="drag-region" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <ClockCircleOutlined style={{ fontSize: 22, color: '#1677ff' }} />
          <Title level={4} style={{ margin: 0 }}>
            DailyRecord
          </Title>
        </div>
        <Space className="no-drag">
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreateModal}>
            新建事项
          </Button>
          <Button icon={<SettingOutlined />} onClick={onOpenSettings}>
            设置
          </Button>
        </Space>
      </Header>

      <AntContent style={{ padding: 24 }}>
        {/* 统计卡片 */}
        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col span={6}>
            <Card size="small">
              <StatItem label="今日记录" value={todayRecords} color="#1677ff" />
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small">
              <StatItem label="已填写" value={filledRecords} color="#52c41a" />
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small">
              <StatItem label="已跳过" value={skippedRecords} color="#faad14" />
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small">
              <StatItem label="进行中事项" value={tasks.filter(t => t.status === 'in_progress').length} color="#722ed1" />
            </Card>
          </Col>
        </Row>

        <Row gutter={24}>
          {/* 看板列 */}
          <Col span={16}>
            <Row gutter={16}>
              {columns.map((col) => {
                const colTasks = tasks.filter((t) => t.status === col.status)
                return (
                  <Col span={8} key={col.status}>
                    <Card
                      title={
                        <Text strong style={{ fontSize: 14 }}>
                          {col.title}
                          <Tag style={{ marginLeft: 8 }}>{colTasks.length}</Tag>
                        </Text>
                      }
                      size="small"
                      style={{
                        background: col.color,
                        borderRadius: 8,
                        minHeight: 300,
                      }}
                      styles={{ body: { padding: 8 } }}
                    >
                      {colTasks.length === 0 ? (
                        <Empty description="暂无事项" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                      ) : (
                        colTasks.map((task) => (
                          <Card
                            key={task.id}
                            size="small"
                            style={{ marginBottom: 8, borderRadius: 6 }}
                            actions={[
                              <Dropdown
                                key="status"
                                menu={{
                                  items: [
                                    { key: 'todo', label: '待办' },
                                    { key: 'in_progress', label: '处理中' },
                                    { key: 'done', label: '已完成' },
                                    { key: 'cancelled', label: '已取消' },
                                  ].map((item) => ({
                                    ...item,
                                    onClick: () => handleStatusChange(task.id, item.key),
                                  })),
                                }}
                              >
                                <EditOutlined />
                              </Dropdown>,
                              <EditOutlined key="edit" onClick={() => openEditModal(task)} />,
                              <DeleteOutlined key="delete" onClick={() => handleDelete(task.id)} />,
                            ]}
                          >
                            <div style={{ marginBottom: 6 }}>
                              <Tag color={priorityColors[task.priority]}>
                                {priorityLabels[task.priority]}
                              </Tag>
                              <Tag>{task.category}</Tag>
                            </div>
                            <Text strong style={{ fontSize: 14 }}>
                              {task.name}
                            </Text>
                            <Progress
                              percent={task.progress}
                              size="small"
                              style={{ marginTop: 8, marginBottom: 0 }}
                            />
                          </Card>
                        ))
                      )}
                    </Card>
                  </Col>
                )
              })}
            </Row>
          </Col>

          {/* 时间线 */}
          <Col span={8}>
            <Card
              title={<Text strong>📅 今日时间线</Text>}
              size="small"
              style={{ borderRadius: 8 }}
              extra={
                <Button type="link" size="small" icon={<UnorderedListOutlined />} onClick={onOpenRecord}>
                  记录
                </Button>
              }
            >
              {timeline.length === 0 ? (
                <Empty description="今天还没有记录" image={Empty.PRESENTED_IMAGE_SIMPLE} />
              ) : (
                <Timeline
                  items={timeline.map((r) => {
                    const time = r.created_at ? new Date(r.created_at).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) : ''
                    let color: string
                    let children: React.ReactNode

                    if (r.status === 'skipped') {
                      color = 'gray'
                      children = (
                        <div>
                          <Text type="secondary" style={{ fontSize: 12 }}>{time}</Text>
                          <br />
                          <Text type="secondary">⏭️ 已跳过</Text>
                        </div>
                      )
                    } else {
                      color = r.progress >= 100 ? 'green' : 'blue'
                      children = (
                        <div>
                          <Text type="secondary" style={{ fontSize: 12 }}>{time}</Text>
                          <br />
                          <Text strong style={{ fontSize: 13 }}>{r.task_name || '未命名事项'}</Text>
                          {r.note && (
                            <>
                              <br />
                              <Text type="secondary" style={{ fontSize: 12 }}>{r.note}</Text>
                            </>
                          )}
                          <Progress percent={r.progress} size="small" style={{ marginTop: 4, marginBottom: 0 }} />
                        </div>
                      )
                    }
                    return { color, children }
                  })}
                />
              )}
            </Card>
          </Col>
        </Row>
      </AntContent>

      {/* 新建/编辑事项弹窗 */}
      <Modal
        title={editTask ? '编辑事项' : '新建事项'}
        open={modalOpen}
        onOk={handleSave}
        onCancel={() => setModalOpen(false)}
        okText="保存"
        cancelText="取消"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <Text style={{ marginBottom: 4, display: 'block' }}>事项名称</Text>
            <Input
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="请输入事项名称"
            />
          </div>
          <div>
            <Text style={{ marginBottom: 4, display: 'block' }}>分类</Text>
            <Select
              value={formCategory}
              onChange={setFormCategory}
              style={{ width: '100%' }}
              options={['开发', '会议', '文档', '设计', '其他'].map((c) => ({ label: c, value: c }))}
            />
          </div>
          <div>
            <Text style={{ marginBottom: 4, display: 'block' }}>优先级</Text>
            <Select
              value={formPriority}
              onChange={setFormPriority}
              style={{ width: '100%' }}
              options={[
                { label: '低', value: 1 },
                { label: '中', value: 2 },
                { label: '高', value: 3 },
              ]}
            />
          </div>
        </div>
      </Modal>
    </Layout>
  )
}

// 统计项组件
const StatItem: React.FC<{ label: string; value: number; color: string }> = ({
  label,
  value,
  color,
}) => (
  <div style={{ textAlign: 'center' }}>
    <div style={{ fontSize: 28, fontWeight: 700, color }}>{value}</div>
    <div style={{ fontSize: 13, color: '#999' }}>{label}</div>
  </div>
)

export default Dashboard
