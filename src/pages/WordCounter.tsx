import { useState, useMemo } from 'react'
import ToolLayout from '../components/ToolLayout'

export default function WordCounter() {
  const [text, setText] = useState('')

  const stats = useMemo(() => {
    const words = text.trim() === '' ? 0 : text.trim().split(/\s+/).length
    const chars = text.length
    const charsNoSpaces = text.replace(/\s/g, '').length
    const sentences = text.trim() === '' ? 0 : (text.match(/[.!?]+/g) ?? []).length
    const paragraphs = text.trim() === '' ? 0 : text.trim().split(/\n\s*\n/).filter(Boolean).length || (text.trim() ? 1 : 0)
    const readingTime = Math.max(1, Math.ceil(words / 238))
    const lines = text === '' ? 0 : text.split('\n').length
    return { words, chars, charsNoSpaces, sentences, paragraphs, readingTime, lines }
  }, [text])

  const cards = [
    { label: 'Words', value: stats.words },
    { label: 'Characters', value: stats.chars },
    { label: 'Chars (no spaces)', value: stats.charsNoSpaces },
    { label: 'Sentences', value: stats.sentences },
    { label: 'Paragraphs', value: stats.paragraphs },
    { label: 'Lines', value: stats.lines },
    { label: 'Reading time', value: `~${stats.readingTime} min` },
  ]

  return (
    <ToolLayout title="Word Counter" description="Count words, characters, sentences and estimate reading time.">
      <div className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {cards.map(c => (
            <div key={c.label} className="bg-white border border-slate-200 rounded-xl p-3 text-center">
              <div className="text-xl font-bold text-blue-600">{c.value}</div>
              <div className="text-xs text-slate-500 mt-0.5">{c.label}</div>
            </div>
          ))}
        </div>

        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Start typing or paste your text here…"
          className="tool-textarea h-80"
        />

        {text && (
          <div className="flex gap-2">
            <button onClick={() => setText('')} className="btn-secondary">Clear</button>
            <button onClick={() => navigator.clipboard.writeText(text)} className="btn-secondary">Copy</button>
          </div>
        )}
      </div>
    </ToolLayout>
  )
}
