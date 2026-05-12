import { useState } from 'react'
import ToolLayout from '../components/ToolLayout'

type DiffLine = { type: 'add' | 'remove' | 'equal'; text: string }

function computeDiff(a: string, b: string): DiffLine[] {
  const oldLines = a.split('\n')
  const newLines = b.split('\n')
  const m = oldLines.length
  const n = newLines.length

  if (m * n > 200000) {
    return [{ type: 'equal', text: '(files too large for line-by-line diff)' }]
  }

  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0))
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = oldLines[i - 1] === newLines[j - 1] ? dp[i-1][j-1] + 1 : Math.max(dp[i-1][j], dp[i][j-1])

  const result: DiffLine[] = []
  let i = m, j = n
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldLines[i-1] === newLines[j-1]) {
      result.unshift({ type: 'equal', text: oldLines[i-1] }); i--; j--
    } else if (j > 0 && (i === 0 || dp[i][j-1] >= dp[i-1][j])) {
      result.unshift({ type: 'add', text: newLines[j-1] }); j--
    } else {
      result.unshift({ type: 'remove', text: oldLines[i-1] }); i--
    }
  }
  return result
}

export default function DiffChecker() {
  const [left, setLeft] = useState('')
  const [right, setRight] = useState('')
  const [diff, setDiff] = useState<DiffLine[] | null>(null)
  const [inlineMode, setInlineMode] = useState(false)

  const compare = () => setDiff(computeDiff(left, right))
  const clear = () => { setLeft(''); setRight(''); setDiff(null) }

  const added = diff?.filter(d => d.type === 'add').length ?? 0
  const removed = diff?.filter(d => d.type === 'remove').length ?? 0

  return (
    <ToolLayout title="Diff Checker" description="Compare two texts and highlight additions and deletions line by line.">
      <div className="flex flex-col gap-4 flex-1">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="flex flex-col">
            <label className="label">Original</label>
            <textarea value={left} onChange={e => setLeft(e.target.value)} placeholder="Paste original text…" className="tool-textarea flex-1" spellCheck={false} />
          </div>
          <div className="flex flex-col">
            <label className="label">Modified</label>
            <textarea value={right} onChange={e => setRight(e.target.value)} placeholder="Paste modified text…" className="tool-textarea flex-1" spellCheck={false} />
          </div>
        </div>

        <div className="flex gap-2 items-center">
          <button onClick={compare} className="btn-primary">Compare</button>
          <button onClick={clear} className="btn-secondary">Clear</button>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-dim)', marginLeft: 8, cursor: 'pointer' }}>
            <input type="checkbox" checked={inlineMode} onChange={e => setInlineMode(e.target.checked)} style={{ accentColor: 'var(--accent)' }} />
            Inline mode
          </label>
        </div>

        {diff && (
          <div>
            <div style={{ display: 'flex', gap: 16, marginBottom: 12, fontSize: 13, fontFamily: 'var(--font-mono)' }}>
              <span style={{ color: 'oklch(0.72 0.15 145)', fontWeight: 600 }}>+{added} added</span>
              <span style={{ color: 'oklch(0.65 0.18 25)', fontWeight: 600 }}>−{removed} removed</span>
              {added === 0 && removed === 0 && (
                <span style={{ color: 'var(--text-muted)' }}>Files identical</span>
              )}
            </div>

            {inlineMode ? (
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', fontFamily: 'var(--font-mono)', fontSize: 13 }}>
                {diff.map((line, i) => (
                  <div key={i} style={{
                    display: 'flex', gap: 12, padding: '2px 16px',
                    background: line.type === 'add' ? 'oklch(0.72 0.15 145 / 0.10)' : line.type === 'remove' ? 'oklch(0.65 0.18 25 / 0.10)' : 'transparent',
                    borderLeft: `3px solid ${line.type === 'add' ? 'oklch(0.72 0.15 145 / 0.6)' : line.type === 'remove' ? 'oklch(0.65 0.18 25 / 0.6)' : 'transparent'}`,
                  }}>
                    <span style={{
                      userSelect: 'none', width: 14, flexShrink: 0,
                      color: line.type === 'add' ? 'oklch(0.72 0.15 145)' : line.type === 'remove' ? 'oklch(0.65 0.18 25)' : 'var(--border)',
                    }}>
                      {line.type === 'add' ? '+' : line.type === 'remove' ? '−' : ' '}
                    </span>
                    <span style={{ color: line.type === 'add' ? 'oklch(0.85 0.12 145)' : line.type === 'remove' ? 'oklch(0.80 0.12 25)' : 'var(--text-dim)' }}>
                      {line.text || ' '}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border)', fontFamily: 'var(--font-mono)', fontSize: 13 }}>
                <div style={{ borderRight: '1px solid var(--border)' }}>
                  <div style={{ background: 'var(--surface2)', padding: '8px 16px', fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-sans)', borderBottom: '1px solid var(--border)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Original</div>
                  {diff.filter(d => d.type !== 'add').map((line, i) => (
                    <div key={i} style={{
                      padding: '2px 16px',
                      background: line.type === 'remove' ? 'oklch(0.65 0.18 25 / 0.12)' : 'transparent',
                      borderLeft: `3px solid ${line.type === 'remove' ? 'oklch(0.65 0.18 25 / 0.7)' : 'transparent'}`,
                      color: line.type === 'remove' ? 'oklch(0.80 0.12 25)' : 'var(--text-dim)',
                    }}>
                      {line.type === 'remove' && <span style={{ color: 'oklch(0.65 0.18 25)', marginRight: 8 }}>−</span>}
                      {line.text || ' '}
                    </div>
                  ))}
                </div>
                <div>
                  <div style={{ background: 'var(--surface2)', padding: '8px 16px', fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-sans)', borderBottom: '1px solid var(--border)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Modified</div>
                  {diff.filter(d => d.type !== 'remove').map((line, i) => (
                    <div key={i} style={{
                      padding: '2px 16px',
                      background: line.type === 'add' ? 'oklch(0.72 0.15 145 / 0.12)' : 'transparent',
                      borderLeft: `3px solid ${line.type === 'add' ? 'oklch(0.72 0.15 145 / 0.7)' : 'transparent'}`,
                      color: line.type === 'add' ? 'oklch(0.85 0.12 145)' : 'var(--text-dim)',
                    }}>
                      {line.type === 'add' && <span style={{ color: 'oklch(0.72 0.15 145)', marginRight: 8 }}>+</span>}
                      {line.text || ' '}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </ToolLayout>
  )
}
