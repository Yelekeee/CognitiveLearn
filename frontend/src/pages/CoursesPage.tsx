import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import type { Course } from '../api/client'

interface ModuleInfo {
  id: number
  title_ru: string
  title_kz: string
  difficulty: number
  progress: number
  total_contents: number
  completed_contents: number
}

const DIFF_COLORS = ['', 'bg-green-100 text-green-700', 'bg-teal-100 text-teal-700', 'bg-blue-100 text-blue-700', 'bg-orange-100 text-orange-700', 'bg-red-100 text-red-700']

export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<number | null>(null)
  const [modules, setModules] = useState<Record<number, ModuleInfo[]>>({})
  const [loadingModules, setLoadingModules] = useState<Set<number>>(new Set())

  useEffect(() => {
    api.getCourses()
      .then(data => setCourses(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const toggleCourse = async (id: number) => {
    if (expanded === id) { setExpanded(null); return }
    setExpanded(id)
    if (!modules[id]) {
      setLoadingModules(prev => new Set([...prev, id]))
      const data = await api.getModules(id).catch(() => null)
      if (data) setModules(prev => ({ ...prev, [id]: data.modules as ModuleInfo[] }))
      setLoadingModules(prev => { const s = new Set(prev); s.delete(id); return s })
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-screen text-gray-400 text-sm">Загрузка...</div>
  )

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <h1 className="text-[22px] font-bold text-gray-900 tracking-tight mb-5">Курсы</h1>
      <div className="space-y-3">
        {courses.map(course => (
          <div key={course.id} className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
            <button
              className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50 transition-colors"
              onClick={() => toggleCourse(course.id)}
            >
              <div>
                <div className="font-semibold text-gray-900 text-sm">{course.title_ru}</div>
                <div className="text-xs text-gray-400 mt-0.5 font-mono">{course.title_kz}</div>
                {course.description && (
                  <div className="text-xs text-gray-400 mt-1">{course.description}</div>
                )}
              </div>
              <svg className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${expanded === course.id ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {expanded === course.id && (
              <div className="border-t border-gray-50 px-5 pb-4 pt-3">
                {loadingModules.has(course.id) ? (
                  <div className="text-gray-400 text-sm py-4">Загрузка модулей...</div>
                ) : (
                  <div className="space-y-2">
                    {(modules[course.id] || []).map((module, idx) => (
                      <div key={module.id} className="flex items-center gap-4 py-2.5 border-b border-gray-50 last:border-0">
                        <span className="text-xs font-mono text-gray-300 w-5 text-right flex-shrink-0">{idx + 1}</span>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-gray-800 font-medium truncate">{module.title_ru}</div>
                          <div className="flex items-center gap-2 mt-1.5">
                            <div className="h-1 w-24 bg-gray-100 rounded-full">
                              <div className="h-1 bg-primary-500 rounded-full" style={{ width: `${module.progress || 0}%` }} />
                            </div>
                            <span className="text-xs text-gray-400">{(module.progress || 0).toFixed(0)}%</span>
                          </div>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${DIFF_COLORS[module.difficulty] || 'bg-gray-100 text-gray-500'}`}>
                          Ур. {module.difficulty}
                        </span>
                        <div className="flex gap-2 flex-shrink-0">
                          <Link to={`/course/${course.id}/module/${module.id}`} className="btn-secondary text-xs py-1.5 px-3">
                            Изучить
                          </Link>
                          <Link to={`/quiz/${module.id}`} className="btn-primary text-xs py-1.5 px-3">
                            Тест
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
