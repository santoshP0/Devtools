import { useState, useMemo } from 'react'
import ToolLayout from '../components/ToolLayout'

const FLAGS = ['g', 'i', 'm', 's'] as const
const escHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

export default function RegexTester() {
  const [pattern, setPattern] = useState('')
  const [flags, setFlags] = useState<Set<string>>(new Set(['g']))
  const [testStr, setTestStr] = useState('')
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
        if (m[0].length === 0) globalRe.lastIndex++
        if (!flags.has('g')) break
      }

      const parts: string[] = []
      let last = 0
      const allMatches = testStr.matchAll(new RegExp(pattern, globalFlagStr))
      let idx = 0
      for (const match of allMatches) {
        if (match.index === undefined) continue
        if (match.index > last) parts.push(escHtml(testStr.slice(last, match.index)))
        parts.push(`<mark style="background:oklch(0.85 0.18 85 / 0.28);color:oklch(0.96 0.14 80);border-radius:3px;padding:0 3px;outline:1px solid oklch(0.80 0.16 80 / 0.45);">${escHtml(match[0])}</mark>`)
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

  // Inline badge state
  const badgeColor = error
    ? 'oklch(0.65 0.18 25)'
    : !pattern
    ? 'var(--text-muted)'
    : matches.length > 0
    ? 'oklch(0.72 0.15 145)'
    : 'oklch(0.65 0.18 25)'

  const badgeBg = error
    ? 'oklch(0.65 0.18 25 / 0.12)'
    : !pattern
    ? 'transparent'
    : matches.length > 0
    ? 'oklch(0.72 0.15 145 / 0.12)'
    : 'oklch(0.65 0.18 25 / 0.12)'

  const badgeText = error
    ? '✗ invalid'
    : !pattern
    ? ''
    : matches.length > 0
    ? `✓ ${matches.length}`
    : '✗ 0'

  return (
    <ToolLayout title="Regex Tester" description="Test regular expressions with live match highlighting.">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* ── Pattern card ── */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label className="label">Pattern</label>
            <div style={{
              display: 'flex', alignItems: 'center',
              border: `1px solid ${error ? 'oklch(0.65 0.18 25 / 0.6)' : pattern && matches.length > 0 ? 'oklch(0.72 0.15 145 / 0.5)' : 'var(--border-hi)'}`,
              borderRadius: 8, overflow: 'hidden',
              background: 'var(--bg)',
              transition: 'border-color 0.15s',
            }}>
              <span style={{ padding: '9px 12px', color: 'var(--text-muted)', background: 'var(--surface2)', borderRight: '1px solid var(--border)', fontFamily: 'var(--font-mono)', fontSize: 13 }}>/</span>
              <input
                type="text"
                value={pattern}
                onChange={e => setPattern(e.target.value)}
                placeholder="[a-z]+"
                style={{ flex: 1, padding: '9px 12px', fontSize: 13, fontFamily: 'var(--font-mono)', background: 'transparent', color: 'var(--text)', outline: 'none' }}
                spellCheck={false}
              />
              {/* Live badge */}
              {badgeText && (
                <span style={{
                  padding: '3px 10px', margin: '0 6px', borderRadius: 100,
                  fontSize: 12, fontWeight: 700, fontFamily: 'var(--font-mono)',
                  background: badgeBg, color: badgeColor,
                  border: `1px solid ${badgeColor}44`,
                  transition: 'all 0.15s',
                  whiteSpace: 'nowrap',
                }}>{badgeText}</span>
              )}
              <span style={{ padding: '9px 12px', color: 'var(--text-muted)', background: 'var(--surface2)', borderLeft: '1px solid var(--border)', fontFamily: 'var(--font-mono)', fontSize: 13 }}>/{[...flags].join('')}</span>
            </div>
            {error && (
              <div style={{ marginTop: 8, padding: '6px 12px', borderRadius: 8, background: 'oklch(0.65 0.18 25 / 0.10)', border: '1px solid oklch(0.65 0.18 25 / 0.35)', color: 'oklch(0.70 0.18 25)', fontSize: 12, fontFamily: 'var(--font-mono)' }}>
                ✗ {error}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
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

            {/* Match summary inline */}
            {pattern && !error && (
              <span style={{
                marginLeft: 'auto', fontSize: 12, fontFamily: 'var(--font-sans)',
                color: matches.length > 0 ? 'oklch(0.72 0.15 145)' : 'oklch(0.65 0.18 25)',
              }}>
                {matches.length > 0
                  ? `${matches.length} match${matches.length !== 1 ? 'es' : ''} — ${matches.map(m => `"${m[0]}"`).slice(0, 4).join(', ')}${matches.length > 4 ? '…' : ''}`
                  : 'No matches in test string'}
              </span>
            )}
          </div>

          {showReplace && (
            <div>
              <label className="label">Replace with</label>
              <input value={replace} onChange={e => setReplace(e.target.value)} placeholder="replacement ($1 for groups)" className="tool-input font-mono" />
            </div>
          )}
        </div>

        {/* ── Side-by-side: editable | highlighted ── */}
        <div className="two-col" style={{ gap: 12 }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <label className="label">Test string</label>
            <textarea
              value={testStr}
              onChange={e => setTestStr(e.target.value)}
              className="tool-textarea"
              style={{ flex: 1, minHeight: 260 }}
              spellCheck={false}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <label className="label">Live preview</label>
            {/* highlighted content is built from escHtml (escapes &, <, >) + our own <mark style> tags — XSS-safe */}
            <div
              style={{
                flex: 1, minHeight: 260,
                background: 'var(--surface)', border: '1px solid var(--border)',
                borderRadius: 10, padding: '10px 14px',
                fontSize: 13, fontFamily: 'var(--font-mono)',
                whiteSpace: 'pre-wrap', lineHeight: 1.8,
                color: 'var(--text)', overflowY: 'auto',
              }}
              dangerouslySetInnerHTML={{ __html: highlighted }}
            />
          </div>
        </div>

        {/* ── Replace result ── */}
        {showReplace && replaced && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <label className="label" style={{ margin: 0 }}>Replace result</label>
              <button onClick={() => navigator.clipboard.writeText(replaced)} className="copy-btn">Copy</button>
            </div>
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px', fontSize: 13, fontFamily: 'var(--font-mono)', whiteSpace: 'pre-wrap', color: 'var(--text)' }}>{replaced}</div>
          </div>
        )}
      </div>
    </ToolLayout>
  )
}
