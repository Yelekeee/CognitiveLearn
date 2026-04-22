import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import { useAuthStore } from '../store/auth'

const features = [
  { label: '4 типа данных',  desc: 'Академические, поведенческие, когнитивные, мотивационные' },
  { label: '6 ML-модулей',   desc: 'Кластеризация, прогноз риска, адаптация пути обучения' },
  { label: 'ИИ-Ассистент',   desc: 'Персональный помощник на базе Claude' },
  { label: 'Двуязычный',     desc: 'Казахский и русский языки' },
]

export default function Login() {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('student')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { setAuth } = useAuthStore()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (mode === 'login') {
        const data = await api.login(email, password)
        setAuth(data.user, data.access_token)
        navigate(data.user.role === 'teacher' ? '/teacher/class' : '/dashboard')
      } else {
        const data = await api.register(name, email, password, role)
        setAuth(data.user, data.access_token)
        navigate('/onboarding')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex" style={{ background: '#f1f5f9' }}>
      {/* ── Left panel (brand) ── */}
      <div
        className="hidden lg:flex w-[480px] flex-shrink-0 flex-col justify-between p-12"
        style={{ background: '#0c1330' }}
      >
        {/* Top */}
        <div>
          <div className="flex items-center gap-3 mb-14">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #4f6ef7, #6366f1)' }}
            >
              <span className="text-white font-bold text-base">C</span>
            </div>
            <span className="text-white font-semibold text-lg tracking-tight">CogniLearn</span>
          </div>

          <div className="space-y-3 mb-8">
            <h1 className="text-[36px] font-bold text-white leading-tight tracking-tight">
              Адаптивное обучение<br />на основе ваших данных
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.45)', lineHeight: 1.7 }} className="text-[15px]">
              Платформа анализирует когнитивные данные студентов и адаптирует учебный путь под каждого.
            </p>
          </div>
        </div>

        {/* Feature grid */}
        <div className="grid grid-cols-2 gap-3">
          {features.map((f) => (
            <div
              key={f.label}
              className="rounded-xl p-4"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)' }}
            >
              <div className="text-white font-semibold text-sm mb-1">{f.label}</div>
              <div className="text-[12px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.40)' }}>
                {f.desc}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Right panel (form) ── */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-[380px]">
          {/* Header */}
          <div className="mb-8">
            <h2 className="text-[26px] font-bold text-gray-900 tracking-tight">
              {mode === 'login' ? 'Войти в аккаунт' : 'Создать аккаунт'}
            </h2>
            <p className="text-gray-500 text-sm mt-1.5">
              {mode === 'login'
                ? 'Введите данные для входа на платформу'
                : 'Заполните форму для регистрации'}
            </p>
          </div>

          {/* Demo hint */}
          <div
            className="rounded-xl p-3.5 mb-6 text-xs"
            style={{
              background: 'rgba(79,110,247,0.06)',
              border: '1px solid rgba(79,110,247,0.15)',
              color: '#4060f0',
            }}
          >
            <div className="font-semibold mb-1.5">Демо-доступ</div>
            <div className="space-y-0.5" style={{ color: 'rgba(64,96,240,0.80)' }}>
              <div>Студент: <span className="font-medium">student1@cognilearn.kz</span> / student123</div>
              <div>Преподаватель: <span className="font-medium">teacher@cognilearn.kz</span> / teacher123</div>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div>
                <label className="label">Имя</label>
                <input
                  className="input"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Ваше имя"
                  required
                />
              </div>
            )}
            <div>
              <label className="label">Email</label>
              <input
                className="input"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="email@example.com"
                required
              />
            </div>
            <div>
              <label className="label">Пароль</label>
              <input
                className="input"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>
            {mode === 'register' && (
              <div>
                <label className="label">Роль</label>
                <select className="input" value={role} onChange={e => setRole(e.target.value)}>
                  <option value="student">Студент</option>
                  <option value="teacher">Преподаватель</option>
                </select>
              </div>
            )}

            {error && (
              <div className="rounded-lg px-3.5 py-2.5 text-sm text-red-700 bg-red-50 border border-red-100">
                {error}
              </div>
            )}

            <button type="submit" className="btn-primary w-full py-2.5 mt-2" disabled={loading}>
              {loading
                ? 'Загрузка...'
                : mode === 'login'
                  ? 'Войти'
                  : 'Зарегистрироваться'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            {mode === 'login' ? 'Нет аккаунта?' : 'Уже есть аккаунт?'}{' '}
            <button
              className="text-primary-600 font-semibold hover:text-primary-700 transition-colors"
              onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
            >
              {mode === 'login' ? 'Зарегистрироваться' : 'Войти'}
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}
