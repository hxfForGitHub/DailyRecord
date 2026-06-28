"""定时调度器"""

from datetime import datetime
from typing import Callable, Optional

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger

from backend.core.config import settings


class ReminderScheduler:
    """提醒定时调度器"""

    def __init__(self):
        self._scheduler = BackgroundScheduler()
        self._callback: Optional[Callable] = None
        self._job = None

    def set_callback(self, callback: Callable):
        """设置提醒触发回调"""
        self._callback = callback

    def start(self):
        """启动调度器"""
        if not self._scheduler.running:
            self._scheduler.start()

        interval = settings.reminder_interval
        enabled = settings.reminder_enabled

        if enabled and self._callback:
            self._job = self._scheduler.add_job(
                self._callback,
                IntervalTrigger(minutes=interval),
                id="reminder",
                replace_existing=True,
                misfire_grace_time=120,
            )
            print(f"[Scheduler] 提醒已启动，间隔: {interval} 分钟")

    def stop(self):
        """停止调度器"""
        if self._job:
            self._job.remove()
            self._job = None
        if self._scheduler.running:
            self._scheduler.shutdown(wait=False)
            print("[Scheduler] 调度器已停止")

    def restart(self):
        """重启调度器（配置变更后调用）"""
        self.stop()
        self.start()

    def trigger_now(self):
        """手动触发一次提醒"""
        if self._callback:
            self._callback()
            return True
        return False

    @property
    def is_running(self) -> bool:
        return self._scheduler.running and self._job is not None
