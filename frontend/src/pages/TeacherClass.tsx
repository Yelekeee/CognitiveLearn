import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import type { ClassOverview } from '../api/client'

const RISK_BADGE: Record<string, string> = {
  high: 'badge-red', medium: 'badge-yellow', low: 'badge-green',
}
const RISK_LABEL: Record<string, string> = {
  high: 'Высокий', medium: 'Средний', low: 'Норма',
}
const STYLE_LABELS: Record<string, string> = {
  visual: 'Визуал', auditory: 'Аудиал', kinesthetic: 'Кинестет', reading: 'Читатель', '—': '—',
}

export default function TeacherClass() {
  const [data, setData] = useState<ClassOverview | null>(null)
  const [loading, setLoading] = useState(true)
  const [filterRisk, setFilterRisk] = useState('all')
  const [filterCluster, setFilterCluster] = useState('all')
  const [search, setSearch] = useState('')

  useEffect(() => {
    api.getClassOverview().then(setData).catch(() => null).finally(() => setLoading(false))
  }, [])

  const clusters = data ? Array.from(new Set(data.students.map(s => s.cluster))) : []

  const filtered = (data?.students ?? []).filter(s => {
    if (filterRisk !== 'all' && s.risk_level !== filterRisk) return false
    if (filterCluster !== 'all' && s.cluster !== filterCluster) return false
    if (search) {
      const q = search.toLowerCase()
      if (!s.name.toLowerCase().includes(q) && !s.email.toLowerCase().includes(q)) return false
    }
    return true
  })

  const stats = {
    total: data?.total ?? 0,
    high: (data?.students ?? []).filter(s => s.risk_level === 'high').length,
    medium: (data?.students ?? []).filter(s => s.risk_level === 'medium').length,
    low: (data?.students ?? []).filter(s => s.risk_level === 'low').length,
  }

  if (loading) return (
    <div className="flex items-center justify-center h-screen">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-primary-200 border-t-primary-500 rounded-full animate-spin" />
        <div className="text-gray-400 text-sm">Загрузка...</div>
      </div>
    </div>
  )

  return (
    <div className="p-7">
      <div className="flex items-center justify-between mb-7">
        <div>
          <h1 className="text-[22px] font-bold text-gray-900 tracking-tight">Обзор класса</h1>
          <p className="text-gray-500 text-sm mt-0.5">{stats.total} студентов · {stats.high} в группе риска</p>
        </div>
        <Link to="/teacher/analytics" className="btn-secondary text-sm">Аналитика курсов</Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="card"><div className="stat-value">{stats.total}</div><div className="stat-label">Всего студентов</div></div>
        <div className="card"><div className="stat-value text-red-600">{stats.high}</div><div className="stat-label">Высокий риск</div></div>
        <div className="card"><div className="stat-value text-amber-600">{stats.medium}</div><div className="stat-label">Средний риск</div></div>
        <div className="card"><div className="stat-value text-emerald-600">{stats.low}</div><div className="stat-label">Норма</div></div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <input
          className="input max-w-xs"
          placeholder="Поиск студента..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select className="input w-44" value={filterRisk} onChange={e => setFilterRisk(e.target.value)}>
          <option value="all">Все риски</option>
          <option value="high">Высокий риск</option>
          <option value="medium">Средний риск</option>
          <option value="low">Норма</option>
        </select>
        <select className="input w-56" value={filterCluster} onChange={e => setFilterCluster(e.target.value)}>
          <option value="all">Все кластеры</option>
          {clusters.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-100 rounded-xl overflow-hidden" style={{ boxShadow: 'var(--card-shadow)' }}>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              {['Студент', 'ML-кластер', 'Риск', 'Стиль', 'Балл', 'Нагрузка', 'Активность'].map(h => (
                <th key={h} className={`px-4 py-3 text-xs font-medium text-gray-500 ${h === 'Балл' || h === 'Нагрузка' ? 'text-right' : 'text-left'}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.map(student => (
              <tr key={student.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3">
                  <div className="font-medium text-gray-900 text-sm">{student.name}</div>
                  <div className="text-xs text-gray-400">{student.email}</div>
                </td>
                <td className="px-4 py-3 max-w-[180px]">
                  <span className="text-xs text-gray-600 leading-relaxed">{student.cluster}</span>
                </td>
                <td className="px-4 py-3">
                  <span className={`badge ${RISK_BADGE[student.risk_level] ?? 'badge-gray'}`}>
                    {RISK_LABEL[student.risk_level] ?? student.risk_level}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-xs text-gray-600">{STYLE_LABELS[student.learning_style] ?? student.learning_style}</span>
                </td>
                <td className="px-4 py-3 text-right">
                  <span className={`text-sm font-semibold ${
                    student.avg_score >= 75 ? 'text-green-600' :
                    student.avg_score >= 60 ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {student.avg_score.toFixed(1)}%
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <div className="w-14 h-1.5 bg-gray-100 rounded-full">
                      <div
                        className={`h-1.5 rounded-full ${
                          student.avg_load > 70 ? 'bg-red-400' :
                          student.avg_load > 40 ? 'bg-yellow-400' : 'bg-green-400'
                        }`}
                        style={{ width: `${student.avg_load}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-400">{student.avg_load.toFixed(0)}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-xs text-gray-400">
                  {student.last_active
                    ? new Date(student.last_active).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
                    : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="py-12 text-center text-gray-300 text-sm">Студенты не найдены</div>
        )}
      </div>
    </div>
  )
}
