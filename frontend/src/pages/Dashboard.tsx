import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts'
import { api } from '../api/client'
import { useAuthStore } from '../store/auth'
import type { DashboardData } from '../api/client'

const RISK_CONFIG = {
  high:   { label: 'Высокий риск',  className: 'badge-red'    },
  medium: { label: 'Средний риск',  className: 'badge-yellow' },
  low:    { label: 'На верном пути',className: 'badge-green'  },
}

const STYLE_LABELS: Record<string, string> = {
  visual:      'Визуальный',
  auditory:    'Аудиальный',
  kinesthetic: 'Кинестетический',
  reading:     'Читатель',
}

const LOAD_CONFIG: Record<string, { label: string; color: string }> = {
  low:    { label: 'Низкая',      color: '#10b981' },
  medium: { label: 'Оптимальная', color: '#4f6ef7' },
  high:   { label: 'Высокая',     color: '#ef4444' },
}

export default function Dashboard() {
  const [data, setData]           = useState<DashboardData | null>(null)
  const [radarData, setRadarData] = useState<{ subject: string; value: number; fullMark: number }[]>([])
  const [loading, setLoading]     = useState(true)
  const { user } = useAuthStore()

  useEffect(() => {
    const load = async () => {
      try {
        const [dash, profile] = await Promise.all([
          api.getDashboard(),
          api.getMLProfile(user!.id).catch(() => null),
        ])
        setData(dash)
        if (profile) setRadarData(profile.radar_data)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [user])

  if (loading) return (
    <div className="flex items-center justify-center h-screen">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-primary-200 border-t-primary-500 rounded-full animate-spin" />
        <div className="text-gray-400 text-sm">Загрузка дашборда...</div>
      </div>
    </div>
  )

  if (!data) return null

  const risk = RISK_CONFIG[data.risk.risk_level as keyof typeof RISK_CONFIG] ?? RISK_CONFIG.low

  return (
    <div className="p-4 md:p-7 max-w-7xl mx-auto">

      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[22px] font-bold text-gray-900 tracking-tight">Дашборд</h1>
          <p className="text-gray-500 text-sm mt-0.5">Добро пожаловать, {data.student.name}</p>
        </div>
        {data.survey_needed && (
          <Link to="/onboarding" className="btn-primary text-sm px-4 py-2">
            Пройти еженедельный опрос
          </Link>
        )}
      </div>

      {/* ── Top stats ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-5">
        <div className="card">
          <div className="stat-value">{data.avg_score.toFixed(1)}%</div>
          <div className="stat-label">Средний балл</div>
        </div>
        <div className="card">
          <div className="mb-2">
            <span className={risk.className}>{risk.label}</span>
          </div>
          <div className="stat-label">Риск неуспеваемости</div>
        </div>
        <div className="card">
          <div className="stat-value">{data.total_attempts}</div>
          <div className="stat-label">Тестов пройдено</div>
        </div>
        <div className="card">
          <div className="text-sm font-semibold text-gray-900 leading-tight">
            {data.profile
              ? STYLE_LABELS[data.profile.learning_style] || data.profile.learning_style
              : '—'}
          </div>
          <div className="stat-label">Стиль обучения</div>
        </div>
      </div>

      {/* ── Charts row ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5 mb-4 md:mb-5">

        {/* Cognitive profile radar */}
        <div className="card">
          <div className="section-title">Когнитивный профиль</div>
          {radarData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="#f0f0f0" />
                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: '#9ca3af' }} />
                <Radar
                  dataKey="value"
                  stroke="#4f6ef7"
                  fill="#4f6ef7"
                  fillOpacity={0.12}
                  strokeWidth={2}
                />
              </RadarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex flex-col items-center justify-center gap-2 text-gray-300">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-10 h-10 opacity-40">
                <polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5"/>
              </svg>
              <span className="text-sm">Нет данных профиля</span>
            </div>
          )}
        </div>

        {/* Score trend */}
        <div className="card md:col-span-2">
          <div className="section-title">Динамика успеваемости</div>
          {data.score_trend.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={data.score_trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5" />
                <XAxis dataKey="week" tick={{ fontSize: 11, fill: '#9ca3af' }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#9ca3af' }} />
                <Tooltip
                  contentStyle={{
                    fontSize: 12,
                    border: '1px solid #f1f5f9',
                    borderRadius: 10,
                    boxShadow: '0 4px 16px rgb(0 0 0 / 0.10)',
                  }}
                />
                <Line
                  type="monotone" dataKey="score" stroke="#4f6ef7" strokeWidth={2}
                  dot={{ r: 3, fill: '#4f6ef7', strokeWidth: 0 }} name="Балл"
                />
                <Line
                  type="monotone" dataKey="load" stroke="#f59e0b" strokeWidth={1.5}
                  strokeDasharray="4 2" dot={false} name="Нагрузка"
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-gray-300 text-sm">
              Пройдите тесты для отображения динамики
            </div>
          )}
        </div>
      </div>

      {/* ── Bottom row ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5">

        {/* Risk factors */}
        <div className="card">
          <div className="section-title">Факторы риска</div>
          <div className="space-y-2.5">
            {data.risk.risk_factors.length > 0
              ? data.risk.risk_factors.map((f, i) => (
                <div key={i} className="flex items-start gap-2.5 text-sm text-gray-600">
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-300 mt-1.5 flex-shrink-0" />
                  <span>{f}</span>
                </div>
              ))
              : <p className="text-sm text-gray-400">Факторы риска не выявлены</p>
            }
          </div>

          {data.profile && (
            <div className="mt-5 pt-4 border-t border-gray-100">
              <div className="text-xs text-gray-400 mb-2 font-medium">Когнитивная нагрузка</div>
              <div className="flex items-center gap-2.5">
                <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-1.5 rounded-full transition-all"
                    style={{
                      width: `${data.profile.cognitive_load === 'high' ? 85 : data.profile.cognitive_load === 'medium' ? 50 : 25}%`,
                      backgroundColor: LOAD_CONFIG[data.profile.cognitive_load]?.color ?? '#4f6ef7',
                    }}
                  />
                </div>
                <span className="text-xs text-gray-500 font-medium whitespace-nowrap">
                  {LOAD_CONFIG[data.profile.cognitive_load]?.label ?? '—'}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Course progress */}
        <div className="card md:col-span-2">
          <div className="section-title">Прогресс по курсам</div>
          <div className="space-y-4">
            {data.course_progress.map(course => (
              <div key={course.id}>
                <div className="flex justify-between items-center mb-2">
                  <Link
                    to="/courses"
                    className="text-sm text-gray-700 hover:text-primary-600 font-medium transition-colors"
                  >
                    {course.title_ru}
                  </Link>
                  <span className="text-xs text-gray-400 font-medium tabular-nums">
                    {course.progress.toFixed(0)}%
                  </span>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${course.progress}%` }} />
                </div>
              </div>
            ))}
          </div>

          {data.profile?.cluster_label && (
            <div className="mt-5 pt-4 border-t border-gray-100">
              <div
                className="rounded-xl p-3.5"
                style={{ background: 'rgba(79,110,247,0.04)', border: '1px solid rgba(79,110,247,0.10)' }}
              >
                <div className="text-xs font-semibold text-primary-600 mb-0.5 uppercase tracking-wide">
                  ML-профиль
                </div>
                <div className="text-sm text-gray-700">{data.profile.cluster_label}</div>
                {data.profile.cluster_description && (
                  <div className="text-xs text-gray-500 mt-0.5">{data.profile.cluster_description}</div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
