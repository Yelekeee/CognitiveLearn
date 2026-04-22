from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Enum
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from ..database import Base

class ActivityAction(str, enum.Enum):
    view = "view"
    complete = "complete"
    skip = "skip"
    revisit = "revisit"

class LMSActivity(Base):
    __tablename__ = "lms_activities"
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("users.id"))
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=True)
    module_id = Column(Integer, ForeignKey("modules.id"), nullable=True)
    content_id = Column(Integer, ForeignKey("contents.id"), nullable=True)
    action = Column(Enum(ActivityAction))
    duration_seconds = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    student = relationship("User", back_populates="lms_activities")
