"""DailyRecord 后端入口

启动 FastAPI 服务，初始化数据库和定时调度器。
"""

import json
import asyncio
from datetime import datetime
from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from backend.storage.db import init_db, close_db
from backend.core.scheduler import ReminderScheduler
from backend.core.config import settings


# 全局实例
scheduler = ReminderScheduler()
connected_websockets = set()
_event_loop: asyncio.AbstractEventLoop | None = None


def broadcast_message(message: dict):
    """向所有连接的 WebSocket 客户端广播消息（线程安全）"""
    loop = _event_loop
    if loop is None or not loop.is_running():
        return
    disconnected = set()
    message_str = json.dumps(message, ensure_ascii=False)
    for ws in connected_websockets:
        try:
            asyncio.run_coroutine_threadsafe(ws.send_text(message_str), loop)
        except Exception:
            disconnected.add(ws)
    connected_websockets.difference_update(disconnected)


def on_reminder_trigger():
    """提醒触发回调"""
    now = datetime.now().strftime("%H:%M:%S")
    print(f"[Reminder] {now} 提醒触发")
    broadcast_message({
        "type": "reminder",
        "message": "时间到啦，记录一下当前在做什么？",
        "timestamp": now,
    })


@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用生命周期管理"""
    global _event_loop
    _event_loop = asyncio.get_event_loop()

    print("[App] 正在初始化...")
    init_db()
    print("[App] 数据库已初始化")

    scheduler.set_callback(on_reminder_trigger)
    scheduler.start()

    print(f"[App] DailyRecord 后端已启动 | 端口: 8765 | 提醒间隔: {settings.reminder_interval} 分钟")
    yield
    scheduler.stop()
    close_db()
    print("[App] 已关闭")


app = FastAPI(title="DailyRecord", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


from backend.api.tasks import router as tasks_router
from backend.api.records import router as records_router

app.include_router(tasks_router)
app.include_router(records_router)


# ─── health / config ───

@app.get("/api/health")
def health_check():
    return {
        "status": "ok",
        "time": datetime.now().isoformat(),
        "reminder_enabled": settings.reminder_enabled,
        "reminder_interval": settings.reminder_interval,
    }


@app.get("/api/config")
def get_config():
    """获取配置"""
    return settings.to_dict()


class ConfigUpdate(BaseModel):
    reminder_interval: int | None = None
    reminder_enabled: bool | None = None
    notification_sound: bool | None = None


@app.put("/api/config")
def update_config(data: ConfigUpdate):
    """更新配置"""
    changed = False
    if data.reminder_interval is not None and data.reminder_interval != settings.reminder_interval:
        settings._data["reminder"]["interval_minutes"] = data.reminder_interval
        changed = True
    if data.reminder_enabled is not None and data.reminder_enabled != settings.reminder_enabled:
        settings._data["reminder"]["enabled"] = data.reminder_enabled
        changed = True
    if data.notification_sound is not None:
        settings._data["notification"]["sound"] = data.notification_sound
        changed = True

    settings.save()

    if changed:
        scheduler.restart()

    return {"message": "配置已更新", "config": settings.to_dict()}


@app.post("/api/config/reminder/trigger")
def trigger_reminder():
    """手动触发提醒"""
    on_reminder_trigger()
    return {"message": "已触发提醒"}


# ─── WebSocket ───

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket 连接（用于向 Electron 推送提醒）"""
    await websocket.accept()
    connected_websockets.add(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            msg = json.loads(data)
            action = msg.get("action", "")
            if action == "skip":
                from backend.storage.repository import RecordRepository
                RecordRepository.create(task_name="", status="skipped", note="本次跳过")
                print(f"[WebSocket] 用户选择跳过本次记录")
            elif action == "ping":
                await websocket.send_text(json.dumps({"type": "pong"}))
    except WebSocketDisconnect:
        pass
    except Exception:
        pass
    finally:
        connected_websockets.discard(websocket)


def run_server(host: str = "127.0.0.1", port: int = 8765):
    """启动服务器"""
    import uvicorn
    print(f"[App] 启动服务在 {host}:{port}")
    uvicorn.run(app, host=host, port=port, log_level="info")


if __name__ == "__main__":
    run_server()
