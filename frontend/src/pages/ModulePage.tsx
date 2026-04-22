import { useEffect, useState, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api } from '../api/client'
import { useAuthStore } from '../store/auth'
import type { Content } from '../api/client'

const TYPE_CONFIG: Record<string, { label: string; badgeClass: string }> = {
  video:    { label: 'Видео',      badgeClass: 'badge-blue'   },
  text:     { label: 'Текст',      badgeClass: 'badge-gray'   },
  diagram:  { label: 'Схема',      badgeClass: 'badge-green'  },
  exercise: { label: 'Упражнение', badgeClass: 'badge-yellow' },
  example:  { label: 'Пример',     badgeClass: 'badge-gray'   },
}

interface ModuleInfo {
  id: number
  title_ru: string
  title_kz: string
  difficulty: number
}

export default function ModulePage() {
  const { courseId, moduleId } = useParams<{ courseId: string; moduleId: string }>()
  const [module, setModule] = useState<ModuleInfo | null>(null)
  const [contents, setContents] = useState<Content[]>([])
  const [activeContent, setActiveContent] = useState<Content | null>(null)
  const [adaptedFor, setAdaptedFor] = useState<string | null>(null)
  const [loadScore, setLoadScore] = useState(0)
  const [loading, setLoading] = useState(true)
  const startTime = useRef(Date.now())
  const activeStartTime = useRef(Date.now())
  const {} = useAuthStore()

  useEffect(() => {
    const mid = parseInt(moduleId!)
    api.getContent(mid).then(data => {
      setModule(data.module as ModuleInfo)
      setContents(data.contents)
      setAdaptedFor(data.adapted_for)
      if (data.contents.length > 0) setActiveContent(data.contents[0])
      setLoading(false)
      api.logActivity({ course_id: parseInt(courseId!), module_id: mid, action: 'view' })
    }).catch(() => setLoading(false))
  }, [moduleId, courseId])

  useEffect(() => {
    const interval = setInterval(() => {
      const sessionMin = (Date.now() - startTime.current) / 60000
      setLoadScore(Math.min(100, sessionMin * 3.5))
    }, 30000)
    return () => clearInterval(interval)
  }, [])

  const handleContentSelect = (content: Content) => {
    if (activeContent) {
      const dur = Math.round((Date.now() - activeStartTime.current) / 1000)
      api.logActivity({
        course_id: parseInt(courseId!),
        module_id: parseInt(moduleId!),
        content_id: activeContent.id,
        action: 'complete',
        duration_seconds: dur,
      })
    }
    setActiveContent(content)
    activeStartTime.current = Date.now()
  }

  const loadColor = loadScore < 30 ? 'bg-green-400' : loadScore < 70 ? 'bg-primary-500' : 'bg-red-400'

  if (loading) return (
    <div className="flex items-center justify-center h-screen text-gray-400 text-sm">Загрузка...</div>
  )

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-100 flex flex-col flex-shrink-0">
        <div className="p-4 border-b border-gray-100">
          <Link to="/courses" className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1 mb-3">
            <span>←</span> Курсы
          </Link>
          <div className="text-sm font-semibold text-gray-900 leading-snug">{module?.title_ru}</div>
          <div className="text-xs text-gray-400 font-mono mt-0.5">{module?.title_kz}</div>
          {adaptedFor && (
            <div className="mt-2 text-xs text-primary-600 bg-primary-50 rounded-md px-2 py-1">
              Адаптировано: {adaptedFor}
            </div>
          )}
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-0.5 scrollbar-thin">
          {contents.map((c, idx) => {
            const tc = TYPE_CONFIG[c.type] ?? { label: c.type, badgeClass: 'badge-gray' }
            return (
              <button
                key={c.id}
                onClick={() => handleContentSelect(c)}
                className={`w-full text-left px-3 py-2.5 rounded-lg text-xs transition-colors ${
                  activeContent?.id === c.id ? 'bg-primary-50 text-primary-700' : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-gray-300 font-mono w-4 text-right flex-shrink-0">{idx + 1}</span>
                  <span className={`badge ${tc.badgeClass} text-[10px]`}>{tc.label}</span>
                </div>
                <div className="pl-6 font-medium leading-snug">{c.title}</div>
              </button>
            )
          })}
        </div>
        <div className="p-4 border-t border-gray-100">
          <Link to={`/quiz/${moduleId}`} className="btn-primary w-full text-center block text-xs py-2">
            Перейти к тесту
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 overflow-auto">
        {/* Load bar */}
        <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-6 py-2 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-400">Когнитивная нагрузка</span>
            <div className="flex items-center gap-2">
              <div className="w-20 h-1 bg-gray-100 rounded-full">
                <div className={`h-1 rounded-full transition-all ${loadColor}`} style={{ width: `${loadScore}%` }} />
              </div>
              <span className="text-xs text-gray-500">{loadScore.toFixed(0)}%</span>
            </div>
          </div>
          {loadScore > 70 && (
            <div className="text-xs text-red-600 font-medium">Рекомендуем сделать перерыв</div>
          )}
        </div>

        <div className="p-8 max-w-3xl mx-auto">
          {activeContent ? (
            <>
              <div className="flex items-center gap-3 mb-6">
                <span className={`badge ${TYPE_CONFIG[activeContent.type]?.badgeClass ?? 'badge-gray'}`}>
                  {TYPE_CONFIG[activeContent.type]?.label ?? activeContent.type}
                </span>
                <h1 className="text-xl font-bold text-gray-900">{activeContent.title}</h1>
              </div>
              <div className="text-gray-700 leading-relaxed whitespace-pre-wrap text-sm bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
                {activeContent.body}
              </div>
            </>
          ) : (
            <div className="text-gray-400 text-sm">Выберите материал из списка слева</div>
          )}
        </div>
      </div>
    </div>
  )
}
