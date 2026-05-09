import { useState, useMemo } from 'react'
import ToolLayout from '../components/ToolLayout'

const FLAGS = ['g', 'i', 'm', 's'] as const
const escHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

export default function RegexTester() {
  const [pattern, setPattern] = useState('')
  const [flags, setFlags] = useState<Set<string>>(new Set(['g']))
  const [testStr, setTestStr] = useState('The quick brown fox jumps over the lazy dog.\nFox is clever.')
  const [replace, setReplace] = useState('')
  const [showReplace, setShowReplace] = useState(false)

  const toggleFlag = (f: string) => {
    setFlags(prev => {
      const next = new Set(prev)
      next.has(f) ? next.delete(f) : next.add(f)
      return next
    })
  }

  const { matches, highlighted, error, replaced } = useMemo(() => {
    if (!pattern) return { matches: [], highlighted: escHtml(testStr), error: '', replaced: '' }
    try {
      const ms: RegExpMatchArray[] = []
      const flagStr = [...flags].join('')
      const globalFlagStr = flagStr.includes('g') ? flagStr : flagStr + 'g'

      const globalRe = new RegExp(pattern, globalFlagStr)
      let m: RegExpExecArray | null
      while ((m = globalRe.exec(testStr)) !== null) {
        ms.push(m)
        if (m[0].length === 0) globalRe.lastIndex++ // prevent infinite loop on zero-length match
        if (!flags.has('g')) break
      }

      const parts: string[] = []
      let last = 0
      const allMatches = testStr.matchAll(new RegExp(pattern, globalFlagStr))
      let idx = 0
      for (const match of allMatches) {
        if (match.index === undefined) continue
        if (match.index > last) parts.push(escHtml(testStr.slice(last, match.index)))
        parts.push(`<mark class="bg-yellow-200 rounded px-0.5">${escHtml(match[0])}</mark>`)
        last = match.index + match[0].length
        idx++
        if (!flags.has('g') && idx >= 1) break
      }
      parts.push(escHtml(testStr.slice(last)))

      const replaced = showReplace ? testStr.replace(new RegExp(pattern, [...flags].join('')), replace) : ''

      return { matches: ms, highlighted: parts.join(''), error: '', replaced }
    } catch (e) {
      return { matches: [], highlighted: escHtml(testStr), error: (e as Error).message, replaced: '' }
    }
  }, [pattern, flags, testStr, replace, showReplace])

  return (
    <ToolLayout title="Regex Tester" description="Test regular expressions with live match highlighting.">
      <div className="space-y-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
          <div>
            <label className="label">Pattern</label>
            <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden bg-white focus-within:ring-2 focus-within:ring-blue-500">
              <span className="px-3 py-2 text-slate-400 bg-slate-50 border-r border-slate-200 font-mono text-sm">/</span>
              <input
                type="text"
                value={pattern}
                onChange={e => setPattern(e.target.value)}
                placeholder="[a-z]+"
                className="flex-1 px-3 py-2 text-sm font-mono focus:outline-none"
                spellCheck={false}
              />
              <span className="px-3 py-2 text-slate-400 bg-slate-50 border-l border-slate-200 font-mono text-sm">/{[...flags].join('')}</span>
            </div>
          </div>

          <div className="flex gap-2 flex-wrap">
            {FLAGS.map(f => (
              <button
                key={f}
                onClick={() => toggleFlag(f)}
                title={{ g: 'Global', i: 'Ignore case', m: 'Multiline', s: 'Dotall' }[f]}
                className={`btn-toggle font-mono ${flags.has(f) ? 'btn-toggle-active' : ''}`}
              >
                {f}
              </button>
            ))}
            <button onClick={() => setShowReplace(s => !s)} className={showReplace ? 'btn-toggle btn-toggle-active' : 'btn-toggle'}>Replace</button>
          </div>

          {showReplace && (
            <div>
              <label className="label">Replace with</label>
              <input value={replace} onChange={e => setReplace(e.target.value)} placeholder="replacement text ($1 for groups)" className="tool-input font-mono" />
            </div>
          )}
        </div>

        {error && <div className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg p-3">✗ {error}</div>}

        <div>
          <label className="label">Test string</label>
          <textarea
            value={testStr}
            onChange={e => setTestStr(e.target.value)}
            className="tool-textarea h-36"
            spellCheck={false}
          />
        </div>

        {pattern && !error && (
          <div>
            <div className="flex items-center gap-3 mb-2">
              <label className="label mb-0">Matches</label>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${matches.length > 0 ? 'bg-green-100 text-emerald-400' : 'bg-slate-100 text-slate-500'}`}>
                {matches.length} match{matches.length !== 1 ? 'es' : ''}
              </span>
            </div>
            <div
              className="bg-white border border-slate-200 rounded-lg p-3 text-sm font-mono whitespace-pre-wrap leading-relaxed"
              dangerouslySetInnerHTML={{ __html: highlighted }}
            />
          </div>
        )}

        {showReplace && replaced && (
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="label">Result</label>
              <button onClick={() => navigator.clipboard.writeText(replaced)} className="copy-btn">Copy</button>
            </div>
            <div className="bg-white border border-slate-200 rounded-lg p-3 text-sm font-mono whitespace-pre-wrap">{replaced}</div>
          </div>
        )}
      </div>
    </ToolLayout>
  )
}
