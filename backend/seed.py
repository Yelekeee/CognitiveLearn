"""
CogniLearn Seed Script
Populates the database with:
- 3 courses, 5 modules each
- 30 student accounts
- 3 months of simulated activity, quiz attempts, surveys
- Trains ML models on seeded data
"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from datetime import datetime, timedelta
import random
import numpy as np
from app.database import SessionLocal, engine
from app.models import User, Course, Module, Content, Quiz, Question, QuizAttempt
from app.models import CognitiveProfile, WeeklySurvey, AdaptedPath, LMSActivity
from app.models import Assignment, Submission
from app.models.user import UserRole
from app.models.course import ContentType, LearningStyleTarget
from app.models.cognitive import LearningStyle, CognitiveLoadLevel
from app.models.activity import ActivityAction
from app.database import Base
from app.utils.auth import get_password_hash

random.seed(42)
np.random.seed(42)

Base.metadata.create_all(bind=engine)
db = SessionLocal()

def clear_data():
    from sqlalchemy import text
    for table in reversed(Base.metadata.sorted_tables):
        db.execute(table.delete())
    db.commit()
    # Reset auto-increment sequences
    for table in Base.metadata.sorted_tables:
        db.execute(text(f"ALTER SEQUENCE IF EXISTS {table.name}_id_seq RESTART WITH 1"))
    db.commit()
    print("Cleared existing data and reset sequences")

def create_courses_and_modules():
    courses_data = [
        {
            "title_kz": "Информатика негіздері",
            "title_ru": "Основы информатики",
            "description": "Базовый курс по информатике и программированию",
            "modules": [
                ("Алгоритмдер", "Алгоритмы и структуры данных", 1, 2),
                ("Деректер құрылымы", "Структуры данных", 2, 2),
                ("Бағдарламалау тілдері", "Языки программирования", 3, 3),
                ("Объектілі бағдарлама", "ООП принципы", 4, 3),
                ("Деректер қорлары", "Базы данных", 5, 4),
            ],
        },
        {
            "title_kz": "Математика",
            "title_ru": "Математика",
            "description": "Высшая математика для инженеров и программистов",
            "modules": [
                ("Дифференциалдық есептеу", "Дифференциальное исчисление", 1, 3),
                ("Интегралдық есептеу", "Интегральное исчисление", 2, 3),
                ("Сызықтық алгебра", "Линейная алгебра", 3, 4),
                ("Ықтималдықтар теориясы", "Теория вероятностей", 4, 4),
                ("Математикалық статистика", "Математическая статистика", 5, 5),
            ],
        },
        {
            "title_kz": "Деректер ғылымы",
            "title_ru": "Наука о данных",
            "description": "Машинное обучение и анализ данных",
            "modules": [
                ("Python негіздері", "Основы Python для анализа данных", 1, 2),
                ("Деректерді өңдеу", "Обработка и очистка данных", 2, 3),
                ("Статистикалық талдау", "Статистический анализ", 3, 3),
                ("Машиналық оқыту", "Машинное обучение", 4, 4),
                ("Нейрондық желілер", "Нейронные сети", 5, 5),
            ],
        },
    ]

    content_types = [
        ContentType.text, ContentType.video, ContentType.diagram,
        ContentType.exercise, ContentType.example
    ]
    style_targets = [
        LearningStyleTarget.visual, LearningStyleTarget.auditory,
        LearningStyleTarget.kinesthetic, LearningStyleTarget.reading
    ]

    teacher = db.query(User).filter(User.role == UserRole.teacher).first()
    teacher_id = teacher.id if teacher else None

    courses = []
    for c_data in courses_data:
        course = Course(
            title_kz=c_data["title_kz"],
            title_ru=c_data["title_ru"],
            description=c_data["description"],
            teacher_id=teacher_id,
        )
        db.add(course)
        db.flush()

        for m_title_kz, m_title_ru, order_num, difficulty in c_data["modules"]:
            module = Module(
                course_id=course.id,
                title_kz=m_title_kz,
                title_ru=m_title_ru,
                order_num=order_num,
                difficulty=difficulty,
            )
            db.add(module)
            db.flush()

            # 10 content items per module
            for i in range(10):
                ct = content_types[i % len(content_types)]
                st = style_targets[i % len(style_targets)]
                content = Content(
                    module_id=module.id,
                    title=f"{m_title_ru} — Материал {i+1}",
                    type=ct,
                    body=generate_content_body(ct, m_title_ru, i),
                    difficulty=max(1, min(5, difficulty + random.randint(-1, 1))),
                    learning_style_target=st,
                    order_num=i,
                )
                db.add(content)

            # Quizzes at 3 difficulty levels
            for diff in [difficulty - 1, difficulty, difficulty + 1]:
                diff = max(1, min(5, diff))
                quiz = Quiz(module_id=module.id, difficulty=diff,
                            title=f"{m_title_ru} — Тест (ур. {diff})")
                db.add(quiz)
                db.flush()

                # 10 questions per quiz
                for qi in range(10):
                    bloom = max(1, min(6, (qi // 2) + 1))
                    q = Question(
                        quiz_id=quiz.id,
                        text_kz=f"{m_title_kz} бойынша сұрақ {qi+1}",
                        text_ru=f"Вопрос {qi+1} по теме {m_title_ru}",
                        options=["Вариант А", "Вариант Б", "Вариант В", "Вариант Г"],
                        correct_answer="Вариант А",
                        bloom_level=bloom,
                    )
                    db.add(q)

            # Assignment per module
            due = datetime.utcnow() + timedelta(days=30)
            assign = Assignment(
                module_id=module.id,
                title=f"Задание по теме: {m_title_ru}",
                description=f"Выполните практическое задание по теме {m_title_ru}",
                due_date=due,
                max_score=100.0,
            )
            db.add(assign)

        courses.append(course)

    db.commit()
    print(f"Created {len(courses)} courses with modules, content, quizzes")
    return courses

def generate_content_body(content_type, topic: str, idx: int) -> str:
    bodies = {
        ContentType.text: f"## {topic}\n\nЭтот раздел охватывает ключевые концепции темы {topic}. "
                          f"Изучите теоретические основы и примеры применения. "
                          f"Материал {idx+1} из серии по данной теме.",
        ContentType.video: f"[Видео-лекция] {topic} — Часть {idx+1}\n\nВ этом видео рассматриваются "
                           f"практические аспекты темы. Продолжительность: {15 + idx*5} минут.",
        ContentType.diagram: f"[Диаграмма] {topic}\n\n```\n[Концепт A] → [Концепт B] → [Результат]\n"
                              f"     ↓              ↓\n[Пример 1]      [Пример 2]\n```\n"
                              f"Схема показывает связи между ключевыми элементами темы {topic}.",
        ContentType.exercise: f"## Практическое упражнение {idx+1}: {topic}\n\n"
                               f"**Задача:** Решите следующую задачу, применяя знания по теме.\n\n"
                               f"1. Шаг первый: Проанализируйте условие\n"
                               f"2. Шаг второй: Примените метод\n"
                               f"3. Шаг третий: Проверьте результат",
        ContentType.example: f"## Пример {idx+1}: {topic}\n\n"
                              f"**Разбор задачи:** Рассмотрим конкретный пример применения {topic}.\n\n"
                              f"**Дано:** Условие задачи\n**Решение:** Пошаговое решение\n**Ответ:** Результат",
    }
    return bodies.get(content_type, f"Материал по теме {topic}")

def create_users():
    profiles_config = [
        # High Performer — Visual (8 students)
        {"style": "visual", "load": "low", "speed": 80, "mem": 85, "bloom": 5,
         "cluster": "High Performer — Visual", "score_mean": 85, "motiv": 4.3},
        # Struggling — Overloaded (8 students)
        {"style": "auditory", "load": "high", "speed": 35, "mem": 40, "bloom": 2,
         "cluster": "Struggling — Overloaded", "score_mean": 45, "motiv": 2.1},
        # Active — Kinesthetic (7 students)
        {"style": "kinesthetic", "load": "medium", "speed": 65, "mem": 60, "bloom": 3,
         "cluster": "Active — Kinesthetic", "score_mean": 68, "motiv": 3.6},
        # Passive — Reading (7 students)
        {"style": "reading", "load": "medium", "speed": 55, "mem": 70, "bloom": 4,
         "cluster": "Passive — Reading", "score_mean": 72, "motiv": 2.8},
    ]
    counts = [8, 8, 7, 7]

    kz_names = [
        "Айдар Сейтқалиев", "Меруерт Бекова", "Нұрлан Жақсыбеков",
        "Дана Сатыбалдиева", "Арман Тоқтаров", "Гүлнәр Мұратова",
        "Серік Қасымов", "Зарина Алиева", "Бекзат Жүнісов", "Ақерке Оразова",
        "Тимур Сейткали", "Айгерим Нұрова", "Алишер Досмағамбетов", "Сабина Қасенова",
        "Ерлан Бейсенов", "Диана Сарсенова", "Жандос Оразов", "Назерке Тілеуова",
        "Руслан Ахметов", "Мадина Болатова", "Азамат Жұмабаев", "Айгүл Сүлейменова",
        "Дамир Мұсаев", "Аружан Бекмуратова", "Нұрсұлтан Қалиев", "Жұлдыз Ережепова",
        "Қайрат Смаилов", "Алтынай Байжанова", "Марат Досанов", "Ұлан Егізбаев",
    ]

    teacher = User(
        name="Профессор Ахметов А.А.",
        email="teacher@cognilearn.kz",
        password_hash=get_password_hash("teacher123"),
        role=UserRole.teacher,
    )
    db.add(teacher)
    db.flush()

    students = []
    idx = 0
    for profile_cfg, count in zip(profiles_config, counts):
        for i in range(count):
            name = kz_names[idx] if idx < len(kz_names) else f"Студент {idx+1}"
            email = f"student{idx+1}@cognilearn.kz"
            user = User(
                name=name,
                email=email,
                password_hash=get_password_hash("student123"),
                role=UserRole.student,
            )
            db.add(user)
            db.flush()

            # Cognitive profile
            style_map = {
                "visual": LearningStyle.visual, "auditory": LearningStyle.auditory,
                "kinesthetic": LearningStyle.kinesthetic, "reading": LearningStyle.reading,
            }
            load_map = {
                "low": CognitiveLoadLevel.low, "medium": CognitiveLoadLevel.medium, "high": CognitiveLoadLevel.high,
            }
            cp = CognitiveProfile(
                student_id=user.id,
                learning_style=style_map[profile_cfg["style"]],
                cognitive_load=load_map[profile_cfg["load"]],
                processing_speed=float(np.clip(np.random.normal(profile_cfg["speed"], 8), 10, 100)),
                memory_score=float(np.clip(np.random.normal(profile_cfg["mem"], 8), 10, 100)),
                bloom_level=profile_cfg["bloom"],
                cluster_label=profile_cfg["cluster"],
                cluster_description=f"Профиль студента: {profile_cfg['cluster']}",
                updated_at=datetime.utcnow(),
            )
            db.add(cp)
            students.append((user, profile_cfg))
            idx += 1

    db.commit()
    print(f"Created teacher + {len(students)} students")
    return students

def simulate_history(students, courses):
    """Simulate 3 months of activity, quiz attempts, and surveys."""
    now = datetime.utcnow()
    three_months_ago = now - timedelta(days=90)

    quizzes = []
    modules = []
    for course in courses:
        for module in course.modules:
            modules.append(module)
            for quiz in module.quizzes:
                quizzes.append(quiz)

    for user, profile_cfg in students:
        score_mean = profile_cfg["score_mean"]
        motiv_mean = profile_cfg["motiv"]
        load_level = profile_cfg["load"]

        # Weekly surveys (12 weeks)
        for week in range(12):
            survey_date = three_months_ago + timedelta(weeks=week, days=random.randint(0, 2))
            motiv = float(np.clip(np.random.normal(motiv_mean, 0.4), 1, 5))
            survey = WeeklySurvey(
                student_id=user.id,
                motivation=round(motiv, 1),
                engagement=round(float(np.clip(np.random.normal(motiv_mean - 0.2, 0.4), 1, 5)), 1),
                stress=round(float(np.clip(np.random.normal(6 - motiv_mean, 0.5), 1, 5)), 1),
                interest=round(float(np.clip(np.random.normal(motiv_mean + 0.1, 0.3), 1, 5)), 1),
                difficulty=round(float(np.clip(np.random.normal(3.0, 0.5), 1, 5)), 1),
                submitted_at=survey_date,
            )
            db.add(survey)

        # Quiz attempts (2-4 per week)
        for week in range(12):
            n_attempts = random.randint(1, 4) if load_level != "high" else random.randint(0, 2)
            for _ in range(n_attempts):
                attempt_date = three_months_ago + timedelta(
                    weeks=week, days=random.randint(0, 6), hours=random.randint(8, 22)
                )
                quiz = random.choice(quizzes)
                score = float(np.clip(np.random.normal(score_mean, 10), 0, 100))

                # Trend: scores improve slightly over time
                score = min(100, score + week * 0.5)

                session_ms = random.randint(600_000, 3_600_000)
                load_base = {"low": 25, "medium": 50, "high": 75}[load_level]
                load_score = float(np.clip(np.random.normal(load_base, 10), 0, 100))

                n_questions = 10
                responses = [
                    {"question_id": qi+1, "answer": "Вариант А", "time_ms": random.randint(1000, 8000)}
                    for qi in range(n_questions)
                ]

                attempt = QuizAttempt(
                    student_id=user.id,
                    quiz_id=quiz.id,
                    score=round(score, 1),
                    time_total_ms=session_ms,
                    responses=responses,
                    cognitive_load_score=round(load_score, 1),
                    created_at=attempt_date,
                )
                db.add(attempt)

        # LMS Activities
        for week in range(12):
            n_sessions = random.randint(2, 6) if load_level != "high" else random.randint(1, 3)
            for _ in range(n_sessions):
                act_date = three_months_ago + timedelta(
                    weeks=week, days=random.randint(0, 6), hours=random.randint(8, 22)
                )
                module = random.choice(modules)
                action = random.choice([ActivityAction.view, ActivityAction.complete, ActivityAction.revisit])
                activity = LMSActivity(
                    student_id=user.id,
                    course_id=module.course_id,
                    module_id=module.id,
                    action=action,
                    duration_seconds=random.randint(120, 3600),
                    created_at=act_date,
                )
                db.add(activity)

        # Adapted paths
        for module in modules:
            score_avg = score_mean
            if score_avg > 85:
                diff = min(5, module.difficulty + 1)
            elif score_avg < 60:
                diff = max(1, module.difficulty - 1)
            else:
                diff = module.difficulty

            adapted = AdaptedPath(
                student_id=user.id,
                module_id=module.id,
                recommended_difficulty=diff,
                skip_topics=["Базовые концепции"] if score_mean > 80 else [],
                add_topics=["Повторение материала"] if score_mean < 60 else [],
                risk_level="high" if score_mean < 55 else ("medium" if score_mean < 70 else "low"),
                risk_score=round(max(0, min(1, (70 - score_mean) / 70)), 3),
                updated_at=datetime.utcnow(),
            )
            db.add(adapted)

    db.commit()
    print("Simulated 3 months of activity, quiz attempts, and surveys")

def train_ml_models(students):
    """Train ML models on seeded data."""
    from app.ml.clustering import retrain_model
    from app.database import SessionLocal
    from app.routers.ml import get_student_features

    db2 = SessionLocal()
    student_data = []
    for user, _ in students:
        features = get_student_features(user.id, db2)
        student_data.append(features)
    db2.close()

    result = retrain_model(student_data)
    print(f"ML models trained: {result}")

if __name__ == "__main__":
    print("Starting CogniLearn seed...")
    clear_data()
    students = create_users()
    courses = db.query(Course).all()
    # Re-fetch after teacher creation
    from app.models import Course as CourseModel
    courses_with_modules = db.query(CourseModel).all()
    create_courses_and_modules()
    
    # Re-fetch everything
    db.close()
    db2 = SessionLocal()
    
    from app.models import User as UserModel
    from app.models.user import UserRole as UR
    all_students_db = db2.query(UserModel).filter(UserModel.role == UR.student).all()
    all_courses_db = db2.query(CourseModel).all()
    
    # Re-pair students with profiles
    from app.models import CognitiveProfile as CP
    profiles_config_list = [
        {"style": "visual", "load": "low", "speed": 80, "mem": 85, "bloom": 5,
         "cluster": "High Performer — Visual", "score_mean": 85, "motiv": 4.3},
        {"style": "auditory", "load": "high", "speed": 35, "mem": 40, "bloom": 2,
         "cluster": "Struggling — Overloaded", "score_mean": 45, "motiv": 2.1},
        {"style": "kinesthetic", "load": "medium", "speed": 65, "mem": 60, "bloom": 3,
         "cluster": "Active — Kinesthetic", "score_mean": 68, "motiv": 3.6},
        {"style": "reading", "load": "medium", "speed": 55, "mem": 70, "bloom": 4,
         "cluster": "Passive — Reading", "score_mean": 72, "motiv": 2.8},
    ]
    counts = [8, 8, 7, 7]
    
    students_paired = []
    idx = 0
    cfg_idx = 0
    cfg_count = 0
    for student in all_students_db:
        if cfg_count >= counts[cfg_idx]:
            cfg_idx += 1
            cfg_count = 0
        students_paired.append((student, profiles_config_list[min(cfg_idx, 3)]))
        cfg_count += 1
    
    simulate_history(students_paired, all_courses_db)
    
    db2.close()
    
    db3 = SessionLocal()
    from app.routers.ml import get_student_features
    from app.ml.clustering import retrain_model
    
    all_students_final = db3.query(UserModel).filter(UserModel.role == UR.student).all()
    student_features = [get_student_features(s.id, db3) for s in all_students_final]
    retrain_model(student_features)
    db3.close()
    
    print("\nSeed complete!")
    print("  Teacher: teacher@cognilearn.kz / teacher123")
    print("  Students: student1@cognilearn.kz ... student30@cognilearn.kz / student123")
