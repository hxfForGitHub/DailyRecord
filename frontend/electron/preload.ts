/**
 * Electron 预加载脚本
 * 通过 contextBridge 暴露安全的 API 给渲染进程
 */

import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  getBackendUrl: () => ipcRenderer.invoke('get-backend-url'),
  showNotification: (data: { title: string; body: string }) => {
    ipcRenderer.send('show-notification', data)
  },
  onNotificationClicked: (callback: (data: { action: string }) => void) => {
    ipcRenderer.on('notification-clicked', (_event, data) => callback(data))
  },
  onReminder: (callback: (data: { message: string; timestamp: string }) => void) => {
    ipcRenderer.on('reminder', (_event, data) => callback(data))
  },
})
