import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler
from typing import Dict, List, Any, Optional
import joblib
import os

MODEL_PATH = os.path.join(os.path.dirname(__file__), "models", "rf_risk_model.pkl")
SCALER_PATH = os.path.join(os.path.dirname(__file__), "models", "rf_scaler.pkl")

_model: Optional[RandomForestClassifier] = None
_scaler: Optional[StandardScaler] = None

RISK_FACTORS_MAP = {
    0: "Низкие результаты последних тестов",
    1: "Редкие сессии обучения",
    2: "Низкий процент выполнения заданий",
    3: "Низкая мотивация",
    4: "Высокая когнитивная нагрузка",
    5: "Долгое отсутствие активности",
}

def get_models():
    global _model, _scaler
    if _model is None:
        try:
            _model = joblib.load(MODEL_PATH)
            _scaler = joblib.load(SCALER_PATH)
        except Exception:
            _model, _scaler = train_default_model()
    return _model, _scaler

def train_default_model():
    np.random.seed(42)
    n = 200
    
    # at-risk students
    X_risk = np.random.normal([40, 45, 50, 0.4, 2.0, 75, 7], [10, 10, 10, 0.1, 0.5, 10, 2], (100, 7))
    y_risk = np.ones(100)
    
    # on-track students
    X_ok = np.random.normal([75, 78, 80, 0.8, 4.0, 40, 1], [8, 8, 8, 0.08, 0.4, 10, 0.5], (100, 7))
    y_ok = np.zeros(100)
    
    X = np.vstack([X_risk, X_ok])
    y = np.concatenate([y_risk, y_ok])
    
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    
    model = RandomForestClassifier(n_estimators=100, max_depth=6, random_state=42)
    model.fit(X_scaled, y)
    
    os.makedirs(os.path.dirname(MODEL_PATH), exist_ok=True)
    joblib.dump(model, MODEL_PATH)
    joblib.dump(scaler, SCALER_PATH)
    
    return model, scaler

def predict_risk(features: Dict[str, float]) -> Dict[str, Any]:
    """Predict risk level for a student."""
    model, scaler = get_models()
    
    # Features: last 3 test scores avg, session frequency, completion rate,
    #           motivation, cognitive load score, days since last login
    load_score_map = {"low": 20, "medium": 50, "high": 80}
    
    X = np.array([[
        features.get("score1", 65),
        features.get("score2", 65),
        features.get("score3", 65),
        features.get("completion_rate", 0.7) * 100,
        features.get("motivation", 3) * 20,
        load_score_map.get(features.get("cognitive_load", "medium"), 50),
        features.get("days_since_login", 1),
    ]])
    
    X_scaled = scaler.transform(X)
    risk_prob = float(model.predict_proba(X_scaled)[0][1])
    
    if risk_prob >= 0.7:
        risk_level = "high"
    elif risk_prob >= 0.4:
        risk_level = "medium"
    else:
        risk_level = "low"
    
    # Get top risk factors using feature importances
    feature_names = ["score1", "score2", "score3", "completion_rate", "motivation", "cognitive_load", "days_inactive"]
    importances = model.feature_importances_
    
    # Identify problematic features
    risk_factors = []
    feature_values = [
        features.get("score1", 65),
        features.get("score2", 65),
        features.get("score3", 65),
        features.get("completion_rate", 0.7) * 100,
        features.get("motivation", 3) * 20,
        load_score_map.get(features.get("cognitive_load", "medium"), 50),
        features.get("days_since_login", 1),
    ]
    
    thresholds = [60, 60, 60, 60, 60, 60, 5]
    high_is_bad = [False, False, False, False, False, True, True]
    
    problem_indices = []
    for i, (val, thresh, bad_high) in enumerate(zip(feature_values, thresholds, high_is_bad)):
        if (bad_high and val > thresh) or (not bad_high and val < thresh):
            problem_indices.append(i)
    
    problem_indices.sort(key=lambda i: importances[i], reverse=True)
    
    factor_messages = [
        "Низкие результаты последних тестов",
        "Низкие результаты тестов",
        "Снижение успеваемости",
        "Низкий процент выполнения заданий",
        "Низкая мотивация",
        "Высокая когнитивная нагрузка",
        "Длительное отсутствие в системе",
    ]
    
    risk_factors = [factor_messages[i] for i in problem_indices[:3]]
    if not risk_factors:
        risk_factors = ["Все показатели в норме"]
    
    return {
        "risk_level": risk_level,
        "risk_score": round(risk_prob, 3),
        "risk_factors": risk_factors,
    }
