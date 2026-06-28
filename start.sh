#!/bin/bash
# DailyRecord 开发启动脚本
# 同时启动 Python 后端和前端开发服务器
#
# 用法:
#   ./start.sh            # 启动 Web 模式（浏览器访问 localhost:5173）
#   ./start.sh electron   # 启动 Electron 桌面模式

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

MODE="${1:-web}"

echo "=============================="
echo "  DailyRecord 开发启动"
echo "  模式: $MODE"
echo "=============================="

# 检查 Python 虚拟环境
if [ ! -d "venv" ]; then
    echo "[Setup] 创建 Python 虚拟环境..."
    python3 -m venv venv
    source venv/bin/activate
    pip install -r backend/requirements.txt -q
else
    source venv/bin/activate
fi

# 启动 Python 后端（后台运行）
echo "[Backend] 启动后端服务..."
python3 -m backend.main &
BACKEND_PID=$!
echo "[Backend] PID: $BACKEND_PID (端口: 8765)"

# 等待后端就绪
echo "[Backend] 等待后端就绪..."
for i in $(seq 1 30); do
    if curl -s http://127.0.0.1:8765/api/health > /dev/null 2>&1; then
        echo "[Backend] 后端已就绪"
        break
    fi
    sleep 1
done

# 安装前端依赖（如需要）
if [ ! -d "frontend/node_modules" ]; then
    echo "[Frontend] 安装前端依赖..."
    cd frontend
    npm install
    cd "$SCRIPT_DIR"
fi

# 启动前端
if [ "$MODE" = "electron" ]; then
    echo "[Frontend] 启动 Electron 桌面应用..."
    cd frontend
    npm run dev:electron &
    FRONTEND_PID=$!
    cd "$SCRIPT_DIR"
    echo ""
    echo "=============================="
    echo "  Electron 应用已启动"
    echo "=============================="
else
    echo "[Frontend] 启动 Web 开发服务器..."
    cd frontend
    npm run dev &
    FRONTEND_PID=$!
    cd "$SCRIPT_DIR"
    echo ""
    echo "=============================="
    echo "  后端: http://127.0.0.1:8765"
    echo "  前端: http://localhost:5173"
    echo "=============================="
fi

echo ""
echo "按 Ctrl+C 停止所有服务"

# 捕获退出信号
cleanup() {
    echo ""
    echo "正在停止服务..."
    kill $FRONTEND_PID 2>/dev/null
    kill $BACKEND_PID 2>/dev/null
    wait $FRONTEND_PID 2>/dev/null
    wait $BACKEND_PID 2>/dev/null
    echo "已停止"
}

trap cleanup EXIT INT TERM

# 等待后台进程
wait
