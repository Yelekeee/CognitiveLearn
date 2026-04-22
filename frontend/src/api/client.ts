const BASE = '/api'

function getToken(): string | null {
  const direct = localStorage.getItem('token')
  if (direct) return direct
  try {
    const persisted = localStorage.getItem('cognilearn-auth')
    if (persisted) {
      const parsed = JSON.parse(persisted)
      return parsed?.state?.token ?? null
    }
  } catch { /* ignore */ }
  return null
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken()
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  }
  const res = await fetch(`${BASE}${path}`, { ...options, headers })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Network error' }))
    throw new Error(err.detail || `HTTP ${res.status}`)
  }
  return res.json()
}

export const api = {
  // Auth
  login: (email: string, password: string) =>
    request<{ access_token: string; token_type: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  register: (name: string, email: string, password: string, role = 'student') =>
    request<{ access_token: string; user: User }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password, role }),
    }),
  me: () => request<User>('/auth/me'),

  // Onboarding
  getCognitiveQuestions: () =>
    request<{ questions: CognitiveQuestion[] }>('/onboarding/questions'),
  submitCognitiveTest: (responses: unknown[]) =>
    request('/onboarding/cognitive-test', {
      method: 'POST',
      body: JSON.stringify({ responses }),
    }),
  submitSurvey: (data: SurveyData) =>
    request('/onboarding/survey', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Courses
  getCourses: () => request<Course[]>('/courses'),
  getModules: (courseId: number) =>
    request<{ course: Course; modules: Module[] }>(`/courses/${courseId}/modules`),
  getContent: (moduleId: number) =>
    request<{ module: Module; contents: Content[]; adapted_for: string | null }>(`/content/${moduleId}`),
  logActivity: (data: ActivityLog) =>
    request('/activity', { method: 'POST', body: JSON.stringify(data) }),

  // Quiz
  getQuiz: (moduleId: number) => request<QuizData>(`/quiz/${moduleId}`),
  submitQuiz: (quizId: number, responses: QuizResponse[]) =>
    request<QuizResult>('/quiz/submit', {
      method: 'POST',
      body: JSON.stringify({ quiz_id: quizId, responses }),
    }),

  // Assignments
  getAssignments: (moduleId: number) =>
    request<AssignmentData[]>(`/assignments/${moduleId}`),
  submitAssignment: (assignmentId: number, score: number) =>
    request(`/assignments/${assignmentId}/submit`, {
      method: 'POST',
      body: JSON.stringify({ score }),
    }),

  // ML
  getMLProfile: (studentId: number) =>
    request<MLProfile>(`/ml/profile/${studentId}`),
  getRisk: (studentId: number, moduleId: number) =>
    request<RiskData>(`/ml/risk/${studentId}/${moduleId}`),
  getNextContent: (studentId: number, moduleId: number) =>
    request<ContentRec>(`/ml/next-content/${studentId}/${moduleId}`),
  adaptPath: (studentId: number) =>
    request(`/ml/adapt-path/${studentId}`, { method: 'POST' }),
  getCognitiveLoad: (studentId: number, responses: QuizResponse[]) =>
    request<CogLoadResult>('/ml/cognitive-load', {
      method: 'POST',
      body: JSON.stringify({ student_id: studentId, quiz_responses: responses }),
    }),
  retrainModels: () =>
    request('/ml/retrain', { method: 'POST' }),

  // AI
  chat: (studentId: number, message: string, history: ChatMsg[]) =>
    request<{ response: string; student_context: unknown }>('/ai/chat', {
      method: 'POST',
      body: JSON.stringify({ student_id: studentId, message, conversation_history: history }),
    }),

  // Student
  getDashboard: () => request<DashboardData>('/student/dashboard'),
  getLearningPath: () => request<LearningPathData>('/student/learning-path'),
  getAnalytics: () => request<AnalyticsData>('/student/analytics'),

  // Teacher
  getClassOverview: () => request<ClassOverview>('/teacher/class-overview'),
  getCourseAnalytics: (courseId: number) =>
    request<CourseAnalytics>(`/teacher/analytics/${courseId}`),
}

// Types
export interface User {
  id: number
  name: string
  email: string
  role: 'student' | 'teacher' | 'admin'
  created_at: string
}

export interface CognitiveQuestion {
  id: number
  type: string
  text_ru: string
  text_kz: string
  options: string[]
  correct: string
  time_limit_ms: number
}

export interface SurveyData {
  motivation: number
  engagement: number
  stress: number
  interest: number
  difficulty: number
}

export interface Course {
  id: number
  title_kz: string
  title_ru: string
  description: string
}

export interface Module {
  id: number
  course_id: number
  title_kz: string
  title_ru: string
  order_num: number
  difficulty: number
  progress?: number
  total_contents?: number
  completed_contents?: number
}

export interface Content {
  id: number
  module_id: number
  title: string
  type: 'video' | 'text' | 'diagram' | 'exercise' | 'example'
  body: string
  difficulty: number
  learning_style_target: string
  order_num: number
}

export interface ActivityLog {
  course_id?: number
  module_id?: number
  content_id?: number
  action: 'view' | 'complete' | 'skip' | 'revisit'
  duration_seconds?: number
}

export interface QuizData {
  quiz_id: number
  module_id: number
  difficulty: number
  questions: {
    id: number
    text_ru: string
    text_kz: string
    options: string[]
    bloom_level: number
  }[]
}

export interface QuizResponse {
  question_id: number
  answer: string
  time_ms: number
}

export interface QuizResult {
  score: number
  correct: number
  total: number
  cognitive_load: { load_score: number; load_level: string; recommendation: string }
  feedback: string
  remedial_recommended: boolean
}

export interface AssignmentData {
  id: number
  title: string
  description: string
  due_date: string
  max_score: number
  submitted: boolean
  score: number | null
  is_late: boolean | null
}

export interface MLProfile {
  cluster_label: string
  cluster_description: string
  radar_data: { subject: string; value: number; fullMark: number }[]
}

export interface RiskData {
  risk_level: 'high' | 'medium' | 'low'
  risk_score: number
  risk_factors: string[]
}

export interface ContentRec {
  content_id: number | null
  format_type: string
  difficulty_level: number
  reason_text: string
}

export interface CogLoadResult {
  load_score: number
  load_level: string
  recommendation: string
}

export interface ChatMsg {
  role: 'user' | 'assistant'
  content: string
}

export interface DashboardData {
  student: { name: string; email: string }
  avg_score: number
  risk: RiskData
  profile: {
    learning_style: string
    cognitive_load: string
    cluster_label: string
    cluster_description: string
    processing_speed: number
    memory_score: number
    bloom_level: number
  } | null
  survey_needed: boolean
  course_progress: { id: number; title_ru: string; title_kz: string; progress: number; modules_count: number }[]
  score_trend: { week: string; score: number; load: number }[]
  total_attempts: number
}

export interface LearningPathData {
  learning_path: {
    course_id: number
    course_title_ru: string
    course_title_kz: string
    modules: {
      id: number
      title_ru: string
      title_kz: string
      order_num: number
      difficulty: number
      original_difficulty: number
      progress: number
      is_completed: boolean
      best_score: number | null
      skip_topics: string[]
      add_topics: string[]
      risk_level: string
      status: 'completed' | 'current' | 'upcoming'
    }[]
  }[]
}

export interface AnalyticsData {
  score_trend: { week: string; score: number }[]
  load_trend: { week: string; load: number }[]
  survey_history: { week: string; motivation: number; stress: number; engagement: number }[]
  student_avg: number
  class_avg: number
  total_sessions: number
  total_quizzes: number
}

export interface ClassOverview {
  students: {
    id: number
    name: string
    email: string
    cluster: string
    risk_level: string
    avg_score: number
    avg_load: number
    last_active: string | null
    learning_style: string
  }[]
  total: number
}

export interface CourseAnalytics {
  cluster_distribution: { name: string; value: number }[]
  risk_over_time: { week: string; at_risk: number; total: number }[]
  module_difficulty: { module: string; avg_score: number }[]
  student_count: number
  course: { id: number; title_ru: string }
}
