from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database import Base, engine
from .routers import auth, onboarding, courses, quiz, assignments, ml, ai, student, teacher

# Create all tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="CogniLearn API",
    description="Adaptive Learning Platform — Cognitive Data Analysis",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(onboarding.router)
app.include_router(courses.router)
app.include_router(quiz.router)
app.include_router(assignments.router)
app.include_router(ml.router)
app.include_router(ai.router)
app.include_router(student.router)
app.include_router(teacher.router)

@app.get("/")
def root():
    return {"message": "CogniLearn API", "version": "1.0.0", "status": "running"}

@app.get("/health")
def health():
    return {"status": "ok"}
