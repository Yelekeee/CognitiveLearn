from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime
from ..database import get_db
from ..models import User, Assignment, Submission, Module
from ..utils.auth import get_current_user
from pydantic import BaseModel
from typing import Optional

router = APIRouter(prefix="/api", tags=["assignments"])

class SubmissionCreate(BaseModel):
    score: float
    content: Optional[str] = None

@router.get("/assignments/{module_id}")
def get_assignments(module_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    module = db.query(Module).filter(Module.id == module_id).first()
    if not module:
        raise HTTPException(status_code=404, detail="Module not found")
    
    assignments = db.query(Assignment).filter(Assignment.module_id == module_id).all()
    result = []
    for a in assignments:
        submission = db.query(Submission).filter(
            Submission.assignment_id == a.id,
            Submission.student_id == current_user.id
        ).first()
        result.append({
            "id": a.id,
            "title": a.title,
            "description": a.description,
            "due_date": a.due_date,
            "max_score": a.max_score,
            "submitted": submission is not None,
            "score": submission.score if submission else None,
            "is_late": submission.is_late if submission else None,
        })
    return result

@router.post("/assignments/{assignment_id}/submit")
def submit_assignment(
    assignment_id: int,
    data: SubmissionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    assignment = db.query(Assignment).filter(Assignment.id == assignment_id).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
    
    now = datetime.utcnow()
    is_late = assignment.due_date and now > assignment.due_date
    
    submission = Submission(
        student_id=current_user.id,
        assignment_id=assignment_id,
        score=data.score,
        submitted_at=now,
        is_late=is_late
    )
    db.add(submission)
    db.commit()
    return {"status": "submitted", "is_late": is_late}
