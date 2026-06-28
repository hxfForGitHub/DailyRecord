"""定时调度器"""

from typing import Callable, Optional

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger

from backend.core.config import settings
from backend.core.logger import logger


class ReminderScheduler:
    """提醒定时调度器"""

    def __init__(self):
        self._scheduler: Optional[BackgroundScheduler] = None
        self._callback: Optional[Callable] = None
        self._job = None

    def set_callback(self, callback: Callable):
        self._callback = callback

    def start(self):
        """启动调度器"""
        if self._scheduler is None or not self._scheduler.running:
            self._scheduler = BackgroundScheduler()
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
            logger.info(f"提醒已启动，间隔: {interval} 分钟")
        else:
            logger.info("提醒未启用")

    def stop(self):
        """停止调度器"""
        if self._job:
            try:
                self._job.remove()
            except Exception:
                pass
            self._job = None
        if self._scheduler and self._scheduler.running:
            try:
                self._scheduler.shutdown(wait=False)
            except Exception:
                pass
            self._scheduler = None
            print("[Scheduler] 调度器已停止")

    def restart(self):
        """重启调度器（配置变更后调用）"""
        print("[Scheduler] 重启调度器...")
        self.stop()
        self.start()

    def trigger_now(self) -> bool:
        if self._callback:
            self._callback()
            return True
        return False

    @property
    def is_running(self) -> bool:
        return self._scheduler is not None and self._scheduler.running and self._job is not None
