"""事项管理 API"""

from typing import List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from backend.storage.repository import TaskRepository

router = APIRouter(prefix="/api/tasks", tags=["tasks"])


class TaskCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    category: str = "其他"
    priority: int = Field(default=1, ge=1, le=3)


class TaskUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    priority: Optional[int] = Field(default=None, ge=1, le=3)
    status: Optional[str] = None
    progress: Optional[int] = Field(default=None, ge=0, le=100)


class TaskResponse(BaseModel):
    id: str
    name: str
    category: str
    priority: int
    status: str
    progress: int
    created_at: str
    updated_at: str

    class Config:
        from_attributes = True


def _format_task(t) -> dict:
    return {
        "id": t.id,
        "name": t.name,
        "category": t.category,
        "priority": t.priority,
        "status": t.status,
        "progress": t.progress,
        "created_at": t.created_at.isoformat() if t.created_at else "",
        "updated_at": t.updated_at.isoformat() if t.updated_at else "",
    }


@router.get("")
def list_tasks():
    """获取所有事项"""
    tasks = TaskRepository.get_all()
    return {"tasks": [_format_task(t) for t in tasks]}


@router.post("")
def create_task(data: TaskCreate):
    """创建事项"""
    task = TaskRepository.create(name=data.name, category=data.category, priority=data.priority)
    return {"task": _format_task(task)}


@router.get("/names")
def list_task_names():
    """获取所有事项名称（去重）"""
    names = TaskRepository.get_all_names()
    return {"names": names}


@router.get("/{task_id}")
def get_task(task_id: str):
    """获取事项详情"""
    task = TaskRepository.get_by_id(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="事项不存在")
    return {"task": _format_task(task)}


@router.put("/{task_id}")
def update_task(task_id: str, data: TaskUpdate):
    """更新事项"""
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    task = TaskRepository.update(task_id, **update_data)
    if not task:
        raise HTTPException(status_code=404, detail="事项不存在")
    return {"task": _format_task(task)}


@router.delete("/{task_id}")
def delete_task(task_id: str):
    """删除事项"""
    success = TaskRepository.delete(task_id)
    if not success:
        raise HTTPException(status_code=404, detail="事项不存在")
    return {"message": "已删除"}
