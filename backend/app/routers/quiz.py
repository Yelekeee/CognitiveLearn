from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime
from typing import List
from ..database import get_db
from ..models import User, Quiz, Question, QuizAttempt, Module
from ..models.cognitive import CognitiveProfile
from ..schemas.course import QuizSubmit
from ..utils.auth import get_current_user
from ..ml.cognitive_load import calculate_cognitive_load

router = APIRouter(prefix="/api", tags=["quiz"])

@router.get("/quiz/{module_id}")
def get_quiz(module_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    module = db.query(Module).filter(Module.id == module_id).first()
    if not module:
        raise HTTPException(status_code=404, detail="Module not found")
    
    # Get adapted difficulty from AdaptedPath if available
    from ..models.cognitive import AdaptedPath
    adapted = db.query(AdaptedPath).filter(
        AdaptedPath.student_id == current_user.id,
        AdaptedPath.module_id == module_id
    ).first()
    
    target_difficulty = adapted.recommended_difficulty if adapted else module.difficulty
    
    # Find quiz closest to target difficulty
    quiz = db.query(Quiz).filter(Quiz.module_id == module_id).order_by(
        (Quiz.difficulty - target_difficulty) * (Quiz.difficulty - target_difficulty)
    ).first()
    
    if not quiz:
        raise HTTPException(status_code=404, detail="No quiz found for this module")
    
    questions = db.query(Question).filter(Question.quiz_id == quiz.id).all()
    
    return {
        "quiz_id": quiz.id,
        "module_id": module_id,
        "difficulty": quiz.difficulty,
        "questions": [
            {
                "id": q.id,
                "text_ru": q.text_ru,
                "text_kz": q.text_kz,
                "options": q.options,
                "bloom_level": q.bloom_level,
            }
            for q in questions
        ]
    }

@router.post("/quiz/submit")
def submit_quiz(
    submission: QuizSubmit,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    quiz = db.query(Quiz).filter(Quiz.id == submission.quiz_id).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    
    questions = db.query(Question).filter(Question.quiz_id == quiz.id).all()
    q_map = {q.id: q for q in questions}
    
    correct = 0
    total = len(submission.responses)
    
    for response in submission.responses:
        q = q_map.get(response.get("question_id"))
        if q and response.get("answer") == q.correct_answer:
            correct += 1
    
    score = (correct / total * 100) if total > 0 else 0
    total_time = sum(r.get("time_ms", 3000) for r in submission.responses)
    
    # Calculate cognitive load
    load_result = calculate_cognitive_load(submission.responses, total_time)
    
    attempt = QuizAttempt(
        student_id=current_user.id,
        quiz_id=submission.quiz_id,
        score=score,
        time_total_ms=total_time,
        responses=submission.responses,
        cognitive_load_score=load_result["load_score"],
        created_at=datetime.utcnow()
    )
    db.add(attempt)
    db.commit()
    
    # Generate personalized feedback
    profile = db.query(CognitiveProfile).filter(
        CognitiveProfile.student_id == current_user.id
    ).first()
    
    feedback = generate_feedback(score, load_result["load_level"], profile)
    
    return {
        "score": round(score, 1),
        "correct": correct,
        "total": total,
        "cognitive_load": load_result,
        "feedback": feedback,
        "remedial_recommended": score < 60
    }

def generate_feedback(score: float, load_level: str, profile) -> str:
    if score >= 85:
        return "Отлично! Вы хорошо усвоили материал. Готовы к более сложным темам."
    elif score >= 60:
        if load_level == "high":
            return "Хороший результат, но заметна перегрузка. Сделайте перерыв перед следующим заданием."
        return "Хорошая работа! Продолжайте в том же темпе."
    else:
        return "Рекомендуем повторить материал. Не расстраивайтесь — трудности это часть обучения."
