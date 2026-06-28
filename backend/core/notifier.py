"""通知推送模块

负责将提醒信号发送给 Electron 前端。
后端不直接弹出系统通知，而是通过 WebSocket 或 SSE 通知 Electron 主进程，
由 Electron 调用 macOS 原生通知。
"""

import json
from typing import Optional


class Notifier:
    """通知管理器"""

    def __init__(self):
        self._callback = None

    def set_reminder_callback(self, callback):
        """设置提醒回调（供 scheduler 使用）"""
        self._callback = callback

    def send_reminder(self):
        """发送提醒信号"""
        if self._callback:
            self._callback({"type": "reminder", "message": "时间到啦，记录一下当前在做什么？", "timestamp": None})
        else:
            print("[Notifier] 提醒：请记录当前工作（无回调绑定）")

    def send_notification(self, title: str, body: str, action: str = "fill"):
        """发送通知（action: fill / skip）"""
        if self._callback:
            self._callback({"type": "notification", "title": title, "body": body, "action": action})
