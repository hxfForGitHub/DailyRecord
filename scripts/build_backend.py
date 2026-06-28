#!/usr/bin/env python3
"""
PyInstaller 构建脚本：将 Python 后端打包为独立可执行文件。
运行方式：
    python3 scripts/build_backend.py
输出：backend/dist/dailyrecord-backend (或 .exe)
"""

import os
import sys
import shutil

# 项目根目录
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BACKEND_DIR = os.path.join(PROJECT_ROOT, "backend")
OUTPUT_DIR = os.path.join(PROJECT_ROOT, "backend", "dist")

os.chdir(PROJECT_ROOT)
sys.path.insert(0, PROJECT_ROOT)

try:
    import PyInstaller.__main__
except ImportError:
    print("请先安装 PyInstaller: pip install pyinstaller")
    sys.exit(1)

# 清理旧构建
if os.path.exists(OUTPUT_DIR):
    shutil.rmtree(OUTPUT_DIR)
if os.path.exists(os.path.join(PROJECT_ROOT, "backend", "build")):
    shutil.rmtree(os.path.join(PROJECT_ROOT, "backend", "build"))

# PyInstaller 参数
args = [
    "--name=dailyrecord-backend",
    "--onefile",
    "--distpath=" + OUTPUT_DIR,
    "--workpath=" + os.path.join(PROJECT_ROOT, "backend", "build"),
    "--specpath=" + os.path.join(PROJECT_ROOT, "backend"),
    # 模块入口
    "backend/main.py",
    # 隐藏导入（PyInstaller 无法自动检测的模块）
    "--hidden-import=backend.api",
    "--hidden-import=backend.api.tasks",
    "--hidden-import=backend.api.records",
    "--hidden-import=backend.core",
    "--hidden-import=backend.core.config",
    "--hidden-import=backend.core.scheduler",
    "--hidden-import=backend.core.notifier",
    "--hidden-import=backend.models",
    "--hidden-import=backend.models.task",
    "--hidden-import=backend.storage",
    "--hidden-import=backend.storage.db",
    "--hidden-import=backend.storage.repository",
    # 第三方库隐藏导入
    "--hidden-import=sqlalchemy",
    "--hidden-import=apscheduler",
    "--hidden-import=apscheduler.triggers.interval",
    "--hidden-import=apscheduler.schedulers.background",
    "--hidden-import=yaml",
    "--hidden-import=uvicorn",
    "--hidden-import=uvicorn.loggers",
    "--hidden-import=uvicorn.loops",
    "--hidden-import=uvicorn.loops.auto",
    "--hidden-import=uvicorn.protocols",
    "--hidden-import=uvicorn.protocols.http",
    "--hidden-import=uvicorn.protocols.http.auto",
    "--clean",
    "--noconfirm",
]

print("=" * 60)
print("构建 DailyRecord 后端...")
print("=" * 60)
print(f"入口: backend/main.py")
print(f"输出: {OUTPUT_DIR}/dailyrecord-backend")
print()

PyInstaller.__main__.run(args)

print()
print("=" * 60)
print("构建完成！")
print(f"输出文件: {OUTPUT_DIR}/dailyrecord-backend")
print("=" * 60)
