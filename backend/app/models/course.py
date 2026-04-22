from sqlalchemy import Column, Integer, String, Text, DateTime, Float, ForeignKey, JSON, Boolean, Enum
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from ..database import Base

class ContentType(str, enum.Enum):
    video = "video"
    text = "text"
    diagram = "diagram"
    exercise = "exercise"
    example = "example"

class LearningStyleTarget(str, enum.Enum):
    visual = "visual"
    auditory = "auditory"
    kinesthetic = "kinesthetic"
    reading = "reading"

class Course(Base):
    __tablename__ = "courses"
    id = Column(Integer, primary_key=True, index=True)
    title_kz = Column(String(255), nullable=False)
    title_ru = Column(String(255), nullable=False)
    description = Column(Text)
    teacher_id = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    
    teacher = relationship("User", foreign_keys=[teacher_id])
    modules = relationship("Module", back_populates="course", order_by="Module.order_num")

class Module(Base):
    __tablename__ = "modules"
    id = Column(Integer, primary_key=True, index=True)
    course_id = Column(Integer, ForeignKey("courses.id"))
    title_kz = Column(String(255), nullable=False)
    title_ru = Column(String(255), nullable=False)
    order_num = Column(Integer, nullable=False)
    difficulty = Column(Integer, default=3)  # 1-5
    
    course = relationship("Course", back_populates="modules")
    contents = relationship("Content", back_populates="module")
    quizzes = relationship("Quiz", back_populates="module")
    assignments = relationship("Assignment", back_populates="module")

class Content(Base):
    __tablename__ = "contents"
    id = Column(Integer, primary_key=True, index=True)
    module_id = Column(Integer, ForeignKey("modules.id"))
    title = Column(String(255), nullable=False)
    type = Column(Enum(ContentType), nullable=False)
    body = Column(Text, nullable=False)
    difficulty = Column(Integer, default=3)  # 1-5
    learning_style_target = Column(Enum(LearningStyleTarget))
    order_num = Column(Integer, default=0)
    
    module = relationship("Module", back_populates="contents")

class Quiz(Base):
    __tablename__ = "quizzes"
    id = Column(Integer, primary_key=True, index=True)
    module_id = Column(Integer, ForeignKey("modules.id"))
    difficulty = Column(Integer, default=3)  # 1-5
    title = Column(String(255))
    
    module = relationship("Module", back_populates="quizzes")
    questions = relationship("Question", back_populates="quiz")
    attempts = relationship("QuizAttempt", back_populates="quiz")

class Question(Base):
    __tablename__ = "questions"
    id = Column(Integer, primary_key=True, index=True)
    quiz_id = Column(Integer, ForeignKey("quizzes.id"))
    text_kz = Column(Text, nullable=False)
    text_ru = Column(Text, nullable=False)
    options = Column(JSON, nullable=False)  # list of strings
    correct_answer = Column(String(255), nullable=False)
    bloom_level = Column(Integer, default=1)  # 1-6
    
    quiz = relationship("Quiz", back_populates="questions")

class QuizAttempt(Base):
    __tablename__ = "quiz_attempts"
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("users.id"))
    quiz_id = Column(Integer, ForeignKey("quizzes.id"))
    score = Column(Float, nullable=False)
    time_total_ms = Column(Integer)
    responses = Column(JSON)  # [{question_id, answer, time_ms}]
    cognitive_load_score = Column(Float)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    student = relationship("User", back_populates="quiz_attempts")
    quiz = relationship("Quiz", back_populates="attempts")

class Assignment(Base):
    __tablename__ = "assignments"
    id = Column(Integer, primary_key=True, index=True)
    module_id = Column(Integer, ForeignKey("modules.id"))
    title = Column(String(255), nullable=False)
    description = Column(Text)
    due_date = Column(DateTime)
    max_score = Column(Float, default=100.0)
    
    module = relationship("Module", back_populates="assignments")
    submissions = relationship("Submission", back_populates="assignment")

class Submission(Base):
    __tablename__ = "submissions"
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("users.id"))
    assignment_id = Column(Integer, ForeignKey("assignments.id"))
    score = Column(Float)
    submitted_at = Column(DateTime, default=datetime.utcnow)
    is_late = Column(Boolean, default=False)
    
    student = relationship("User", back_populates="submissions")
    assignment = relationship("Assignment", back_populates="submissions")
