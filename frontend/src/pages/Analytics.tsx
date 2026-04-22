import { useEffect, useState } from 'react'
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { api } from '../api/client'
import type { AnalyticsData } from '../api/client'

export default function Analytics() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.getAnalytics().then(setData).catch(() => null).finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center h-screen text-gray-400 text-sm">Загрузка аналитики...</div>
  )
  if (!data) return null

  const diff = data.student_avg - data.class_avg

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      <h1 className="text-[22px] font-bold text-gray-900 tracking-tight mb-6">Моя аналитика</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-5">
        <div className="card">
          <div className="stat-value">{data.student_avg.toFixed(1)}%</div>
          <div className="stat-label">Мой средний балл</div>
        </div>
        <div className="card">
          <div className="stat-value">{data.class_avg.toFixed(1)}%</div>
          <div className="stat-label">Среднее по классу</div>
        </div>
        <div className="card">
          <div className="stat-value">{data.total_sessions}</div>
          <div className="stat-label">Учебных сессий</div>
        </div>
        <div className="card">
          <div className="stat-value">{data.total_quizzes}</div>
          <div className="stat-label">Тестов пройдено</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-5">
        {/* Score trend */}
        <div className="card">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Баллы за 8 недель</h3>
          {data.score_trend.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={data.score_trend}>
                <defs>
                  <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f6ef7" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#4f6ef7" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5" />
                <XAxis dataKey="week" tick={{ fontSize: 11, fill: '#9ca3af' }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#9ca3af' }} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }} />
                <Area type="monotone" dataKey="score" stroke="#4f6ef7" fill="url(#scoreGrad)" strokeWidth={2} name="Балл" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-gray-300 text-sm">Нет данных</div>
          )}
        </div>

        {/* Load trend */}
        <div className="card">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Когнитивная нагрузка</h3>
          {data.load_trend.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={data.load_trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5" />
                <XAxis dataKey="week" tick={{ fontSize: 11, fill: '#9ca3af' }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#9ca3af' }} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }} />
                <Line type="monotone" dataKey="load" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} name="Нагрузка" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-gray-300 text-sm">Нет данных</div>
          )}
        </div>
      </div>

      {/* Survey history */}
      <div className="card mb-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">История еженедельных опросов</h3>
        {data.survey_history.length > 0 ? (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data.survey_history}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5" />
              <XAxis dataKey="week" tick={{ fontSize: 11, fill: '#9ca3af' }} />
              <YAxis domain={[0, 5]} tick={{ fontSize: 11, fill: '#9ca3af' }} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="motivation" fill="#4f6ef7" name="Мотивация" radius={[3, 3, 0, 0]} maxBarSize={20} />
              <Bar dataKey="engagement" fill="#22c55e" name="Вовлеченность" radius={[3, 3, 0, 0]} maxBarSize={20} />
              <Bar dataKey="stress" fill="#ef4444" name="Стресс" radius={[3, 3, 0, 0]} maxBarSize={20} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[200px] flex items-center justify-center text-gray-300 text-sm">
            Пройдите еженедельный опрос
          </div>
        )}
      </div>

      {/* Comparison */}
      <div className="card">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Вы vs Класс (анонимно)</h3>
        <div className="space-y-3 mb-3">
          <div>
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>Мой средний балл</span>
              <span className="font-medium">{data.student_avg.toFixed(1)}%</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full">
              <div className="h-2 bg-primary-500 rounded-full" style={{ width: `${data.student_avg}%` }} />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>Среднее по классу</span>
              <span className="font-medium">{data.class_avg.toFixed(1)}%</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full">
              <div className="h-2 bg-gray-300 rounded-full" style={{ width: `${data.class_avg}%` }} />
            </div>
          </div>
        </div>
        <div className={`text-sm font-medium ${diff >= 0 ? 'text-green-600' : 'text-orange-600'}`}>
          {diff >= 0
            ? `Вы выше среднего на ${diff.toFixed(1)}%`
            : `Вы ниже среднего на ${Math.abs(diff).toFixed(1)}%`}
        </div>
      </div>
    </div>
  )
}
