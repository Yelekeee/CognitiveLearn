from sqlalchemy import Column, Integer, String, Float, DateTime, JSON, Enum, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from ..database import Base

class LearningStyle(str, enum.Enum):
    visual = "visual"
    auditory = "auditory"
    kinesthetic = "kinesthetic"
    reading = "reading"

class CognitiveLoadLevel(str, enum.Enum):
    low = "low"
    medium = "medium"
    high = "high"

class CognitiveProfile(Base):
    __tablename__ = "cognitive_profiles"
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("users.id"), unique=True)
    learning_style = Column(Enum(LearningStyle))
    cognitive_load = Column(Enum(CognitiveLoadLevel), default=CognitiveLoadLevel.medium)
    processing_speed = Column(Float, default=50.0)  # 0-100
    memory_score = Column(Float, default=50.0)  # 0-100
    bloom_level = Column(Integer, default=2)  # 1-6
    cluster_label = Column(String(100))
    cluster_description = Column(String(500))
    updated_at = Column(DateTime, default=datetime.utcnow)
    
    student = relationship("User", back_populates="cognitive_profile")

class WeeklySurvey(Base):
    __tablename__ = "weekly_surveys"
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("users.id"))
    motivation = Column(Float)  # 1-5
    engagement = Column(Float)  # 1-5
    stress = Column(Float)  # 1-5
    interest = Column(Float)  # 1-5
    difficulty = Column(Float)  # 1-5
    submitted_at = Column(DateTime, default=datetime.utcnow)
    
    student = relationship("User", back_populates="weekly_surveys")

class AdaptedPath(Base):
    __tablename__ = "adapted_paths"
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("users.id"))
    module_id = Column(Integer, ForeignKey("modules.id"))
    recommended_difficulty = Column(Integer, default=3)
    skip_topics = Column(JSON, default=[])
    add_topics = Column(JSON, default=[])
    risk_level = Column(String(20), default="low")
    risk_score = Column(Float, default=0.0)
    updated_at = Column(DateTime, default=datetime.utcnow)
    
    student = relationship("User", back_populates="adapted_paths")
    module = relationship("Module")
