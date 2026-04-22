import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/auth'
import Layout from './components/Layout'
import Login from './pages/Login'
import Onboarding from './pages/Onboarding'
import Dashboard from './pages/Dashboard'
import CoursesPage from './pages/CoursesPage'
import ModulePage from './pages/ModulePage'
import QuizPage from './pages/QuizPage'
import LearningPath from './pages/LearningPath'
import AIAssistant from './pages/AIAssistant'
import Analytics from './pages/Analytics'
import TeacherClass from './pages/TeacherClass'
import TeacherAnalytics from './pages/TeacherAnalytics'

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { token } = useAuthStore()
  if (!token) return <Navigate to="/login" replace />
  return <>{children}</>
}

function RequireTeacher({ children }: { children: React.ReactNode }) {
  const { user, token } = useAuthStore()
  if (!token) return <Navigate to="/login" replace />
  if (user?.role !== 'teacher' && user?.role !== 'admin') return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

export default function App() {
  const { token } = useAuthStore()

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={token ? <Navigate to="/dashboard" replace /> : <Login />} />
        <Route
          path="/onboarding"
          element={
            <RequireAuth>
              <Onboarding />
            </RequireAuth>
          }
        />
        <Route
          path="/*"
          element={
            <RequireAuth>
              <Layout>
                <Routes>
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/courses" element={<CoursesPage />} />
                  <Route path="/course/:courseId/module/:moduleId" element={<ModulePage />} />
                  <Route path="/quiz/:moduleId" element={<QuizPage />} />
                  <Route path="/path" element={<LearningPath />} />
                  <Route path="/analytics" element={<Analytics />} />
                  <Route path="/assistant" element={<AIAssistant />} />
                  <Route path="/teacher/class" element={<RequireTeacher><TeacherClass /></RequireTeacher>} />
                  <Route path="/teacher/analytics" element={<RequireTeacher><TeacherAnalytics /></RequireTeacher>} />
                  <Route path="*" element={<Navigate to="/dashboard" replace />} />
                </Routes>
              </Layout>
            </RequireAuth>
          }
        />
      </Routes>
    </BrowserRouter>
  )
}
