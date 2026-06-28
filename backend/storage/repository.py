"""数据操作层"""

from datetime import datetime
from typing import List, Optional

from sqlalchemy import desc

from backend.models.task import Task, Record
from backend.storage.db import get_session


class TaskRepository:
    """事项数据操作"""

    @staticmethod
    def create(name: str, category: str = "其他", priority: int = 1) -> Task:
        with get_session() as db:
            task = Task(name=name, category=category, priority=priority)
            db.add(task)
            db.commit()
            db.refresh(task)
            return task

    @staticmethod
    def get_all() -> List[Task]:
        with get_session() as db:
            return db.query(Task).filter(Task.is_active == True).order_by(desc(Task.updated_at)).all()

    @staticmethod
    def get_by_id(task_id: str) -> Optional[Task]:
        with get_session() as db:
            return db.query(Task).filter(Task.id == task_id, Task.is_active == True).first()

    @staticmethod
    def update(task_id: str, **kwargs) -> Optional[Task]:
        with get_session() as db:
            task = db.query(Task).filter(Task.id == task_id, Task.is_active == True).first()
            if not task:
                return None
            for key, value in kwargs.items():
                if hasattr(task, key):
                    setattr(task, key, value)
            task.updated_at = datetime.now()
            db.commit()
            db.refresh(task)
            return task

    @staticmethod
    def delete(task_id: str) -> bool:
        with get_session() as db:
            task = db.query(Task).filter(Task.id == task_id, Task.is_active == True).first()
            if not task:
                return False
            task.is_active = False
            task.updated_at = datetime.now()
            db.commit()
            return True

    @staticmethod
    def get_all_names() -> List[str]:
        """获取所有事项名称（用于下拉列表）"""
        with get_session() as db:
            results = db.query(Task.name).filter(Task.is_active == True).distinct().all()
            return [r[0] for r in results]


class RecordRepository:
    """记录数据操作"""

    @staticmethod
    def create(
        task_id: Optional[str] = None,
        task_name: Optional[str] = None,
        category: str = "其他",
        progress: int = 0,
        note: str = "",
        status: str = "filled",
        priority: int = 1,
    ) -> Record:
        with get_session() as db:
            record = Record(
                task_id=task_id,
                task_name=task_name,
                category=category,
                progress=progress,
                note=note,
                status=status,
                priority=priority,
            )
            db.add(record)
            db.commit()
            db.refresh(record)
            return record

    @staticmethod
    def get_all(limit: int = 100) -> List[Record]:
        with get_session() as db:
            return db.query(Record).order_by(desc(Record.created_at)).limit(limit).all()

    @staticmethod
    def get_by_date(date_str: str) -> List[Record]:
        """按日期查询记录（格式：2024-01-01）"""
        with get_session() as db:
            return (
                db.query(Record)
                .filter(Record.created_at >= date_str, Record.created_at < date_str + " 23:59:59")
                .order_by(Record.created_at)
                .all()
            )

    @staticmethod
    def get_by_task_id(task_id: str) -> List[Record]:
        with get_session() as db:
            return db.query(Record).filter(Record.task_id == task_id).order_by(Record.created_at).all()

    @staticmethod
    def get_latest() -> Optional[Record]:
        with get_session() as db:
            return db.query(Record).order_by(desc(Record.created_at)).first()
