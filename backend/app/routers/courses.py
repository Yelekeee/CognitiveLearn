from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from ..database import get_db
from ..models import User, Course, Module, Content, LMSActivity
from ..models.activity import ActivityAction
from ..schemas.course import CourseResponse, ModuleResponse, ContentResponse, ActivityLog
from ..utils.auth import get_current_user

router = APIRouter(prefix="/api", tags=["courses"])

@router.get("/courses", response_model=List[CourseResponse])
def get_courses(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(Course).all()

@router.get("/courses/{course_id}/modules")
def get_modules(course_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    modules = db.query(Module).filter(Module.course_id == course_id).order_by(Module.order_num).all()
    
    # Get progress for each module
    result = []
    for module in modules:
        activities = db.query(LMSActivity).filter(
            LMSActivity.student_id == current_user.id,
            LMSActivity.module_id == module.id
        ).all()
        
        completed_contents = len([a for a in activities if a.action == ActivityAction.complete])
        total_contents = len(module.contents)
        progress = (completed_contents / total_contents * 100) if total_contents > 0 else 0
        
        result.append({
            "id": module.id,
            "course_id": module.course_id,
            "title_kz": module.title_kz,
            "title_ru": module.title_ru,
            "order_num": module.order_num,
            "difficulty": module.difficulty,
            "progress": round(progress, 1),
            "completed_contents": completed_contents,
            "total_contents": total_contents,
        })
    
    return {"course": {"id": course.id, "title_kz": course.title_kz, "title_ru": course.title_ru}, "modules": result}

@router.get("/content/{module_id}")
def get_content(module_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    module = db.query(Module).filter(Module.id == module_id).first()
    if not module:
        raise HTTPException(status_code=404, detail="Module not found")
    
    # Get student's learning style to sort content
    from ..models import CognitiveProfile
    profile = db.query(CognitiveProfile).filter(
        CognitiveProfile.student_id == current_user.id
    ).first()
    
    contents = db.query(Content).filter(Content.module_id == module_id).order_by(Content.order_num).all()
    
    # Adapt content order based on learning style
    if profile and profile.learning_style:
        style = profile.learning_style.value if hasattr(profile.learning_style, 'value') else profile.learning_style
        priority_map = {
            "visual": ["diagram", "video", "text", "exercise", "example"],
            "kinesthetic": ["exercise", "example", "diagram", "text", "video"],
            "reading": ["text", "example", "diagram", "exercise", "video"],
            "auditory": ["video", "text", "example", "exercise", "diagram"],
        }
        priority = priority_map.get(style, ["text", "diagram", "video", "exercise", "example"])
        contents = sorted(contents, key=lambda c: priority.index(c.type.value if hasattr(c.type, 'value') else c.type) if (c.type.value if hasattr(c.type, 'value') else c.type) in priority else 99)
    
    return {
        "module": {"id": module.id, "title_kz": module.title_kz, "title_ru": module.title_ru, "difficulty": module.difficulty},
        "contents": [{"id": c.id, "title": c.title, "type": c.type, "body": c.body, "difficulty": c.difficulty, "learning_style_target": c.learning_style_target, "order_num": c.order_num} for c in contents],
        "adapted_for": profile.learning_style if profile else None
    }

@router.post("/activity")
def log_activity(
    activity: ActivityLog,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    log = LMSActivity(
        student_id=current_user.id,
        course_id=activity.course_id,
        module_id=activity.module_id,
        content_id=activity.content_id,
        action=activity.action,
        duration_seconds=activity.duration_seconds
    )
    db.add(log)
    db.commit()
    return {"status": "logged"}
