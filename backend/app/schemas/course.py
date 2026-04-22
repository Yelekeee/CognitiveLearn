from pydantic import BaseModel
from typing import Optional, List, Dict
from datetime import datetime

class CourseResponse(BaseModel):
    id: int
    title_kz: str
    title_ru: str
    description: Optional[str]
    teacher_id: Optional[int]
    
    class Config:
        from_attributes = True

class ModuleResponse(BaseModel):
    id: int
    course_id: int
    title_kz: str
    title_ru: str
    order_num: int
    difficulty: int
    
    class Config:
        from_attributes = True

class ContentResponse(BaseModel):
    id: int
    module_id: int
    title: str
    type: str
    body: str
    difficulty: int
    learning_style_target: Optional[str]
    order_num: int
    
    class Config:
        from_attributes = True

class QuizResponse(BaseModel):
    id: int
    module_id: int
    difficulty: int
    title: Optional[str]
    questions: List[Dict] = []
    
    class Config:
        from_attributes = True

class QuizSubmit(BaseModel):
    quiz_id: int
    responses: List[Dict]  # [{question_id, answer, time_ms}]

class ActivityLog(BaseModel):
    course_id: Optional[int]
    module_id: Optional[int]
    content_id: Optional[int]
    action: str
    duration_seconds: int = 0
