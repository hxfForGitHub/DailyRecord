"""工作记录 API"""

from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter
from pydantic import BaseModel, Field

from backend.storage.repository import RecordRepository, TaskRepository
from backend.core.state import set_pending

router = APIRouter(prefix="/api/records", tags=["records"])


class RecordCreate(BaseModel):
    task_id: Optional[str] = None
    task_name: Optional[str] = None
    category: str = "其他"
    progress: int = Field(default=0, ge=0, le=100)
    note: str = ""
    status: str = "filled"
    priority: int = Field(default=1, ge=1, le=3)


class RecordSkip(BaseModel):
    """跳过记录"""
    pass


def _format_record(r) -> dict:
    return {
        "id": r.id,
        "task_id": r.task_id,
        "task_name": r.task_name,
        "category": r.category,
        "progress": r.progress,
        "note": r.note,
        "status": r.status,
        "priority": r.priority,
        "created_at": r.created_at.isoformat() if r.created_at else "",
    }


@router.get("")
def list_records(limit: int = 100):
    """获取所有记录"""
    records = RecordRepository.get_all(limit=limit)
    return {"records": [_format_record(r) for r in records]}


@router.post("")
def create_record(data: RecordCreate):
    """创建记录"""
    # 如果有 task_name，自动查找或创建 task
    task_id = data.task_id
    if data.task_name and not task_id:
        existing = TaskRepository.get_all()
        for t in existing:
            if t.name == data.task_name:
                task_id = t.id
                break
        if not task_id:
            task = TaskRepository.create(
                name=data.task_name, category=data.category, priority=data.priority
            )
            task_id = task.id

    # 同步更新对应 task 的进度
    if task_id:
        current_task = TaskRepository.get_by_id(task_id)
        if current_task:
            update_data = {"progress": data.progress}
            if data.progress == 100:
                update_data["status"] = "done"
            elif current_task.status == "todo":
                update_data["status"] = "in_progress"
            TaskRepository.update(task_id, **update_data)

    # 清除 pending（用户已响应）
    set_pending(False)

    record = RecordRepository.create(
        task_id=task_id,
        task_name=data.task_name,
        category=data.category,
        progress=data.progress,
        note=data.note,
        status=data.status,
        priority=data.priority,
    )
    return {"record": _format_record(record)}


@router.post("/skip")
def skip_record():
    """跳过本次记录"""
    record = RecordRepository.create(
        task_name="", status="skipped", note="本次跳过"
    )
    return {"record": _format_record(record)}


@router.get("/today")
def today_records():
    """获取今日记录"""
    today = datetime.now().strftime("%Y-%m-%d")
    records = RecordRepository.get_by_date(today)
    return {"records": [_format_record(r) for r in records]}


@router.get("/timeline")
def timeline():
    """获取时间线（今日记录按时间排序）"""
    today = datetime.now().strftime("%Y-%m-%d")
    records = RecordRepository.get_by_date(today)
    return {"timeline": [_format_record(r) for r in records]}
