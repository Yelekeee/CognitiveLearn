import { useEffect, useState, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api } from '../api/client'
import type { QuizData, QuizResult, QuizResponse } from '../api/client'

export default function QuizPage() {
  const { moduleId } = useParams<{ moduleId: string }>()
  const [quiz, setQuiz] = useState<QuizData | null>(null)
  const [currentQ, setCurrentQ] = useState(0)
  const [selected, setSelected] = useState<string | null>(null)
  const [responses, setResponses] = useState<QuizResponse[]>([])
  const [result, setResult] = useState<QuizResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const qStart = useRef(Date.now())

  useEffect(() => {
    api.getQuiz(parseInt(moduleId!))
      .then(data => { setQuiz(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [moduleId])

  useEffect(() => {
    const interval = setInterval(() => setElapsed(Math.floor((Date.now() - qStart.current) / 1000)), 200)
    return () => clearInterval(interval)
  }, [currentQ])

  useEffect(() => { qStart.current = Date.now(); setElapsed(0) }, [currentQ])

  const handleNext = () => {
    if (!selected || !quiz) return
    const resp: QuizResponse = {
      question_id: quiz.questions[currentQ].id,
      answer: selected,
      time_ms: Date.now() - qStart.current,
    }
    const newResponses = [...responses, resp]
    setResponses(newResponses)
    setSelected(null)
    if (currentQ + 1 < quiz.questions.length) {
      setCurrentQ(currentQ + 1)
    } else {
      submitQuiz(newResponses)
    }
  }

  const submitQuiz = async (finalResponses: QuizResponse[]) => {
    if (!quiz) return
    setSubmitting(true)
    try {
      const data = await api.submitQuiz(quiz.quiz_id, finalResponses)
      setResult(data)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <div className="flex items-center justify-center h-screen text-gray-400 text-sm">Загрузка теста...</div>
  if (submitting) return <div className="flex items-center justify-center h-screen text-gray-400 text-sm">Обработка результатов...</div>

  if (result) {
    const LOAD_BADGE: Record<string, string> = { low: 'badge-green', optimal: 'badge-blue', high: 'badge-red' }
    const LOAD_LABEL: Record<string, string> = { low: 'Низкая', optimal: 'Оптимальная', high: 'Высокая' }
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <h1 className="text-xl font-bold text-gray-900 mb-6">Результаты теста</h1>
        <div className="card mb-4">
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="text-4xl font-bold text-gray-900">{result.score.toFixed(1)}%</div>
              <div className="text-gray-500 text-sm mt-1">{result.correct} из {result.total} верных</div>
            </div>
            <div className="text-right">
              <div className={`${LOAD_BADGE[result.cognitive_load.load_level] ?? 'badge-gray'} badge mb-1 inline-flex`}>
                {LOAD_LABEL[result.cognitive_load.load_level] ?? result.cognitive_load.load_level} нагрузка
              </div>
              <div className="text-xs text-gray-400 mt-0.5">
                Балл нагрузки: {result.cognitive_load.load_score.toFixed(0)}/100
              </div>
            </div>
          </div>
          <div className="h-2 bg-gray-100 rounded-full mb-4">
            <div
              className={`h-2 rounded-full ${result.score >= 75 ? 'bg-green-500' : result.score >= 60 ? 'bg-yellow-400' : 'bg-red-400'}`}
              style={{ width: `${result.score}%` }}
            />
          </div>
          <p className="text-sm text-gray-600">{result.feedback}</p>
        </div>

        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-4">
          <p className="text-sm text-blue-700">{result.cognitive_load.recommendation}</p>
        </div>

        {result.remedial_recommended && (
          <div className="bg-orange-50 border border-orange-100 rounded-xl p-4 mb-4">
            <p className="text-sm text-orange-700 font-medium mb-2">Рекомендовано повторение материала</p>
            <Link to={`/course/1/module/${moduleId}`} className="text-sm text-orange-600 underline">
              Вернуться к материалу модуля
            </Link>
          </div>
        )}

        <div className="flex gap-3">
          <Link to="/courses" className="btn-secondary flex-1 text-center">К курсам</Link>
          <button
            onClick={() => { setResult(null); setCurrentQ(0); setResponses([]); setSelected(null) }}
            className="btn-primary flex-1"
          >
            Пройти снова
          </button>
        </div>
      </div>
    )
  }

  if (!quiz || quiz.questions.length === 0) return (
    <div className="flex items-center justify-center h-screen">
      <div className="card text-center max-w-sm">
        <p className="text-gray-500 text-sm mb-4">Тест для этого модуля не найден</p>
        <Link to="/courses" className="btn-secondary">К курсам</Link>
      </div>
    </div>
  )

  const q = quiz.questions[currentQ]
  const progress = (currentQ / quiz.questions.length) * 100

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-gray-500">Вопрос {currentQ + 1} / {quiz.questions.length}</span>
          <div className="flex items-center gap-3">
            <span className="text-xs badge badge-gray">Уровень {quiz.difficulty}</span>
            <span className={`text-sm font-mono font-medium ${elapsed > 20 ? 'text-red-500' : 'text-gray-400'}`}>
              {elapsed}с
            </span>
          </div>
        </div>
        <div className="h-1.5 bg-gray-100 rounded-full">
          <div className="h-1.5 bg-primary-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <span className="badge badge-gray text-xs">Блум {q.bloom_level}</span>
        </div>
        <p className="text-gray-900 font-medium text-base mb-1">{q.text_ru}</p>
        <p className="text-gray-400 text-sm font-mono mb-6">{q.text_kz}</p>

        <div className="space-y-2">
          {q.options.map(opt => (
            <button
              key={opt}
              onClick={() => setSelected(opt)}
              className={`w-full text-left px-4 py-3 rounded-lg border text-sm transition-all ${
                selected === opt
                  ? 'border-primary-500 bg-primary-50 text-primary-700'
                  : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50 text-gray-700'
              }`}
            >
              {opt}
            </button>
          ))}
        </div>

        <button onClick={handleNext} disabled={!selected} className="btn-primary w-full mt-6 py-2.5">
          {currentQ + 1 < quiz.questions.length ? 'Следующий вопрос' : 'Завершить тест'}
        </button>
      </div>
    </div>
  )
}
