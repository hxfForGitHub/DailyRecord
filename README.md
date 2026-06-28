# DailyRecord

macOS 工作痕迹记录工具。每 20 分钟弹窗提醒，记录当前工作事项与进度，形成可回溯的工作时间线。

## 功能

- **定时提醒**：每 20 分钟 macOS 右上角通知弹窗，提醒记录当前工作
- **事项管理**：看板视图（待办/处理中/已完成），支持优先级、进度、分类管理
- **时间线**：按时间顺序展示今日所有工作记录
- **数据持久化**：SQLite 本地存储，无需联网，隐私安全

## 技术栈

- **后端**：Python 3.10+ / FastAPI / SQLAlchemy / APScheduler
- **前端**：React 18 / TypeScript / Ant Design 5
- **桌面壳**：Electron 28 / Vite 5
- **打包**：PyInstaller (后端) + electron-builder (DMG)

## 开发

```bash
# 1. 安装 Python 依赖
python3 -m venv venv
source venv/bin/activate
pip install -r backend/requirements.txt

# 2. 安装前端依赖
cd frontend && npm install && cd ..

# 3. 启动开发服务（Web 模式）
./start.sh
# 或 ./start.sh electron 启动 Electron 桌面模式

# 4. 访问 http://localhost:5173
```

## 打包

```bash
# 1. 打包 Python 后端
source venv/bin/activate
python3 scripts/build_backend.py

# 2. 打包 DMG
cd frontend
npm run package
# 输出: frontend/release/DailyRecord-*.dmg
```

## 项目结构

```
DailyRecord/
├── backend/           # Python 后端
│   ├── main.py        # FastAPI 入口 + WebSocket
│   ├── api/           # RESTful API 路由
│   ├── core/          # 配置 + 调度器 + 通知
│   ├── models/        # SQLAlchemy 数据模型
│   └── storage/       # SQLite 持久化层
├── frontend/          # React + Electron 前端
│   ├── src/           # React 页面组件
│   ├── electron/      # Electron 主进程
│   └── build/         # 应用图标
├── scripts/           # 构建脚本
├── config.yaml        # 配置文件
└── start.sh           # 开发启动脚本
```
