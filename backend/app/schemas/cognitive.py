from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime

class CognitiveTestSubmit(BaseModel):
    responses: List[Dict[str, Any]]  # [{question_id, answer, time_ms}]

class SurveySubmit(BaseModel):
    motivation: float
    engagement: float
    stress: float
    interest: float
    difficulty: float

class CognitiveProfileResponse(BaseModel):
    learning_style: Optional[str]
    cognitive_load: Optional[str]
    processing_speed: float
    memory_score: float
    bloom_level: int
    cluster_label: Optional[str]
    cluster_description: Optional[str]
    updated_at: Optional[datetime]
    
    class Config:
        from_attributes = True

class MLProfileResponse(BaseModel):
    cluster_label: str
    cluster_description: str
    radar_data: List[Dict[str, Any]]

class RiskResponse(BaseModel):
    risk_level: str
    risk_score: float
    risk_factors: List[str]

class ContentRecommendation(BaseModel):
    content_id: Optional[int]
    format_type: str
    difficulty_level: int
    reason_text: str

class AdaptedPathResponse(BaseModel):
    next_difficulty: int
    recommended_topics: List[str]
    skip_topics: List[str]
    current_level: str

class CognitiveLoadResponse(BaseModel):
    load_score: float
    load_level: str
    recommendation: str
