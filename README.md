# CogniLearn — Adaptive Learning Platform

**Дипломдық жұмыс**: Оқушылардың когнитивтік деректерін талдау негізінде бейімді оқыту

---

## Quick Start

### 1. Database (PostgreSQL)
```bash
docker run -d \
  -e POSTGRES_USER=cognilearn \
  -e POSTGRES_PASSWORD=cognilearn \
  -e POSTGRES_DB=cognilearn \
  -p 5432:5432 \
  postgres:16-alpine
```

### 2. Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate    # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env        # Add your ANTHROPIC_API_KEY

# Run migrations & start
uvicorn app.main:app --reload
# API docs: http://localhost:8000/docs

# Seed database (first time)
python seed.py
```

### 3. Frontend
```bash
cd frontend
npm install
npm run dev
# Open: http://localhost:5173
```

---

## Demo Accounts
| Role | Email | Password |
|------|-------|----------|
| Student | student1@cognilearn.kz | student123 |
| Teacher | teacher@cognilearn.kz | teacher123 |

---

## Architecture

```
4 Data Types → ML Engine → Adaptive Output
───────────────────────────────────────────
Academic   ─┐
Behavioral  ─┤─► K-Means Clustering ──► Cognitive Profile
Cognitive   ─┤─► Random Forest ──────► Risk Prediction  
Motivational─┘─► Rules + ML ─────────► Content Adaptation
                                     ► Path Adaptation
                                     ► Cognitive Load Monitor
                                     ► AI Assistant (Claude)
```

## Tech Stack
- **Frontend**: React 18 + TypeScript + Tailwind CSS + Recharts
- **Backend**: FastAPI + SQLAlchemy + Alembic
- **Database**: PostgreSQL
- **ML**: scikit-learn (K-Means, Random Forest)
- **AI**: Anthropic Claude API
- **Auth**: JWT

## ML Modules
1. **K-Means Clustering** — Student cognitive profiling (4 clusters)
2. **Random Forest** — At-risk prediction
3. **Content Recommendation** — Adaptive format selection
4. **Path Adaptation** — Dynamic difficulty adjustment
5. **Cognitive Load Monitor** — Real-time overload detection
6. **AI Assistant** — Claude-powered personalized tutor

## API Documentation
After starting backend: `http://localhost:8000/docs`
