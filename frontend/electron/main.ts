/**
 * Electron 主进程
 *
 * 负责：
 * 1. 创建/管理窗口（主窗口 + 记录窗口）
 * 2. macOS 原生通知
 * 3. 菜单栏驻留图标
 * 4. Python 后端进程管理
 */

import { app, BrowserWindow, ipcMain, Notification, Tray, Menu, nativeImage } from 'electron'
import { spawn, ChildProcess } from 'child_process'
import path from 'path'

let mainWindow: BrowserWindow | null = null
let recordWindow: BrowserWindow | null = null
let pythonProcess: ChildProcess | null = null
let tray: Tray | null = null
let isQuitting = false

const BACKEND_PORT = 8765
const BACKEND_URL = `http://127.0.0.1:${BACKEND_PORT}`
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged

// ========== Python 后端管理 ==========

function getProjectRoot(): string {
  if (isDev) {
    return path.resolve(__dirname, '..', '..')
  }
  return process.resourcesPath
}

function startPythonBackend(): void {
  const root = getProjectRoot()

  if (isDev) {
    // 开发模式：使用 venv Python 运行源码
    const pythonPath = path.join(root, 'venv', 'bin', 'python3')
    console.log(`[Electron] 开发模式启动后端: ${pythonPath} -m backend.main`)

    pythonProcess = spawn(pythonPath, ['-m', 'backend.main'], {
      cwd: root,
      env: { ...process.env, PYTHONUNBUFFERED: '1' },
      stdio: ['pipe', 'pipe', 'pipe'],
    })
  } else {
    // 生产模式：使用 PyInstaller 打包的独立二进制
    const backendBin = path.join(root, 'backend', 'dailyrecord-backend')
    console.log(`[Electron] 生产模式启动后端: ${backendBin}`)

    pythonProcess = spawn(backendBin, [], {
      cwd: path.dirname(backendBin),
      env: { ...process.env },
      stdio: ['pipe', 'pipe', 'pipe'],
    })
  }

  pythonProcess.stdout?.on('data', (data: Buffer) => {
    const msg = data.toString().trim()
    if (msg) console.log(`[Backend] ${msg}`)
  })

  pythonProcess.stderr?.on('data', (data: Buffer) => {
    const msg = data.toString().trim()
    if (msg && !msg.includes('INFO') && !msg.includes('WARNING')) {
      console.error(`[Backend] ${msg}`)
    }
  })

  pythonProcess.on('error', (err) => {
    console.error(`[Electron] 后端启动失败: ${err.message}`)
    // 开发模式下不自动重启，方便调试
    if (!isDev) {
      setTimeout(startPythonBackend, 5000)
    }
  })

  pythonProcess.on('exit', (code) => {
    console.log(`[Electron] 后端已退出 (code: ${code})`)
  })
}

function stopPythonBackend(): void {
  if (pythonProcess) {
    pythonProcess.kill('SIGTERM')
    setTimeout(() => {
      if (pythonProcess) {
        pythonProcess.kill('SIGKILL')
        pythonProcess = null
      }
    }, 3000)
  }
}

// ========== 窗口管理 ==========

function createMainWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 750,
    minWidth: 800,
    minHeight: 600,
    title: 'DailyRecord',
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    show: false,
  })

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
  }

  // 关闭时隐藏而非退出（驻留菜单栏）
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault()
      mainWindow?.hide()
    }
  })
}

function createRecordWindow(data?: { task_name?: string }): void {
  if (recordWindow && !recordWindow.isDestroyed()) {
    recordWindow.focus()
    return
  }

  recordWindow = new BrowserWindow({
    width: 640,
    height: 580,
    resizable: false,
    title: '记录当前工作',
    titleBarStyle: 'hiddenInset',
    center: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    show: false,
  })

  recordWindow.once('ready-to-show', () => {
    recordWindow?.show()
  })

  const url = isDev
    ? `http://localhost:5173/#/record${data?.task_name ? `?task=${encodeURIComponent(data.task_name)}` : ''}`
    : `file://${path.join(__dirname, '..', 'dist', 'index.html')}#/record`

  recordWindow.loadURL(url)

  recordWindow.on('closed', () => {
    recordWindow = null
  })
}

// ========== 菜单栏图标 ==========

function createTray(): void {
  // 16x16 透明图标（使用系统内置图标）
  const icon = nativeImage.createFromBuffer(
    Buffer.alloc(32 * 32 * 4, 0),
    { width: 32, height: 32 }
  )

  tray = new Tray(icon)

  const contextMenu = Menu.buildFromTemplate([
    {
      label: '打开 DailyRecord',
      click: () => mainWindow?.show() || createMainWindow(),
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
  tray.on('click', () => mainWindow?.show() || createMainWindow())
}

// ========== IPC 处理器 ==========

ipcMain.handle('get-backend-url', () => BACKEND_URL)

ipcMain.on('show-notification', (_event, data: { title?: string; body?: string }) => {
  const notification = new Notification({
    title: data.title || 'DailyRecord',
    body: data.body || '',
  })

  notification.on('click', () => {
    mainWindow?.show()
    mainWindow?.focus()
    // 通知主窗口弹起记录窗口
    mainWindow?.webContents.send('open-record-window')
  })

  notification.show()
})

ipcMain.on('open-main-window', () => {
  mainWindow?.show()
  mainWindow?.focus()
})

ipcMain.on('minimize-to-tray', () => {
  mainWindow?.hide()
})

// ========== 应用生命周期 ==========

app.on('before-quit', () => {
  isQuitting = true
})

app.whenReady().then(() => {
  startPythonBackend()
  createMainWindow()
  createTray()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow()
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
  stopPythonBackend()
})
