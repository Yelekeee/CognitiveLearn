import { useState, useRef, useEffect } from 'react'
import { api } from '../api/client'
import { useAuthStore } from '../store/auth'
import type { ChatMsg } from '../api/client'

const SUGGESTED_PROMPTS = [
  'Объясни мне эту тему с примерами',
  'Дай мне практическое упражнение',
  'Какие у меня слабые места?',
  'Как лучше готовиться к экзамену?',
  'Маған осы тақырыпты түсіндір',
  'Рекомендуй стратегию обучения',
]

const STYLE_LABELS: Record<string, string> = {
  visual: 'Визуальный', auditory: 'Аудиальный',
  kinesthetic: 'Кинестетический', reading: 'Читатель',
}

export default function AIAssistant() {
  const [messages, setMessages] = useState<ChatMsg[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [context, setContext] = useState<{ learning_style: string; cluster_label: string; avg_score: number } | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const { user } = useAuthStore()

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = async (text: string) => {
    if (!text.trim() || loading) return
    const userMsg: ChatMsg = { role: 'user', content: text }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)
    try {
      const data = await api.chat(user!.id, text, [...messages, userMsg])
      setMessages(prev => [...prev, { role: 'assistant', content: data.response }])
      if (data.student_context) setContext(data.student_context as typeof context)
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Произошла ошибка. Проверьте подключение к серверу.',
      }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex h-[calc(100vh-5rem)] md:h-screen overflow-hidden">

      {/* ── Desktop left sidebar ── */}
      <aside className="hidden md:flex w-64 bg-white border-r border-gray-100 flex-col flex-shrink-0 p-4">
        <h2 className="text-sm font-semibold text-gray-900 mb-1">ИИ-Ассистент</h2>
        <p className="text-xs text-gray-400 mb-5">На основе Claude. Знает ваш когнитивный профиль.</p>

        {context && (
          <div className="mb-5">
            <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2">Ваш профиль</div>
            <div className="bg-gray-50 rounded-xl p-3 space-y-2.5">
              <div>
                <div className="text-[10px] text-gray-400 mb-0.5">Стиль обучения</div>
                <div className="text-xs font-semibold text-gray-800">
                  {STYLE_LABELS[context.learning_style] ?? context.learning_style}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-gray-400 mb-0.5">ML-профиль</div>
                <div className="text-xs text-gray-600 leading-snug">{context.cluster_label}</div>
              </div>
              <div>
                <div className="text-[10px] text-gray-400 mb-0.5">Средний балл</div>
                <div className="text-xs font-semibold text-gray-800">{context.avg_score}%</div>
              </div>
            </div>
          </div>
        )}

        <div>
          <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2">Предложения</div>
          <div className="space-y-0.5">
            {SUGGESTED_PROMPTS.map(p => (
              <button
                key={p}
                onClick={() => send(p)}
                className="w-full text-left text-xs text-gray-600 hover:text-primary-600 hover:bg-primary-50 px-2.5 py-1.5 rounded-lg transition-colors leading-snug"
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      </aside>

      {/* ── Chat area ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="px-4 md:px-6 py-3 border-b border-gray-100 bg-white flex-shrink-0">
          <div className="text-sm font-semibold text-gray-900">CogniLearn Assistant</div>
          <div className="text-xs text-gray-400">Адаптированные объяснения на основе вашего когнитивного профиля</div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 md:px-6 py-4 space-y-4 scrollbar-thin">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center pb-10">
              <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center mb-3">
                <span className="text-gray-400 font-mono text-lg font-bold">AI</span>
              </div>
              <p className="text-sm text-gray-500 mb-1">Задайте вопрос по учебному материалу</p>
              <p className="text-xs text-gray-300">Ответы адаптированы под ваш стиль обучения</p>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[85%] md:max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-primary-500 text-white rounded-tr-sm'
                    : 'bg-white border border-gray-100 text-gray-700 rounded-tl-sm shadow-sm'
                }`}
              >
                <div className="whitespace-pre-wrap">{msg.content}</div>
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-white border border-gray-100 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
                <div className="flex gap-1.5 items-center">
                  {[0, 150, 300].map(delay => (
                    <span
                      key={delay}
                      className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce"
                      style={{ animationDelay: `${delay}ms` }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Mobile quick-prompt chips */}
        <div className="md:hidden px-4 pb-2 flex gap-2 overflow-x-auto scrollbar-thin flex-shrink-0">
          {SUGGESTED_PROMPTS.slice(0, 4).map(p => (
            <button
              key={p}
              onClick={() => send(p)}
              className="flex-shrink-0 text-xs text-primary-600 bg-primary-50 border border-primary-100 px-3 py-1.5 rounded-full whitespace-nowrap"
            >
              {p}
            </button>
          ))}
        </div>

        {/* Input */}
        <div className="p-3 md:p-4 border-t border-gray-100 bg-white flex-shrink-0">
          <div className="flex gap-2">
            <input
              className="input flex-1"
              placeholder="Задайте вопрос... / Сұрақ қойыңыз..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input) } }}
              disabled={loading}
            />
            <button
              onClick={() => send(input)}
              disabled={!input.trim() || loading}
              className="btn-primary px-4 md:px-5"
            >
              Отправить
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
