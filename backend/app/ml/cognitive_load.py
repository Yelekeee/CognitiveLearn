from typing import List, Dict, Any

def calculate_cognitive_load(responses: List[Dict[str, Any]], total_time_ms: int = None) -> Dict:
    """Calculate cognitive load score from quiz responses."""
    if not responses:
        return {"load_score": 50.0, "load_level": "medium", "recommendation": "Continue learning"}
    
    times = [r.get("time_ms", 3000) for r in responses]
    avg_time = sum(times) / len(times)
    max_time = max(times) if times else 3000
    
    # Time-based load (slow = overloaded)
    time_score = min(100, (avg_time / 3000) * 40)
    
    # Variance-based load (high variance = fatigue/confusion)
    if len(times) > 1:
        mean = avg_time
        variance = sum((t - mean) ** 2 for t in times) / len(times)
        std_dev = variance ** 0.5
        variance_score = min(30, (std_dev / 2000) * 30)
    else:
        variance_score = 15
    
    # Session length factor
    session_min = (total_time_ms or sum(times)) / 60000
    session_score = min(30, (session_min / 30) * 30)
    
    load_score = round(time_score + variance_score + session_score, 1)
    load_score = min(100, max(0, load_score))
    
    if load_score < 30:
        level = "low"
        recommendation = "Отличная концентрация! Можете переходить к более сложному материалу."
    elif load_score < 70:
        level = "optimal"
        recommendation = "Оптимальная нагрузка. Продолжайте в этом темпе."
    else:
        level = "high"
        recommendation = "Высокая когнитивная нагрузка. Рекомендуем сделать перерыв 10-15 минут."
    
    return {
        "load_score": load_score,
        "load_level": level,
        "recommendation": recommendation
    }
