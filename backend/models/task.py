"""数据模型定义"""

import uuid
from datetime import datetime

from sqlalchemy import Column, String, Integer, DateTime, Boolean, Text, create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

Base = declarative_base()


def generate_uuid() -> str:
    return str(uuid.uuid4())


class Task(Base):
    """工作事项"""
    __tablename__ = "tasks"

    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String(200), nullable=False, index=True)
    category = Column(String(50), default="其他")
    priority = Column(Integer, default=1)  # 1=低, 2=中, 3=高
    status = Column(String(20), default="todo")  # todo / in_progress / done / cancelled
    progress = Column(Integer, default=0)  # 0-100
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)
    is_active = Column(Boolean, default=True)


class Record(Base):
    """工作记录（每次弹窗填写的记录）"""
    __tablename__ = "records"

    id = Column(String, primary_key=True, default=generate_uuid)
    task_id = Column(String, nullable=True, index=True)
    task_name = Column(String(200), nullable=True)
    category = Column(String(50), default="其他")
    progress = Column(Integer, default=0)
    note = Column(Text, default="")
    status = Column(String(20), default="filled")  # filled / skipped
    priority = Column(Integer, default=1)
    created_at = Column(DateTime, default=datetime.now)
