from typing import Dict, Any, List
from sqlalchemy.orm import Session

def adapt_learning_path(
    student_id: int,
    recent_scores: List[float],
    avg_time_ms: float,
    db: Session
) -> Dict[str, Any]:
    """Adapt learning path based on recent performance."""
    from ..models.cognitive import AdaptedPath
    from ..models import Module
    
    avg_score = sum(recent_scores) / len(recent_scores) if recent_scores else 65
    
    # Determine difficulty adjustment
    if avg_score > 85:
        difficulty_delta = 1
        level_desc = "Повышаем сложность"
        skip_topics = ["Базовые концепции", "Вводные материалы"]
        add_topics = ["Расширенные задачи", "Практические проекты"]
    elif avg_score < 60:
        difficulty_delta = -1
        level_desc = "Снижаем сложность, добавляем поддержку"
        skip_topics = []
        add_topics = ["Повторение материала", "Дополнительные примеры", "Базовые упражнения"]
    else:
        difficulty_delta = 0
        level_desc = "Поддерживаем текущий уровень"
        skip_topics = []
        add_topics = []
    
    # Time factor
    if avg_time_ms > 0:
        avg_time_min = avg_time_ms / 60000
        if avg_time_min < 5:  # Too fast - might be guessing
            difficulty_delta = min(difficulty_delta + 1, 2)
            add_topics.append("Задачи на глубокое понимание")
        elif avg_time_min > 30:  # Too slow - struggling
            difficulty_delta = max(difficulty_delta - 1, -2)
            add_topics.append("Материалы для поддержки")
    
    # Get all modules and create adapted paths
    modules = db.query(Module).all()
    adapted_modules = []
    
    for module in modules:
        current_diff = module.difficulty
        new_diff = max(1, min(5, current_diff + difficulty_delta))
        
        adapted = db.query(AdaptedPath).filter(
            AdaptedPath.student_id == student_id,
            AdaptedPath.module_id == module.id
        ).first()
        
        if adapted:
            adapted.recommended_difficulty = new_diff
            adapted.skip_topics = skip_topics
            adapted.add_topics = add_topics
        else:
            adapted = AdaptedPath(
                student_id=student_id,
                module_id=module.id,
                recommended_difficulty=new_diff,
                skip_topics=skip_topics,
                add_topics=add_topics,
                risk_level="medium",
                risk_score=0.5
            )
            db.add(adapted)
        
        adapted_modules.append({"module_id": module.id, "difficulty": new_diff})
    
    db.commit()
    
    return {
        "next_difficulty": max(1, min(5, 3 + difficulty_delta)),
        "recommended_topics": add_topics,
        "skip_topics": skip_topics,
        "current_level": level_desc,
        "avg_score": round(avg_score, 1),
        "adapted_modules": adapted_modules,
    }
