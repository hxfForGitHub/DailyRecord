/**
 * Electron 预加载脚本
 * 通过 contextBridge 暴露安全的 API 给渲染进程
 */

import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  // 获取后端地址
  getBackendUrl: (): Promise<string> => ipcRenderer.invoke('get-backend-url'),

  // 显示 macOS 原生通知
  showNotification: (data: { title: string; body: string }) => {
    ipcRenderer.send('show-notification', data)
  },

  // 打开主窗口
  openMainWindow: () => {
    ipcRenderer.send('open-main-window')
  },

  // 最小化到托盘
  minimizeToTray: () => {
    ipcRenderer.send('minimize-to-tray')
  },

  // 监听打开记录窗口事件（从通知点击触发）
  onOpenRecordWindow: (callback: () => void) => {
    ipcRenderer.on('open-record-window', () => callback())
  },

  // 监听提醒
  onReminder: (callback: (data: { message: string; timestamp: string }) => void) => {
    ipcRenderer.on('reminder', (_event, data) => callback(data))
  },
})
