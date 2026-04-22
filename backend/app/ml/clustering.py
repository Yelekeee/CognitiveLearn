import numpy as np
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler
from typing import Dict, List, Any, Optional
import joblib
import os

CLUSTER_LABELS = {
    0: ("High Performer — Visual", "Высокие результаты, визуальный стиль обучения, высокая мотивация. Предпочитает диаграммы и схемы."),
    1: ("Struggling — Overloaded", "Низкие результаты, высокая когнитивная нагрузка, низкая мотивация. Нуждается в дополнительной поддержке."),
    2: ("Active — Kinesthetic", "Средние результаты, короткие сессии, предпочитает практику. Активный и целеустремленный."),
    3: ("Passive — Reading", "Выполняет задания но низкая вовлеченность. Предпочитает текстовые материалы."),
}

MODEL_PATH = os.path.join(os.path.dirname(__file__), "models", "kmeans_model.pkl")
SCALER_PATH = os.path.join(os.path.dirname(__file__), "models", "scaler.pkl")

_model: Optional[KMeans] = None
_scaler: Optional[StandardScaler] = None

def get_models():
    global _model, _scaler
    if _model is None:
        try:
            _model = joblib.load(MODEL_PATH)
            _scaler = joblib.load(SCALER_PATH)
        except Exception:
            # Train with synthetic data if no model exists
            _model, _scaler = train_default_model()
    return _model, _scaler

def train_default_model():
    """Train with synthetic representative data."""
    np.random.seed(42)
    n = 120
    
    # Generate 4 distinct clusters
    data = np.vstack([
        np.random.normal([85, 0.9, 45, 30, 1, 4.2, 4.0, 75], [5, 0.05, 5, 5, 0.1, 0.3, 0.3, 5], (30, 8)),
        np.random.normal([45, 0.5, 25, 80, 2, 2.0, 2.1, 35], [8, 0.08, 5, 8, 0.1, 0.4, 0.4, 8], (30, 8)),
        np.random.normal([68, 0.75, 20, 50, 3, 3.5, 3.8, 60], [7, 0.07, 4, 7, 0.1, 0.3, 0.3, 7], (30, 8)),
        np.random.normal([72, 0.85, 55, 45, 4, 3.0, 2.5, 55], [6, 0.06, 6, 6, 0.1, 0.4, 0.4, 6], (30, 8)),
    ])
    
    scaler = StandardScaler()
    data_scaled = scaler.fit_transform(data)
    
    model = KMeans(n_clusters=4, random_state=42, n_init=10)
    model.fit(data_scaled)
    
    os.makedirs(os.path.dirname(MODEL_PATH), exist_ok=True)
    joblib.dump(model, MODEL_PATH)
    joblib.dump(scaler, SCALER_PATH)
    
    return model, scaler

def get_student_cluster(student_features: Dict[str, float]) -> Dict[str, Any]:
    """Get cluster for a student based on their features."""
    model, scaler = get_models()
    
    # Feature vector: [avg_score, completion_rate, session_duration, cognitive_load,
    #                  learning_style_encoded, motivation, engagement, processing_speed]
    style_encoding = {"visual": 1, "auditory": 2, "kinesthetic": 3, "reading": 4}
    load_encoding = {"low": 20, "medium": 50, "high": 80}
    
    features = np.array([[
        student_features.get("avg_score", 65),
        student_features.get("completion_rate", 0.7),
        student_features.get("session_duration", 30),
        load_encoding.get(student_features.get("cognitive_load", "medium"), 50),
        style_encoding.get(student_features.get("learning_style", "visual"), 1),
        student_features.get("motivation", 3),
        student_features.get("engagement", 3),
        student_features.get("processing_speed", 50),
    ]])
    
    features_scaled = scaler.transform(features)
    cluster_id = int(model.predict(features_scaled)[0])
    
    label, description = CLUSTER_LABELS[cluster_id]
    
    # Radar chart data (6 dimensions)
    radar_data = [
        {"subject": "Память", "value": round(student_features.get("memory_score", 50), 1), "fullMark": 100},
        {"subject": "Скорость", "value": round(student_features.get("processing_speed", 50), 1), "fullMark": 100},
        {"subject": "Нагрузка", "value": round(100 - load_encoding.get(student_features.get("cognitive_load", "medium"), 50), 1), "fullMark": 100},
        {"subject": "Мотивация", "value": round(student_features.get("motivation", 3) * 20, 1), "fullMark": 100},
        {"subject": "Вовлеченность", "value": round(student_features.get("engagement", 3) * 20, 1), "fullMark": 100},
        {"subject": "Успеваемость", "value": round(student_features.get("avg_score", 65), 1), "fullMark": 100},
    ]
    
    return {
        "cluster_id": cluster_id,
        "cluster_label": label,
        "cluster_description": description,
        "radar_data": radar_data,
    }

def retrain_model(student_data: List[Dict]) -> Dict:
    """Retrain the KMeans model with actual student data."""
    if len(student_data) < 8:
        return {"status": "insufficient_data", "message": "Need at least 8 students to retrain"}
    
    style_encoding = {"visual": 1, "auditory": 2, "kinesthetic": 3, "reading": 4}
    load_encoding = {"low": 20, "medium": 50, "high": 80}
    
    features_list = []
    for s in student_data:
        features_list.append([
            s.get("avg_score", 65),
            s.get("completion_rate", 0.7),
            s.get("session_duration", 30),
            load_encoding.get(s.get("cognitive_load", "medium"), 50),
            style_encoding.get(s.get("learning_style", "visual"), 1),
            s.get("motivation", 3),
            s.get("engagement", 3),
            s.get("processing_speed", 50),
        ])
    
    X = np.array(features_list)
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    
    model = KMeans(n_clusters=4, random_state=42, n_init=10)
    model.fit(X_scaled)
    
    global _model, _scaler
    _model = model
    _scaler = scaler
    
    os.makedirs(os.path.dirname(MODEL_PATH), exist_ok=True)
    joblib.dump(model, MODEL_PATH)
    joblib.dump(scaler, SCALER_PATH)
    
    return {"status": "retrained", "n_students": len(student_data)}
