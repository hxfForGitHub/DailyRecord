/**
 * API 客户端
 */

const BASE_URL = 'http://127.0.0.1:8765'

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${BASE_URL}${path}`
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  })
  if (!res.ok) {
    throw new Error(`API Error: ${res.status} ${res.statusText}`)
  }
  return res.json()
}

// ========== Task API ==========

export interface TaskData {
  id: string
  name: string
  category: string
  priority: number
  status: string
  progress: number
  created_at: string
  updated_at: string
}

export interface TaskCreateParams {
  name: string
  category?: string
  priority?: number
}

export interface TaskUpdateParams {
  name?: string
  category?: string
  priority?: number
  status?: string
  progress?: number
}

export const TaskAPI = {
  list: () => request<{ tasks: TaskData[] }>('/api/tasks'),

  create: (data: TaskCreateParams) =>
    request<{ task: TaskData }>('/api/tasks', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getNames: () => request<{ names: string[] }>('/api/tasks/names'),

  get: (id: string) => request<{ task: TaskData }>(`/api/tasks/${id}`),

  update: (id: string, data: TaskUpdateParams) =>
    request<{ task: TaskData }>(`/api/tasks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    request<{ message: string }>(`/api/tasks/${id}`, {
      method: 'DELETE',
    }),
}

// ========== Record API ==========

export interface RecordData {
  id: string
  task_id: string | null
  task_name: string | null
  category: string
  progress: number
  note: string
  status: string
  priority: number
  created_at: string
}

export interface RecordCreateParams {
  task_id?: string | null
  task_name?: string | null
  category?: string
  progress?: number
  note?: string
  priority?: number
}

export const RecordAPI = {
  list: (limit?: number) =>
    request<{ records: RecordData[] }>(`/api/records?limit=${limit || 100}`),

  create: (data: RecordCreateParams) =>
    request<{ record: RecordData }>('/api/records', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  skip: () =>
    request<{ record: RecordData }>('/api/records/skip', {
      method: 'POST',
    }),

  today: () => request<{ records: RecordData[] }>('/api/records/today'),

  timeline: () => request<{ timeline: RecordData[] }>('/api/records/timeline'),
}

// ========== Config API ==========

export const ConfigAPI = {
  get: () => request<Record<string, unknown>>('/api/config'),
  update: (data: { reminder_interval?: number; reminder_enabled?: boolean; notification_sound?: boolean }) =>
    request<{ message: string; config: Record<string, unknown> }>('/api/config', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  health: () => request<{ status: string }>('/api/health'),
  triggerReminder: () =>
    request<{ message: string }>('/api/config/reminder/trigger', {
      method: 'POST',
    }),
}
