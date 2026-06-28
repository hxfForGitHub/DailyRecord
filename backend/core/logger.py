"""日志管理"""

import os
import sys
import logging
from datetime import datetime
from logging.handlers import RotatingFileHandler


def get_log_dir() -> str:
    """获取日志目录"""
    # 生产模式
    resources = os.environ.get("DAILYRECORD_RESOURCES_PATH")
    if resources:
        log_dir = os.path.join(os.path.expanduser("~"), "Library", "Application Support", "DailyRecord", "logs")
    else:
        log_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "logs")
    os.makedirs(log_dir, exist_ok=True)
    return log_dir


def setup_logging(name: str = "dailyrecord") -> logging.Logger:
    """配置日志系统"""
    log_dir = get_log_dir()
    log_file = os.path.join(log_dir, f"{name}.log")

    logger = logging.getLogger(name)
    logger.setLevel(logging.INFO)

    # 避免重复添加 handler
    if logger.handlers:
        return logger

    # 文件处理器（轮转，最大 5MB，保留 3 份）
    fh = RotatingFileHandler(log_file, maxBytes=5 * 1024 * 1024, backupCount=3, encoding="utf-8")
    fh.setLevel(logging.INFO)
    fh.setFormatter(logging.Formatter(
        "%(asctime)s [%(levelname)s] %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    ))
    logger.addHandler(fh)

    # 控制台处理器
    ch = logging.StreamHandler(sys.stdout)
    ch.setLevel(logging.INFO)
    ch.setFormatter(logging.Formatter("[%(levelname)s] %(message)s"))
    logger.addHandler(ch)

    return logger


logger = setup_logging()
