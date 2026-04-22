from sqlalchemy import Column, Integer, String, DateTime, Enum
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from ..database import Base

class UserRole(str, enum.Enum):
    student = "student"
    teacher = "teacher"
    admin = "admin"

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(Enum(UserRole), default=UserRole.student)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    cognitive_profile = relationship("CognitiveProfile", back_populates="student", uselist=False)
    weekly_surveys = relationship("WeeklySurvey", back_populates="student")
    quiz_attempts = relationship("QuizAttempt", back_populates="student")
    lms_activities = relationship("LMSActivity", back_populates="student")
    submissions = relationship("Submission", back_populates="student")
    adapted_paths = relationship("AdaptedPath", back_populates="student")
