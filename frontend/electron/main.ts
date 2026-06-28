/**
 * Electron 主进程
 *
 * 负责：
 * 1. 拉起 Python 后端进程
 * 2. 创建/管理窗口
 * 3. 处理 macOS 原生通知
 * 4. 管理菜单栏图标
 */

import { app, BrowserWindow, ipcMain, Notification, Tray, Menu, nativeImage } from 'electron'
import { spawn, ChildProcess } from 'child_process'
import path from 'path'

let mainWindow: BrowserWindow | null = null
let pythonProcess: ChildProcess | null = null
let tray: Tray | null = null
let isQuitting = false

const BACKEND_PORT = 8765
const BACKEND_URL = `http://127.0.0.1:${BACKEND_PORT}`
const isDev = process.env.NODE_ENV === 'development'

function getPythonPath(): string {
  if (isDev) {
    // 开发模式：使用 venv 中的 Python
    return path.join(__dirname, '..', '..', 'venv', 'bin', 'python3')
  }
  // 生产模式：使用 PyInstaller 打包的二进制
  return path.join(process.resourcesPath, 'backend', 'dailyrecord-backend')
}

function getBackendDir(): string {
  if (isDev) {
    return path.join(__dirname, '..', '..', 'backend')
  }
  return path.join(process.resourcesPath, 'backend')
}

function startPythonBackend(): void {
  const pythonPath = getPythonPath()
  const backendDir = getBackendDir()
  const mainPy = path.join(backendDir, 'main.py')

  console.log(`[Electron] 启动后端: ${pythonPath} ${mainPy}`)

  if (isDev) {
    pythonProcess = spawn(pythonPath, [mainPy], {
      cwd: path.join(__dirname, '..', '..'),
      env: { ...process.env, PYTHONUNBUFFERED: '1' },
    })
  } else {
    pythonProcess = spawn(pythonPath, [], {
      cwd: backendDir,
      env: { ...process.env, PYTHONUNBUFFERED: '1' },
    })
  }

  pythonProcess.stdout?.on('data', (data: Buffer) => {
    console.log(`[Backend] ${data.toString().trim()}`)
  })

  pythonProcess.stderr?.on('data', (data: Buffer) => {
    console.error(`[Backend Error] ${data.toString().trim()}`)
  })

  pythonProcess.on('error', (err) => {
    console.error('[Electron] 后端启动失败:', err.message)
  })

  pythonProcess.on('exit', (code) => {
    console.log(`[Electron] 后端已退出 (code: ${code})`)
    if (!isQuitting) {
      console.log('[Electron] 3秒后重启后端...')
      setTimeout(startPythonBackend, 3000)
    }
  })
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 750,
    minWidth: 800,
    minHeight: 600,
    title: 'DailyRecord',
    titleBarStyle: 'hiddenInset', // macOS 融合标题栏
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    show: false,
  })

  // 窗口准备好后显示（避免白屏闪烁）
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
  }

  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault()
      mainWindow?.hide()
    }
  })
}

function createTray(): void {
  // 创建简单的 16x16 菜单栏图标
  const icon = nativeImage.createEmpty()
  tray = new Tray(icon)

  const contextMenu = Menu.buildFromTemplate([
    {
      label: '打开 DailyRecord',
      click: () => {
        mainWindow?.show()
        mainWindow?.focus()
      },
    },
    { type: 'separator' },
    {
      label: '退出',
      click: () => {
        isQuitting = true
        app.quit()
      },
    },
  ])

  tray.setToolTip('DailyRecord')
  tray.setContextMenu(contextMenu)

  tray.on('click', () => {
    mainWindow?.show()
    mainWindow?.focus()
  })
}

// 处理 macOS 通知
ipcMain.on('show-notification', (_event, data: { title: string; body: string }) => {
  const notification = new Notification({
    title: data.title || 'DailyRecord',
    body: data.body || '',
  })

  notification.on('click', () => {
    // 点击通知 -> 打开记录窗口
    mainWindow?.webContents.send('notification-clicked', {
      action: 'fill',
    })
    mainWindow?.show()
    mainWindow?.focus()
  })

  notification.show()
})

// 处理 IPC 调用
ipcMain.handle('get-backend-url', () => {
  return BACKEND_URL
})

// macOS 退出处理
app.on('before-quit', () => {
  isQuitting = true
})

app.whenReady().then(() => {
  // 启动 Python 后端
  startPythonBackend()

  // 创建主窗口
  createWindow()
  createTray()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    } else {
      mainWindow?.show()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('will-quit', () => {
  if (pythonProcess) {
    pythonProcess.kill('SIGTERM')
    pythonProcess = null
  }
})
