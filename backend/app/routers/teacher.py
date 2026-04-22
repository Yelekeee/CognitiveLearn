from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from ..database import get_db
from ..models import User, QuizAttempt, LMSActivity, WeeklySurvey, CognitiveProfile, Course, Module
from ..models.user import UserRole
from ..utils.auth import get_current_user

router = APIRouter(prefix="/api/teacher", tags=["teacher"])


@router.get("/class-overview")
def get_class_overview(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    students = db.query(User).filter(User.role == UserRole.student).all()
    result = []

    for student in students:
        profile = db.query(CognitiveProfile).filter(
            CognitiveProfile.student_id == student.id
        ).first()

        attempts = db.query(QuizAttempt).filter(
            QuizAttempt.student_id == student.id
        ).order_by(QuizAttempt.created_at.desc()).limit(5).all()

        avg_score = sum(a.score for a in attempts) / max(1, len(attempts))
        avg_load = sum(a.cognitive_load_score or 50 for a in attempts) / max(1, len(attempts))

        last_activity = (
            db.query(LMSActivity)
            .filter(LMSActivity.student_id == student.id)
            .order_by(LMSActivity.created_at.desc())
            .first()
        )
        last_active = last_activity.created_at if last_activity else None

        risk_level = "low"
        if avg_score < 50:
            risk_level = "high"
        elif avg_score < 65:
            risk_level = "medium"

        result.append({
            "id": student.id,
            "name": student.name,
            "email": student.email,
            "cluster": profile.cluster_label if profile else "Не определен",
            "risk_level": risk_level,
            "avg_score": round(avg_score, 1),
            "avg_load": round(avg_load, 1),
            "last_active": last_active,
            "learning_style": str(
                profile.learning_style.value
                if profile and profile.learning_style and hasattr(profile.learning_style, "value")
                else "—"
            ),
        })

    return {"students": result, "total": len(result)}


@router.get("/analytics/{course_id}")
def get_course_analytics(
    course_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from ..models import Quiz

    course = db.query(Course).filter(Course.id == course_id).first()

    # Cluster distribution
    profiles = db.query(CognitiveProfile).all()
    cluster_counts: dict = {}
    for p in profiles:
        label = p.cluster_label or "Не определен"
        short = label.split(" — ")[0] if " — " in label else label[:20]
        cluster_counts[short] = cluster_counts.get(short, 0) + 1
    cluster_data = [{"name": k, "value": v} for k, v in cluster_counts.items()]

    # At-risk count over last 8 weeks
    risk_over_time = []
    for week in range(8, 0, -1):
        week_start = datetime.utcnow() - timedelta(weeks=week)
        week_end = datetime.utcnow() - timedelta(weeks=week - 1)
        attempts = db.query(QuizAttempt).filter(
            QuizAttempt.created_at >= week_start,
            QuizAttempt.created_at < week_end,
        ).all()
        at_risk = sum(1 for a in attempts if a.score < 60)
        risk_over_time.append({
            "week": f"Нед {9 - week}",
            "at_risk": at_risk,
            "total": len(attempts),
        })

    # Most difficult modules (lowest avg scores)
    modules = db.query(Module).filter(Module.course_id == course_id).all()
    module_difficulty = []
    for module in modules:
        quizzes = db.query(Quiz).filter(Quiz.module_id == module.id).all()
        quiz_ids = [q.id for q in quizzes]
        if quiz_ids:
            attempts = db.query(QuizAttempt).filter(
                QuizAttempt.quiz_id.in_(quiz_ids)
            ).all()
            avg = sum(a.score for a in attempts) / max(1, len(attempts))
        else:
            avg = 0
        module_difficulty.append({"module": module.title_ru, "avg_score": round(avg, 1)})

    module_difficulty.sort(key=lambda x: x["avg_score"])

    students = db.query(User).filter(User.role == UserRole.student).all()

    return {
        "cluster_distribution": cluster_data,
        "risk_over_time": risk_over_time,
        "module_difficulty": module_difficulty[:5],
        "student_count": len(students),
        "course": {
            "id": course_id,
            "title_ru": course.title_ru if course else "Все курсы",
        },
    }
