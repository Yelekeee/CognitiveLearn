import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import { useAuthStore } from '../store/auth'
import type { CognitiveQuestion } from '../api/client'

type Step = 'test' | 'survey' | 'result'

interface QuestionResponse {
  question_id: number
  question_type: string
  answer: string
  is_correct: boolean
  time_ms: number
}

interface ProfileResult {
  learning_style: string
  cognitive_load: string
  processing_speed: number
  memory_score: number
  bloom_level: number
}

const STYLE_LABELS: Record<string, string> = {
  visual: 'Визуальный',
  auditory: 'Аудиальный',
  kinesthetic: 'Кинестетический',
  reading: 'Чтение/Письмо',
}

const STYLE_DESCRIPTIONS: Record<string, string> = {
  visual: 'Вы лучше усваиваете информацию через диаграммы, схемы и визуальные материалы.',
  auditory: 'Вы лучше воспринимаете информацию через звук и обсуждение.',
  kinesthetic: 'Вы лучше учитесь через практику и интерактивные задания.',
  reading: 'Вы лучше усваиваете материал через чтение и письмо.',
}

export default function Onboarding() {
  const [step, setStep] = useState<Step>('test')
  const [questions, setQuestions] = useState<CognitiveQuestion[]>([])
  const [currentQ, setCurrentQ] = useState(0)
  const [responses, setResponses] = useState<QuestionResponse[]>([])
  const [qStartTime, setQStartTime] = useState(Date.now())
  const [selected, setSelected] = useState<string | null>(null)
  const [survey, setSurvey] = useState({ motivation: 3, engagement: 3, stress: 3, interest: 3, difficulty: 3 })
  const [profileResult, setProfileResult] = useState<ProfileResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [started, setStarted] = useState(false)
  const {} = useAuthStore()
  const navigate = useNavigate()

  const loadQuestions = async () => {
    setLoading(true)
    try {
      const data = await api.getCognitiveQuestions()
      setQuestions(data.questions)
      setStarted(true)
      setQStartTime(Date.now())
    } finally {
      setLoading(false)
    }
  }

  const handleAnswer = () => {
    if (!selected || !questions[currentQ]) return
    const q = questions[currentQ]
    const elapsed = Date.now() - qStartTime
    const resp: QuestionResponse = {
      question_id: q.id,
      question_type: q.type,
      answer: selected,
      is_correct: selected === q.correct,
      time_ms: elapsed,
    }
    const newResponses = [...responses, resp]
    setResponses(newResponses)
    setSelected(null)

    if (currentQ + 1 < questions.length) {
      setCurrentQ(currentQ + 1)
      setQStartTime(Date.now())
    } else {
      submitTest(newResponses)
    }
  }

  const submitTest = async (finalResponses: QuestionResponse[]) => {
    setLoading(true)
    try {
      const data = await api.submitCognitiveTest(finalResponses) as { profile: ProfileResult }
      setProfileResult(data.profile)
      setStep('survey')
    } finally {
      setLoading(false)
    }
  }

  const submitSurvey = async () => {
    setLoading(true)
    try {
      await api.submitSurvey(survey)
      setStep('result')
    } finally {
      setLoading(false)
    }
  }

  if (step === 'test') {
    if (!started) {
      return (
        <div className="min-h-screen bg-surface flex items-center justify-center p-6">
          <div className="max-w-md w-full card text-center">
            <div className="w-12 h-12 bg-primary-50 rounded-2xl mx-auto mb-4 flex items-center justify-center">
              <span className="text-primary-500 text-2xl font-mono">?</span>
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Когнитивная диагностика</h1>
            <p className="text-gray-500 text-sm mb-6 leading-relaxed">
              20 вопросов для определения вашего стиля обучения. Каждый вопрос имеет таймер — отвечайте быстро и честно. Займет около 5-7 минут.
            </p>
            <div className="grid grid-cols-2 gap-3 mb-6 text-xs text-gray-600">
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="font-medium text-gray-800 mb-0.5">20 вопросов</div>
                <div>Память, паттерны, скорость обработки</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="font-medium text-gray-800 mb-0.5">5-7 минут</div>
                <div>Раз в месяц для обновления профиля</div>
              </div>
            </div>
            <button onClick={loadQuestions} disabled={loading} className="btn-primary w-full py-3">
              {loading ? 'Загрузка...' : 'Начать диагностику'}
            </button>
          </div>
        </div>
      )
    }

    const q = questions[currentQ]
    const progress = ((currentQ) / questions.length) * 100

    return (
      <div className="min-h-screen bg-surface flex items-center justify-center p-6">
        <div className="max-w-lg w-full">
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-500">Вопрос {currentQ + 1} из {questions.length}</span>
              <span className="text-xs badge badge-gray">{q.type}</span>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full">
              <div className="h-1.5 bg-primary-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>

          <div className="card">
            <p className="text-gray-900 font-medium text-base mb-1">{q.text_ru}</p>
            <p className="text-gray-400 text-sm mb-6 font-mono">{q.text_kz}</p>

            <div className="space-y-2">
              {q.options.map((opt) => (
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

            <button
              onClick={handleAnswer}
              disabled={!selected}
              className="btn-primary w-full mt-6 py-2.5"
            >
              {currentQ + 1 < questions.length ? 'Далее' : 'Завершить'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (step === 'survey') {
    const sliders: { key: keyof typeof survey; label: string; low: string; high: string }[] = [
      { key: 'motivation', label: 'Мотивация', low: 'Низкая', high: 'Высокая' },
      { key: 'engagement', label: 'Вовлеченность', low: 'Пассивная', high: 'Активная' },
      { key: 'stress', label: 'Стресс', low: 'Нет', high: 'Высокий' },
      { key: 'interest', label: 'Интерес к учебе', low: 'Низкий', high: 'Высокий' },
      { key: 'difficulty', label: 'Сложность материала', low: 'Легко', high: 'Сложно' },
    ]

    return (
      <div className="min-h-screen bg-surface flex items-center justify-center p-6">
        <div className="max-w-md w-full card">
          <h2 className="text-lg font-bold text-gray-900 mb-1">Мотивационный опрос</h2>
          <p className="text-gray-500 text-sm mb-6">Оцените свое состояние по каждому параметру (1 — минимум, 5 — максимум)</p>

          <div className="space-y-5">
            {sliders.map(({ key, label, low, high }) => (
              <div key={key}>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700">{label}</span>
                  <span className="text-sm font-bold text-primary-600">{survey[key]}</span>
                </div>
                <input
                  type="range" min={1} max={5} step={1}
                  value={survey[key]}
                  onChange={e => setSurvey(s => ({ ...s, [key]: Number(e.target.value) }))}
                  className="w-full accent-primary-500"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>{low}</span><span>{high}</span>
                </div>
              </div>
            ))}
          </div>

          <button onClick={submitSurvey} disabled={loading} className="btn-primary w-full mt-8 py-2.5">
            {loading ? 'Сохранение...' : 'Завершить настройку'}
          </button>
        </div>
      </div>
    )
  }

  // Result step
  const style = profileResult?.learning_style || 'visual'

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-6">
      <div className="max-w-lg w-full">
        <div className="card text-center mb-4">
          <div className="inline-block bg-primary-50 rounded-2xl px-6 py-3 mb-4">
            <span className="text-primary-600 font-bold text-lg">{STYLE_LABELS[style] || style}</span>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Ваш когнитивный профиль</h2>
          <p className="text-gray-500 text-sm leading-relaxed mb-6">{STYLE_DESCRIPTIONS[style]}</p>

          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="bg-gray-50 rounded-xl p-3">
              <div className="text-2xl font-bold text-gray-900">{profileResult?.processing_speed.toFixed(0)}</div>
              <div className="text-xs text-gray-500 mt-0.5">Скорость</div>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <div className="text-2xl font-bold text-gray-900">{profileResult?.memory_score.toFixed(0)}</div>
              <div className="text-xs text-gray-500 mt-0.5">Память</div>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <div className="text-2xl font-bold text-gray-900">{profileResult?.bloom_level}/6</div>
              <div className="text-xs text-gray-500 mt-0.5">Блум</div>
            </div>
          </div>
        </div>

        <button onClick={() => navigate('/dashboard')} className="btn-primary w-full py-3 text-base">
          Перейти к обучению
        </button>
      </div>
    </div>
  )
}
