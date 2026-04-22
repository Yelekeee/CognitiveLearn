from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import List, Optional
from pydantic import BaseModel
from ..database import get_db
from ..models import User, QuizAttempt, LMSActivity, WeeklySurvey, CognitiveProfile, Module, Submission, Assignment
from ..models.cognitive import AdaptedPath
from ..utils.auth import get_current_user
from ..ml.clustering import get_student_cluster, retrain_model
from ..ml.risk_prediction import predict_risk
from ..ml.content_recommendation import recommend_content
from ..ml.path_adaptation import adapt_learning_path
from ..ml.cognitive_load import calculate_cognitive_load

router = APIRouter(prefix="/api/ml", tags=["ml"])

def get_student_features(student_id: int, db: Session) -> dict:
    """Aggregate all features for a student."""
    # Quiz scores
    attempts = db.query(QuizAttempt).filter(
        QuizAttempt.student_id == student_id
    ).order_by(QuizAttempt.created_at.desc()).limit(10).all()
    
    scores = [a.score for a in attempts]
    avg_score = sum(scores) / len(scores) if scores else 65.0
    
    # Session data
    activities = db.query(LMSActivity).filter(
        LMSActivity.student_id == student_id
    ).order_by(LMSActivity.created_at.desc()).limit(50).all()
    
    avg_session = sum(a.duration_seconds for a in activities) / 60 / max(1, len(activities))
    
    # Last login
    last_activity = activities[0] if activities else None
    days_since = 0
    if last_activity:
        days_since = (datetime.utcnow() - last_activity.created_at).days
    
    # Completion rate
    total_activities = len(activities)
    completed = sum(1 for a in activities if str(a.action) in ["complete", "ActivityAction.complete"])
    completion_rate = completed / max(1, total_activities)
    
    # Survey data
    survey = db.query(WeeklySurvey).filter(
        WeeklySurvey.student_id == student_id
    ).order_by(WeeklySurvey.submitted_at.desc()).first()
    
    motivation = survey.motivation if survey else 3.0
    engagement = survey.engagement if survey else 3.0
    stress = survey.stress if survey else 3.0
    
    # Cognitive profile
    profile = db.query(CognitiveProfile).filter(
        CognitiveProfile.student_id == student_id
    ).first()
    
    learning_style = "visual"
    cognitive_load = "medium"
    processing_speed = 50.0
    memory_score = 50.0
    bloom_level = 2
    cluster_label = ""
    
    if profile:
        learning_style = str(profile.learning_style.value if hasattr(profile.learning_style, 'value') else profile.learning_style or "visual")
        cognitive_load = str(profile.cognitive_load.value if hasattr(profile.cognitive_load, 'value') else profile.cognitive_load or "medium")
        processing_speed = profile.processing_speed or 50.0
        memory_score = profile.memory_score or 50.0
        bloom_level = profile.bloom_level or 2
        cluster_label = profile.cluster_label or ""
    
    return {
        "student_id": student_id,
        "avg_score": avg_score,
        "completion_rate": completion_rate,
        "session_duration": avg_session,
        "cognitive_load": cognitive_load,
        "learning_style": learning_style,
        "motivation": motivation,
        "engagement": engagement,
        "processing_speed": processing_speed,
        "memory_score": memory_score,
        "bloom_level": bloom_level,
        "cluster_label": cluster_label,
        "stress": stress,
        "days_since_login": days_since,
        "difficulty_level": 3,
    }

@router.get("/profile/{student_id}")
def get_ml_profile(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    features = get_student_features(student_id, db)
    result = get_student_cluster(features)
    
    # Update the profile with cluster info
    profile = db.query(CognitiveProfile).filter(
        CognitiveProfile.student_id == student_id
    ).first()
    if profile:
        profile.cluster_label = result["cluster_label"]
        profile.cluster_description = result["cluster_description"]
        db.commit()
    
    return result

@router.get("/risk/{student_id}/{module_id}")
def get_risk(
    student_id: int,
    module_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    features = get_student_features(student_id, db)
    
    attempts = db.query(QuizAttempt).filter(
        QuizAttempt.student_id == student_id
    ).order_by(QuizAttempt.created_at.desc()).limit(3).all()
    
    scores = [a.score for a in attempts]
    while len(scores) < 3:
        scores.append(65.0)
    
    risk_features = {
        "score1": scores[0],
        "score2": scores[1],
        "score3": scores[2],
        "completion_rate": features["completion_rate"],
        "motivation": features["motivation"],
        "cognitive_load": features["cognitive_load"],
        "days_since_login": features["days_since_login"],
    }
    
    result = predict_risk(risk_features)
    
    # Update adapted path
    adapted = db.query(AdaptedPath).filter(
        AdaptedPath.student_id == student_id,
        AdaptedPath.module_id == module_id
    ).first()
    
    if adapted:
        adapted.risk_level = result["risk_level"]
        adapted.risk_score = result["risk_score"]
        adapted.updated_at = datetime.utcnow()
        db.commit()
    
    return result

@router.get("/next-content/{student_id}/{module_id}")
def get_next_content(
    student_id: int,
    module_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    features = get_student_features(student_id, db)
    return recommend_content(features, module_id, db)

@router.post("/adapt-path/{student_id}")
def adapt_path(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    attempts = db.query(QuizAttempt).filter(
        QuizAttempt.student_id == student_id
    ).order_by(QuizAttempt.created_at.desc()).limit(3).all()
    
    scores = [a.score for a in attempts]
    avg_time = sum(a.time_total_ms or 0 for a in attempts) / max(1, len(attempts))
    
    return adapt_learning_path(student_id, scores, avg_time, db)

class CognitiveLoadRequest(BaseModel):
    student_id: int
    quiz_responses: List[dict]

@router.post("/cognitive-load")
def get_cognitive_load(request: CognitiveLoadRequest, db: Session = Depends(get_db)):
    total_time = sum(r.get("time_ms", 3000) for r in request.quiz_responses)
    return calculate_cognitive_load(request.quiz_responses, total_time)

@router.post("/retrain")
def retrain_models(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrain ML models with current data."""
    from ..models import User
    from ..models.user import UserRole
    
    students = db.query(User).filter(User.role == UserRole.student).all()
    student_data = []
    
    for student in students:
        features = get_student_features(student.id, db)
        student_data.append(features)
    
    result = retrain_model(student_data)
    
    # Re-run clustering for all students
    for student in students:
        features = get_student_features(student.id, db)
        cluster_result = get_student_cluster(features)
        profile = db.query(CognitiveProfile).filter(
            CognitiveProfile.student_id == student.id
        ).first()
        if profile:
            profile.cluster_label = cluster_result["cluster_label"]
            profile.cluster_description = cluster_result["cluster_description"]
    
    db.commit()
    return result
