"""数据库初始化与管理"""

import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from backend.models.task import Base
from backend.core.logger import logger

_engine = None
_SessionLocal = None


def get_data_dir() -> str:
    """获取数据存储目录"""
    from backend.core.config import settings
    data_path = settings.storage_path
    if not os.path.isabs(data_path):
        data_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "..", data_path)
    os.makedirs(data_path, exist_ok=True)
    return data_path


def init_db():
    """初始化数据库"""
    global _engine, _SessionLocal
    data_dir = get_data_dir()
    db_path = os.path.join(data_dir, "dailyrecord.db")
    logger.info(f"数据库路径: {db_path}")
    _engine = create_engine(f"sqlite:///{db_path}", connect_args={"check_same_thread": False})
    Base.metadata.create_all(_engine)
    _SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=_engine)


def get_session():
    """获取数据库会话"""
    if _SessionLocal is None:
        init_db()
    return _SessionLocal()


def close_db():
    """关闭数据库连接"""
    global _engine, _SessionLocal
    if _engine:
        _engine.dispose()
        _engine = None
        _SessionLocal = None
