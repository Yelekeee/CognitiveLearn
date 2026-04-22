import { useEffect, useState } from 'react'
import {
  PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { api } from '../api/client'
import type { CourseAnalytics } from '../api/client'

const PIE_COLORS = ['#4f6ef7', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']

const COURSES = [
  { id: 1, name: 'Информатика негіздері' },
  { id: 2, name: 'Математика' },
  { id: 3, name: 'Деректер ғылымы' },
]

interface RetrainResult {
  status: string
  n_students?: number
}

export default function TeacherAnalytics() {
  const [data, setData]           = useState<CourseAnalytics | null>(null)
  const [loading, setLoading]     = useState(true)
  const [retraining, setRetraining] = useState(false)
  const [retrainMsg, setRetrainMsg] = useState<string | null>(null)
  const [courseId, setCourseId]   = useState(1)

  useEffect(() => {
    setLoading(true)
    api.getCourseAnalytics(courseId)
      .then(setData)
      .catch(() => null)
      .finally(() => setLoading(false))
  }, [courseId])

  const handleRetrain = async () => {
    setRetraining(true)
    setRetrainMsg(null)
    try {
      const result = await api.retrainModels() as RetrainResult
      setRetrainMsg(
        result.status === 'retrained'
          ? `Модели переобучены на ${result.n_students} студентах`
          : result.status
      )
    } catch {
      setRetrainMsg('Ошибка при переобучении')
    } finally {
      setRetraining(false)
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-screen">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-primary-200 border-t-primary-500 rounded-full animate-spin" />
        <div className="text-gray-400 text-sm">Загрузка аналитики...</div>
      </div>
    </div>
  )

  return (
    <div className="p-7 max-w-6xl mx-auto">

      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-7">
        <div>
          <h1 className="text-[22px] font-bold text-gray-900 tracking-tight">Аналитика</h1>
          <p className="text-gray-500 text-sm mt-0.5">Обзор успеваемости и ML-метрики</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            className="input text-sm w-52"
            value={courseId}
            onChange={e => setCourseId(Number(e.target.value))}
          >
            {COURSES.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <button onClick={handleRetrain} disabled={retraining} className="btn-primary text-sm px-4 py-2">
            {retraining ? 'Обучение...' : 'Переобучить ML'}
          </button>
        </div>
      </div>

      {retrainMsg && (
        <div
          className="mb-5 px-4 py-3 rounded-xl text-sm font-medium"
          style={{
            background: 'rgba(16,185,129,0.07)',
            border: '1px solid rgba(16,185,129,0.2)',
            color: '#065f46',
          }}
        >
          {retrainMsg}
        </div>
      )}

      {/* ── Top 3 stat cards ── */}
      <div className="grid grid-cols-3 gap-5 mb-5">

        {/* Cluster distribution */}
        <div className="card">
          <div className="section-title">Кластеры студентов</div>
          {data?.cluster_distribution && data.cluster_distribution.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={150}>
                <PieChart>
                  <Pie
                    data={data.cluster_distribution}
                    cx="50%" cy="50%"
                    innerRadius={38} outerRadius={65}
                    dataKey="value" paddingAngle={3}
                  >
                    {data.cluster_distribution.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      fontSize: 11, borderRadius: 10,
                      border: '1px solid #f1f5f9',
                      boxShadow: '0 4px 16px rgb(0 0 0/0.08)',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 mt-3">
                {data.cluster_distribution.map((d, i) => (
                  <div key={d.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}
                      />
                      <span className="text-gray-600 truncate max-w-[130px]">{d.name}</span>
                    </div>
                    <span className="font-semibold text-gray-700 tabular-nums">{d.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-[150px] flex items-center justify-center text-gray-300 text-sm">
              Нет данных
            </div>
          )}
        </div>

        {/* Difficult modules */}
        <div className="card">
          <div className="section-title">Сложные темы</div>
          {data?.module_difficulty && data.module_difficulty.length > 0 ? (
            <div className="space-y-3.5">
              {data.module_difficulty.map((m, i) => (
                <div key={i}>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-gray-600 truncate max-w-[150px]">{m.module}</span>
                    <span className={`font-semibold flex-shrink-0 tabular-nums ${m.avg_score < 60 ? 'text-red-600' : 'text-amber-600'}`}>
                      {m.avg_score.toFixed(1)}%
                    </span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-1.5 rounded-full transition-all ${m.avg_score < 60 ? 'bg-red-400' : 'bg-amber-400'}`}
                      style={{ width: `${m.avg_score}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-[150px] flex items-center justify-center text-gray-300 text-sm">Нет данных</div>
          )}
        </div>

        {/* Summary + retrain */}
        <div className="card flex flex-col justify-between">
          <div>
            <div className="section-title">Сводка</div>
            <div className="stat-value mb-1">{data?.student_count ?? 0}</div>
            <div className="stat-label">Студентов в системе</div>
            <div className="mt-5 pt-4 border-t border-gray-100">
              <div className="text-xs text-gray-400 mb-1 font-medium uppercase tracking-wide">Курс</div>
              <div className="text-sm font-semibold text-gray-800">{data?.course.title_ru}</div>
            </div>
          </div>
          <button onClick={handleRetrain} disabled={retraining} className="btn-secondary w-full text-xs mt-5">
            Обновить ML-модели
          </button>
        </div>
      </div>

      {/* ── Risk over time ── */}
      <div className="card">
        <div className="section-title">Динамика группы риска (8 недель)</div>
        {data?.risk_over_time && data.risk_over_time.length > 0 ? (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={data.risk_over_time}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5" />
              <XAxis dataKey="week" tick={{ fontSize: 11, fill: '#9ca3af' }} />
              <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} />
              <Tooltip
                contentStyle={{
                  fontSize: 12, borderRadius: 10,
                  border: '1px solid #f1f5f9',
                  boxShadow: '0 4px 16px rgb(0 0 0/0.08)',
                }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line
                type="monotone" dataKey="at_risk" stroke="#ef4444" strokeWidth={2}
                dot={{ r: 3, fill: '#ef4444', strokeWidth: 0 }} name="В группе риска"
              />
              <Line
                type="monotone" dataKey="total" stroke="#d1d5db" strokeWidth={1.5}
                strokeDasharray="4 2" dot={false} name="Всего тестов"
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[220px] flex items-center justify-center text-gray-300 text-sm">Нет данных</div>
        )}
      </div>
    </div>
  )
}
