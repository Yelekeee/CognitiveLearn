from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session

def recommend_content(
    student_profile: Dict[str, Any],
    module_id: int,
    db: Session
) -> Dict[str, Any]:
    """Recommend next content based on student's cognitive profile."""
    from ..models import Content, LMSActivity, CognitiveProfile
    from ..models.activity import ActivityAction
    
    learning_style = student_profile.get("learning_style", "visual")
    cognitive_load = student_profile.get("cognitive_load", "medium")
    avg_score = student_profile.get("avg_score", 65)
    stress = student_profile.get("stress", 3)
    cluster_label = student_profile.get("cluster_label", "")
    
    # Get already viewed content
    viewed_ids = [a.content_id for a in db.query(LMSActivity).filter(
        LMSActivity.student_id == student_profile.get("student_id"),
        LMSActivity.module_id == module_id,
        LMSActivity.action.in_([ActivityAction.complete, ActivityAction.view])
    ).all() if a.content_id]
    
    # Content type priority by learning style
    style_priority = {
        "visual": ["diagram", "video", "text", "exercise", "example"],
        "kinesthetic": ["exercise", "example", "diagram", "video", "text"],
        "reading": ["text", "example", "diagram", "exercise", "video"],
        "auditory": ["video", "text", "example", "exercise", "diagram"],
    }
    
    priority = style_priority.get(learning_style, ["text"])
    
    # Adjust for cognitive load
    if cognitive_load == "high" or stress > 4:
        # Show simpler content when overloaded
        preferred_difficulty = max(1, student_profile.get("difficulty_level", 3) - 1)
        reason = "Обнаружена высокая когнитивная нагрузка — показываем упрощенный материал"
    elif avg_score > 85:
        preferred_difficulty = min(5, student_profile.get("difficulty_level", 3) + 1)
        reason = "Отличные результаты — переходим к более сложному материалу"
    else:
        preferred_difficulty = student_profile.get("difficulty_level", 3)
        reason = f"Материал адаптирован под ваш стиль обучения: {learning_style}"
    
    # Special rules
    if "Struggling" in cluster_label and stress > 3:
        reason = "Начинаем с базового материала и добавляем поддержку"
        preferred_difficulty = max(1, preferred_difficulty - 1)
    
    # Get all module content
    all_content = db.query(Content).filter(Content.module_id == module_id).all()
    
    # Score each content item
    scored = []
    for content in all_content:
        if content.id in viewed_ids:
            continue
        
        score = 0
        content_type = content.type.value if hasattr(content.type, 'value') else str(content.type)
        
        # Style match score
        if content_type in priority:
            score += (len(priority) - priority.index(content_type)) * 10
        
        # Difficulty match score
        diff_match = abs(content.difficulty - preferred_difficulty)
        score += max(0, 20 - diff_match * 5)
        
        # Learning style target match
        content_style = content.learning_style_target.value if hasattr(content.learning_style_target, 'value') else str(content.learning_style_target)
        if content_style == learning_style:
            score += 15
        
        scored.append((content, score))
    
    if not scored:
        # All content viewed, recommend revisiting lowest scored
        revisit = all_content[0] if all_content else None
        if revisit:
            return {
                "content_id": revisit.id,
                "format_type": str(revisit.type),
                "difficulty_level": revisit.difficulty,
                "reason_text": "Весь материал пройден — повторяем ключевые темы",
            }
        return {"content_id": None, "format_type": "text", "difficulty_level": 3, "reason_text": "Нет доступного контента"}
    
    scored.sort(key=lambda x: x[1], reverse=True)
    best_content = scored[0][0]
    
    return {
        "content_id": best_content.id,
        "format_type": str(best_content.type.value if hasattr(best_content.type, 'value') else best_content.type),
        "difficulty_level": best_content.difficulty,
        "reason_text": reason,
    }
