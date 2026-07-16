from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core import auth
from app.core.database import get_db
from app.models.models import Task, User, AuditLog
from app.models.schemas import TaskCreate, TaskResponse, TaskUpdate

router = APIRouter(prefix="/tasks", tags=["tasks"])

@router.post("/", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
def create_task(
    task_in: TaskCreate,
    current_user: User = Depends(auth.RoleChecker(allowed_roles=["security", "organizer"])),
    db: Session = Depends(get_db)
):
    """
    Create a new volunteer task.
    Restricted to Organizer and Security.
    """
    # Verify target volunteer exists
    volunteer = db.query(User).filter(User.id == task_in.volunteer_id).first()
    if not volunteer or volunteer.role != "volunteer":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Assigned user must be a volunteer."
        )
        
    new_task = Task(
        volunteer_id=task_in.volunteer_id,
        title=task_in.title,
        description=task_in.description,
        status="pending"
    )
    db.add(new_task)
    db.commit()
    db.refresh(new_task)
    
    # Audit log
    audit = AuditLog(
        performed_by=current_user.email,
        action="task_created",
        details=f"Task ID {new_task.id} ('{new_task.title}') assigned to volunteer {volunteer.email}."
    )
    db.add(audit)
    db.commit()
    
    return new_task

@router.get("/", response_model=List[TaskResponse])
def list_tasks(
    current_user: User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """
    Retrieve tasks list.
    Volunteers only see their assigned tasks. Organizers and Security see all tasks.
    """
    if current_user.role == "volunteer":
        return db.query(Task).filter(Task.volunteer_id == current_user.id).order_by(Task.created_at.desc()).all()
    elif current_user.role in ["security", "organizer"]:
        return db.query(Task).order_by(Task.created_at.desc()).all()
    else:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied."
        )

@router.put("/{task_id}", response_model=TaskResponse)
def update_task(
    task_id: int,
    task_update: TaskUpdate,
    current_user: User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update a task status.
    Volunteers can only update tasks assigned to them.
    """
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found."
        )
        
    # Enforce ownership/authorization check
    if current_user.role == "volunteer" and task.volunteer_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to update this task."
        )
    elif current_user.role not in ["volunteer", "security", "organizer"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied."
        )
        
    old_status = task.status
    task.status = task_update.status
    db.add(task)
    db.commit()
    db.refresh(task)
    
    # Audit log
    audit = AuditLog(
        performed_by=current_user.email,
        action="task_status_updated",
        details=f"Task ID {task.id} status changed from '{old_status}' to '{task.status}'."
    )
    db.add(audit)
    db.commit()
    
    return task
