from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Dict, Optional
from ..database import get_db
from ..models import User, CognitiveProfile, WeeklySurvey, QuizAttempt
from ..utils.auth import get_current_user
from ..config import settings

router = APIRouter(prefix="/api/ai", tags=["ai"])

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    student_id: int
    message: str
    conversation_history: Optional[List[ChatMessage]] = []

@router.post("/chat")
async def chat(
    request: ChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Get student profile
    profile = db.query(CognitiveProfile).filter(
        CognitiveProfile.student_id == request.student_id
    ).first()
    
    survey = db.query(WeeklySurvey).filter(
        WeeklySurvey.student_id == request.student_id
    ).order_by(WeeklySurvey.submitted_at.desc()).first()
    
    attempts = db.query(QuizAttempt).filter(
        QuizAttempt.student_id == request.student_id
    ).order_by(QuizAttempt.created_at.desc()).limit(5).all()
    
    scores = [a.score for a in attempts]
    avg_score = sum(scores) / len(scores) if scores else 65.0
    
    # Determine weak topics (low scoring areas)
    weak_topics = []
    if avg_score < 60:
        weak_topics = ["основные концепции", "практические задачи"]
    elif avg_score < 75:
        weak_topics = ["сложные задачи", "применение теории"]
    
    learning_style = "visual"
    cluster_label = "Active Learner"
    cognitive_load = "medium"
    motivation = 3.0
    
    if profile:
        learning_style = str(profile.learning_style.value if hasattr(profile.learning_style, 'value') else profile.learning_style or "visual")
        cluster_label = profile.cluster_label or "Active Learner"
        cognitive_load = str(profile.cognitive_load.value if hasattr(profile.cognitive_load, 'value') else profile.cognitive_load or "medium")
    
    if survey:
        motivation = survey.motivation
    
    system_prompt = f"""You are CogniLearn — an AI academic assistant for university students.
You have access to this student's profile:
  - Learning style: {learning_style}
  - Cognitive profile: {cluster_label}
  - Current cognitive load: {cognitive_load}
  - Average score: {avg_score:.1f}%
  - Weak topics: {', '.join(weak_topics) if weak_topics else 'none identified'}
  - Motivation score: {motivation}/5

Always:
- Adapt your explanation style to their learning style (visual → use ASCII diagrams and structured layouts, kinesthetic → give practical exercises, reading → give detailed text explanations)
- Be encouraging but honest about weak areas
- Suggest specific study strategies based on their cognitive profile
- Answer in the same language the student uses (Kazakh or Russian)
- Keep responses concise and actionable
- If learning style is visual, use structured text, tables, bullet lists, and ASCII diagrams
- If kinesthetic, give step-by-step exercises
- If the student is overloaded (high cognitive load), keep answers shorter and simpler"""
    
    # Build messages
    messages = []
    for msg in (request.conversation_history or []):
        messages.append({"role": msg.role, "content": msg.content})
    messages.append({"role": "user", "content": request.message})
    
    try:
        import anthropic
        client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
        
        response = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=1024,
            system=system_prompt,
            messages=messages
        )
        
        return {
            "response": response.content[0].text,
            "student_context": {
                "learning_style": learning_style,
                "cluster_label": cluster_label,
                "avg_score": round(avg_score, 1),
            }
        }
    except Exception as e:
        error_hint = str(e)[:120]
        return {
            "response": f"Ошибка AI-ассистента: {error_hint}\n\nПроверьте ANTHROPIC_API_KEY в файле .env и перезапустите сервер.",
            "student_context": {
                "learning_style": learning_style,
                "cluster_label": cluster_label,
                "avg_score": round(avg_score, 1),
            }
        }
