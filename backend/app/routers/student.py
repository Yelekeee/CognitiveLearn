from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from ..database import get_db
from ..models import User, QuizAttempt, LMSActivity, WeeklySurvey, CognitiveProfile, Course, Module
from ..models.cognitive import AdaptedPath
from ..utils.auth import get_current_user
from ..ml.clustering import get_student_cluster
from ..ml.risk_prediction import predict_risk

router = APIRouter(prefix="/api/student", tags=["student"])

@router.get("/dashboard")
def get_dashboard(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    student_id = current_user.id
    
    # Quiz scores last 8 weeks
    eight_weeks_ago = datetime.utcnow() - timedelta(weeks=8)
    attempts = db.query(QuizAttempt).filter(
        QuizAttempt.student_id == student_id,
        QuizAttempt.created_at >= eight_weeks_ago
    ).order_by(QuizAttempt.created_at).all()
    
    scores = [a.score for a in attempts]
    avg_score = sum(scores) / len(scores) if scores else 0
    
    # Cognitive profile
    profile = db.query(CognitiveProfile).filter(
        CognitiveProfile.student_id == student_id
    ).first()
    
    # Latest survey
    survey = db.query(WeeklySurvey).filter(
        WeeklySurvey.student_id == student_id
    ).order_by(WeeklySurvey.submitted_at.desc()).first()
    
    # Check if survey submitted this week
    week_ago = datetime.utcnow() - timedelta(weeks=1)
    survey_this_week = survey and survey.submitted_at >= week_ago
    
    # Course progress
    courses = db.query(Course).all()
    course_progress = []
    
    for course in courses:
        modules = db.query(Module).filter(Module.course_id == course.id).all()
        module_ids = [m.id for m in modules]
        
        activities = db.query(LMSActivity).filter(
            LMSActivity.student_id == student_id,
            LMSActivity.module_id.in_(module_ids)
        ).all()
        
        total_content = sum(len(m.contents) for m in modules)
        completed = sum(1 for a in activities if str(a.action) in ["complete", "ActivityAction.complete"])
        progress = (completed / max(1, total_content) * 100)
        
        course_progress.append({
            "id": course.id,
            "title_ru": course.title_ru,
            "title_kz": course.title_kz,
            "progress": round(progress, 1),
            "modules_count": len(modules),
        })
    
    # Risk assessment
    attempts_3 = db.query(QuizAttempt).filter(
        QuizAttempt.student_id == student_id
    ).order_by(QuizAttempt.created_at.desc()).limit(3).all()
    
    scores_3 = [a.score for a in attempts_3]
    while len(scores_3) < 3:
        scores_3.append(65.0)
    
    activities_recent = db.query(LMSActivity).filter(
        LMSActivity.student_id == student_id
    ).order_by(LMSActivity.created_at.desc()).first()
    
    days_since = 0
    if activities_recent:
        days_since = (datetime.utcnow() - activities_recent.created_at).days
    
    risk_features = {
        "score1": scores_3[0],
        "score2": scores_3[1],
        "score3": scores_3[2],
        "completion_rate": 0.7,
        "motivation": survey.motivation if survey else 3.0,
        "cognitive_load": str(profile.cognitive_load.value if profile and profile.cognitive_load and hasattr(profile.cognitive_load, 'value') else "medium"),
        "days_since_login": days_since,
    }
    risk = predict_risk(risk_features)
    
    # Score trend for chart
    score_trend = []
    for i, attempt in enumerate(attempts[-8:]):
        score_trend.append({
            "week": f"Нед {i+1}",
            "score": round(attempt.score, 1),
            "load": round(attempt.cognitive_load_score or 50, 1)
        })
    
    return {
        "student": {"name": current_user.name, "email": current_user.email},
        "avg_score": round(avg_score, 1),
        "risk": risk,
        "profile": {
            "learning_style": str(profile.learning_style.value if profile and profile.learning_style and hasattr(profile.learning_style, 'value') else None),
            "cognitive_load": str(profile.cognitive_load.value if profile and profile.cognitive_load and hasattr(profile.cognitive_load, 'value') else None),
            "cluster_label": profile.cluster_label if profile else None,
            "cluster_description": profile.cluster_description if profile else None,
            "processing_speed": profile.processing_speed if profile else 50,
            "memory_score": profile.memory_score if profile else 50,
            "bloom_level": profile.bloom_level if profile else 2,
        } if profile else None,
        "survey_needed": not survey_this_week,
        "course_progress": course_progress,
        "score_trend": score_trend,
        "total_attempts": len(attempts),
    }

@router.get("/learning-path")
def get_learning_path(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    student_id = current_user.id
    
    courses = db.query(Course).all()
    path = []
    
    for course in courses:
        modules = db.query(Module).filter(Module.course_id == course.id).order_by(Module.order_num).all()
        
        course_modules = []
        for module in modules:
            # Check completion
            activities = db.query(LMSActivity).filter(
                LMSActivity.student_id == student_id,
                LMSActivity.module_id == module.id
            ).all()
            
            completed_count = sum(1 for a in activities if str(a.action) in ["complete", "ActivityAction.complete"])
            total_content = len(module.contents)
            progress = (completed_count / max(1, total_content)) * 100
            is_completed = progress >= 80
            
            # Check adapted path
            adapted = db.query(AdaptedPath).filter(
                AdaptedPath.student_id == student_id,
                AdaptedPath.module_id == module.id
            ).first()
            
            quiz_attempts = db.query(QuizAttempt).filter(
                QuizAttempt.student_id == student_id,
                QuizAttempt.quiz.has(module_id=module.id)
            ).all()
            
            best_score = max((a.score for a in quiz_attempts), default=None)
            
            course_modules.append({
                "id": module.id,
                "title_ru": module.title_ru,
                "title_kz": module.title_kz,
                "order_num": module.order_num,
                "difficulty": adapted.recommended_difficulty if adapted else module.difficulty,
                "original_difficulty": module.difficulty,
                "progress": round(progress, 1),
                "is_completed": is_completed,
                "best_score": round(best_score, 1) if best_score else None,
                "skip_topics": adapted.skip_topics if adapted else [],
                "add_topics": adapted.add_topics if adapted else [],
                "risk_level": adapted.risk_level if adapted else "low",
                "status": "completed" if is_completed else ("current" if progress > 0 else "upcoming"),
            })
        
        path.append({
            "course_id": course.id,
            "course_title_ru": course.title_ru,
            "course_title_kz": course.title_kz,
            "modules": course_modules,
        })
    
    return {"learning_path": path}

@router.get("/analytics")
def get_analytics(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    student_id = current_user.id
    
    # Score trend (last 8 weeks)
    eight_weeks = datetime.utcnow() - timedelta(weeks=8)
    attempts = db.query(QuizAttempt).filter(
        QuizAttempt.student_id == student_id,
        QuizAttempt.created_at >= eight_weeks
    ).order_by(QuizAttempt.created_at).all()
    
    score_trend = []
    load_trend = []
    for i, a in enumerate(attempts):
        week_label = f"Нед {i+1}"
        score_trend.append({"week": week_label, "score": round(a.score, 1)})
        load_trend.append({"week": week_label, "load": round(a.cognitive_load_score or 40, 1)})
    
    # Survey history
    surveys = db.query(WeeklySurvey).filter(
        WeeklySurvey.student_id == student_id
    ).order_by(WeeklySurvey.submitted_at).limit(8).all()
    
    survey_history = [
        {
            "week": f"Нед {i+1}",
            "motivation": s.motivation,
            "stress": s.stress,
            "engagement": s.engagement,
        }
        for i, s in enumerate(surveys)
    ]
    
    # Content format effectiveness
    activities = db.query(LMSActivity).filter(
        LMSActivity.student_id == student_id,
        LMSActivity.content_id.isnot(None)
    ).all()
    
    # Class average (anonymous)
    all_attempts = db.query(QuizAttempt).all()
    class_avg = sum(a.score for a in all_attempts) / max(1, len(all_attempts))
    
    student_avg = sum(a.score for a in attempts) / max(1, len(attempts))
    
    return {
        "score_trend": score_trend,
        "load_trend": load_trend,
        "survey_history": survey_history,
        "student_avg": round(student_avg, 1),
        "class_avg": round(class_avg, 1),
        "total_sessions": len(activities),
        "total_quizzes": len(attempts),
    }
