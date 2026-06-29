"""共享状态（避免循环导入）"""

_reminder_pending = False


def is_pending() -> bool:
    return _reminder_pending


def set_pending(v: bool):
    global _reminder_pending
    _reminder_pending = v
