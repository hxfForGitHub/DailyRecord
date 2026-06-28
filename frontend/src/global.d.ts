/** Electron API 类型声明 */

interface ElectronAPI {
  getBackendUrl: () => Promise<string>
  showNotification: (data: { title: string; body: string }) => void
  onNotificationClicked: (callback: (data: { action: string }) => void) => void
  onReminder: (callback: (data: { message: string; timestamp: string }) => void) => void
}

interface Window {
  electronAPI?: ElectronAPI
}
