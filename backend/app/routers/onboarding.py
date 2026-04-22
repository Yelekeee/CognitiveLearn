from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime
import random
from ..database import get_db
from ..models import User, CognitiveProfile, WeeklySurvey
from ..models.cognitive import LearningStyle, CognitiveLoadLevel
from ..schemas.cognitive import CognitiveTestSubmit, SurveySubmit
from ..utils.auth import get_current_user

router = APIRouter(prefix="/api/onboarding", tags=["onboarding"])

def analyze_cognitive_test(responses: list) -> dict:
    """Analyze test responses to determine learning style and cognitive metrics."""
    total_time = sum(r.get("time_ms", 3000) for r in responses)
    avg_time = total_time / len(responses) if responses else 3000
    
    # Determine learning style from question categories
    style_scores = {"visual": 0, "auditory": 0, "kinesthetic": 0, "reading": 0}
    correct_count = 0
    
    for i, response in enumerate(responses):
        q_type = response.get("question_type", "visual")
        if q_type in style_scores:
            if response.get("is_correct", False):
                style_scores[q_type] += 2
                correct_count += 1
            else:
                style_scores[q_type] += 0.5
    
    learning_style = max(style_scores, key=style_scores.get)
    
    # Processing speed: faster = higher score (inverse of avg time)
    processing_speed = max(0, min(100, 100 - (avg_time - 1000) / 50))
    
    # Memory score based on correct answers
    memory_score = (correct_count / len(responses) * 100) if responses else 50
    
    # Cognitive load from time variance
    times = [r.get("time_ms", 3000) for r in responses]
    time_variance = (max(times) - min(times)) if times else 1000
    cognitive_load = "high" if avg_time > 5000 else "low" if avg_time < 2000 else "medium"
    
    # Bloom level based on score
    bloom_level = max(1, min(6, int(memory_score / 17)))
    
    return {
        "learning_style": learning_style,
        "cognitive_load": cognitive_load,
        "processing_speed": round(processing_speed, 1),
        "memory_score": round(memory_score, 1),
        "bloom_level": bloom_level,
    }

@router.post("/cognitive-test")
def submit_cognitive_test(
    test_data: CognitiveTestSubmit,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    analysis = analyze_cognitive_test(test_data.responses)
    
    profile = db.query(CognitiveProfile).filter(
        CognitiveProfile.student_id == current_user.id
    ).first()
    
    if profile:
        profile.learning_style = analysis["learning_style"]
        profile.cognitive_load = analysis["cognitive_load"]
        profile.processing_speed = analysis["processing_speed"]
        profile.memory_score = analysis["memory_score"]
        profile.bloom_level = analysis["bloom_level"]
        profile.updated_at = datetime.utcnow()
    else:
        profile = CognitiveProfile(
            student_id=current_user.id,
            **analysis,
            updated_at=datetime.utcnow()
        )
        db.add(profile)
    
    db.commit()
    db.refresh(profile)
    return {"status": "success", "profile": {
        "learning_style": profile.learning_style,
        "cognitive_load": profile.cognitive_load,
        "processing_speed": profile.processing_speed,
        "memory_score": profile.memory_score,
        "bloom_level": profile.bloom_level,
    }}

@router.post("/survey")
def submit_survey(
    survey_data: SurveySubmit,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    survey = WeeklySurvey(
        student_id=current_user.id,
        motivation=survey_data.motivation,
        engagement=survey_data.engagement,
        stress=survey_data.stress,
        interest=survey_data.interest,
        difficulty=survey_data.difficulty,
        submitted_at=datetime.utcnow()
    )
    db.add(survey)
    db.commit()
    return {"status": "success", "message": "Survey submitted"}

@router.get("/questions")
def get_cognitive_questions():
    """Return the cognitive diagnostic test questions."""
    questions = [
        {"id": 1, "type": "visual", "text_ru": "Посмотрите на паттерн: 2, 4, 8, 16, ?", "text_kz": "Паттернді қараңыз: 2, 4, 8, 16, ?", "options": ["24", "32", "20", "18"], "correct": "32", "time_limit_ms": 10000},
        {"id": 2, "type": "visual", "text_ru": "Какая форма следующая: ○△□○△?", "text_kz": "Келесі пішін қандай: ○△□○△?", "options": ["○", "△", "□", "◇"], "correct": "□", "time_limit_ms": 8000},
        {"id": 3, "type": "reading", "text_ru": "Прочитайте: 'Адаптивное обучение использует ИИ для персонализации.' Что использует ИИ?", "text_kz": "Оқыңыз: 'Бейімді оқыту ЖИ-ды жекелеу үшін пайдаланады.' ЖИ нені пайдаланады?", "options": ["Геймификация", "Адаптивное обучение", "Тестирование", "Оценивание"], "correct": "Адаптивное обучение", "time_limit_ms": 12000},
        {"id": 4, "type": "kinesthetic", "text_ru": "Решите: если x + 5 = 12, то x = ?", "text_kz": "Шешіңіз: x + 5 = 12 болса, x = ?", "options": ["5", "6", "7", "8"], "correct": "7", "time_limit_ms": 8000},
        {"id": 5, "type": "visual", "text_ru": "На диаграмме: A>B, B>C. Что верно?", "text_kz": "Диаграммада: A>B, B>C. Не дұрыс?", "options": ["C>A", "A>C", "B=A", "C=B"], "correct": "A>C", "time_limit_ms": 10000},
        {"id": 6, "type": "reading", "text_ru": "Синоним слова 'анализировать':", "text_kz": "'Талдау' сөзінің синонимі:", "options": ["Создавать", "Исследовать", "Записывать", "Удалять"], "correct": "Исследовать", "time_limit_ms": 8000},
        {"id": 7, "type": "visual", "text_ru": "Паттерн: 1, 1, 2, 3, 5, 8, ?", "text_kz": "Паттерн: 1, 1, 2, 3, 5, 8, ?", "options": ["11", "12", "13", "14"], "correct": "13", "time_limit_ms": 10000},
        {"id": 8, "type": "kinesthetic", "text_ru": "Сколько треугольников в квадрате, разделенном диагоналями?", "text_kz": "Диагональдармен бөлінген шаршыда неше үшбұрыш бар?", "options": ["2", "4", "6", "8"], "correct": "4", "time_limit_ms": 12000},
        {"id": 9, "type": "reading", "text_ru": "Антоним слова 'эффективный':", "text_kz": "'Тиімді' сөзінің антонимі:", "options": ["Быстрый", "Неэффективный", "Полезный", "Правильный"], "correct": "Неэффективный", "time_limit_ms": 8000},
        {"id": 10, "type": "visual", "text_ru": "Какой цвет получится: синий + желтый?", "text_kz": "Қандай түс шығады: көк + сары?", "options": ["Красный", "Зеленый", "Оранжевый", "Фиолетовый"], "correct": "Зеленый", "time_limit_ms": 6000},
        {"id": 11, "type": "kinesthetic", "text_ru": "Площадь прямоугольника 4×6 = ?", "text_kz": "4×6 тіктөртбұрыштың ауданы = ?", "options": ["20", "22", "24", "26"], "correct": "24", "time_limit_ms": 8000},
        {"id": 12, "type": "reading", "text_ru": "Главная идея: 'Студенты учатся лучше когда материал адаптирован под них.'", "text_kz": "Негізгі идея: 'Студенттер материал оларға бейімделгенде жақсырақ үйренеді.'", "options": ["Студенты любят тесты", "Адаптация улучшает обучение", "Технологии необходимы", "Учителя важны"], "correct": "Адаптация улучшает обучение", "time_limit_ms": 12000},
        {"id": 13, "type": "visual", "text_ru": "Следующий в ряду: A1, B2, C3, D?", "text_kz": "Қатардағы келесісі: A1, B2, C3, D?", "options": ["D3", "D4", "D5", "D2"], "correct": "D4", "time_limit_ms": 8000},
        {"id": 14, "type": "kinesthetic", "text_ru": "Если скорость 60 км/ч, за 2 часа проедет:", "text_kz": "Жылдамдық 60 км/сағ болса, 2 сағатта өтеді:", "options": ["100 км", "120 км", "140 км", "60 км"], "correct": "120 км", "time_limit_ms": 10000},
        {"id": 15, "type": "auditory", "text_ru": "Рифмует со словом 'наука':", "text_kz": "'Ғылым' сөзімен ұйқасады:", "options": ["Книга", "Мука", "Тетрадь", "Ручка"], "correct": "Мука", "time_limit_ms": 8000},
        {"id": 16, "type": "visual", "text_ru": "3D куб имеет _ граней:", "text_kz": "3D текшенің _ қыры бар:", "options": ["4", "6", "8", "12"], "correct": "6", "time_limit_ms": 8000},
        {"id": 17, "type": "reading", "text_ru": "Выберите слово, отличное по смыслу: учиться, изучать, забывать, познавать", "text_kz": "Мағынасы бойынша ерекшеленетін сөзді таңдаңыз: үйрену, зерттеу, ұмыту, білу", "options": ["учиться", "изучать", "забывать", "познавать"], "correct": "забывать", "time_limit_ms": 10000},
        {"id": 18, "type": "kinesthetic", "text_ru": "15% от 200 = ?", "text_kz": "200-дің 15% = ?", "options": ["25", "30", "35", "40"], "correct": "30", "time_limit_ms": 10000},
        {"id": 19, "type": "visual", "text_ru": "Паттерн цветов: Красный, Синий, Зеленый, Красный, Синий, ?", "text_kz": "Түс паттерны: Қызыл, Көк, Жасыл, Қызыл, Көк, ?", "options": ["Красный", "Синий", "Зеленый", "Желтый"], "correct": "Зеленый", "time_limit_ms": 8000},
        {"id": 20, "type": "reading", "text_ru": "Структура эссе: введение, _, заключение", "text_kz": "Эссе құрылымы: кіріспе, _, қорытынды", "options": ["Список", "Основная часть", "Заголовок", "Библиография"], "correct": "Основная часть", "time_limit_ms": 8000},
    ]
    return {"questions": questions}
