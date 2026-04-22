import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import type { LearningPathData } from '../api/client'

const STATUS_CONFIG = {
  completed: { label: 'Завершен',   dot: 'bg-green-400',   ring: 'border-green-200', badge: 'badge-green' },
  current:   { label: 'В процессе', dot: 'bg-primary-500', ring: 'border-primary-200', badge: 'badge-blue' },
  upcoming:  { label: 'Предстоит',  dot: 'bg-gray-200',    ring: 'border-gray-200', badge: 'badge-gray' },
}

const RISK_BADGE: Record<string, string> = {
  high: 'badge-red', medium: 'badge-yellow', low: 'badge-green',
}

export default function LearningPath() {
  const [data, setData] = useState<LearningPathData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.getLearningPath().then(setData).catch(() => null).finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center h-screen text-gray-400 text-sm">Загрузка...</div>
  )
  if (!data) return null

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900">Путь обучения</h1>
        <div className="flex gap-4">
          {Object.entries(STATUS_CONFIG).map(([status, cfg]) => (
            <div key={status} className="flex items-center gap-1.5 text-xs text-gray-500">
              <div className={`w-2 h-2 rounded-full ${cfg.dot}`} />
              {cfg.label}
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-8">
        {data.learning_path.map(course => (
          <div key={course.course_id}>
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-3">
              <span>{course.course_title_ru}</span>
              <span className="text-gray-200 font-normal font-mono">{course.course_title_kz}</span>
            </h2>

            <div className="relative pl-6">
              <div className="absolute left-[7px] top-2 bottom-2 w-px bg-gray-100" />
              <div className="space-y-3">
                {course.modules.map(module => {
                  const cfg = STATUS_CONFIG[module.status] ?? STATUS_CONFIG.upcoming
                  return (
                    <div key={module.id} className="relative">
                      <div className={`absolute -left-[19px] top-4 w-3 h-3 rounded-full border-2 bg-white ${cfg.ring}`}>
                        <div className={`w-1.5 h-1.5 rounded-full m-0.5 ${cfg.dot}`} />
                      </div>
                      <div className={`bg-white border rounded-xl px-5 py-4 shadow-sm ${module.status === 'current' ? 'border-primary-200' : 'border-gray-100'}`}>
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="text-xs font-mono text-gray-300">{module.order_num}.</span>
                              <span className="text-sm font-semibold text-gray-900">{module.title_ru}</span>
                            </div>
                            <div className="text-xs text-gray-400 font-mono mb-2">{module.title_kz}</div>

                            <div className="flex flex-wrap gap-2">
                              <span className={`badge text-xs ${RISK_BADGE[module.risk_level] ?? 'badge-gray'}`}>
                                {module.risk_level === 'high' ? 'Риск' : module.risk_level === 'medium' ? 'Внимание' : 'Норма'}
                              </span>
                              <span className="text-xs text-gray-400">Уровень {module.difficulty}</span>
                              {module.best_score !== null && (
                                <span className="text-xs text-gray-500">
                                  Лучший: <strong>{module.best_score}%</strong>
                                </span>
                              )}
                            </div>

                            {module.skip_topics.length > 0 && (
                              <div className="mt-1.5 text-xs">
                                <span className="text-green-600 font-medium">Усвоено: </span>
                                <span className="text-gray-500">{module.skip_topics.join(', ')}</span>
                              </div>
                            )}
                            {module.add_topics.length > 0 && (
                              <div className="mt-1 text-xs">
                                <span className="text-orange-600 font-medium">Дополнительно: </span>
                                <span className="text-gray-500">{module.add_topics.join(', ')}</span>
                              </div>
                            )}
                          </div>

                          {module.status !== 'upcoming' && (
                            <div className="flex gap-2 flex-shrink-0">
                              <Link to={`/course/${course.course_id}/module/${module.id}`} className="btn-secondary text-xs py-1.5 px-3">
                                Материал
                              </Link>
                              <Link to={`/quiz/${module.id}`} className="btn-primary text-xs py-1.5 px-3">
                                Тест
                              </Link>
                            </div>
                          )}
                        </div>

                        {module.status === 'current' && (
                          <div className="mt-3">
                            <div className="h-1 bg-gray-100 rounded-full">
                              <div className="h-1 bg-primary-500 rounded-full" style={{ width: `${module.progress}%` }} />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
