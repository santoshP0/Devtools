import { useState } from 'react'
import ToolLayout from '../components/ToolLayout'

type DiffLine = { type: 'add' | 'remove' | 'equal'; text: string; ln1?: number; ln2?: number }

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
      <div className="space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div>
            <label className="label">Original</label>
            <textarea value={left} onChange={e => setLeft(e.target.value)} placeholder="Paste original text…" className="tool-textarea h-56" spellCheck={false} />
          </div>
          <div>
            <label className="label">Modified</label>
            <textarea value={right} onChange={e => setRight(e.target.value)} placeholder="Paste modified text…" className="tool-textarea h-56" spellCheck={false} />
          </div>
        </div>

        <div className="flex gap-2 items-center">
          <button onClick={compare} className="btn-primary">Compare</button>
          <button onClick={clear} className="btn-secondary">Clear</button>
          <label className="flex items-center gap-2 text-sm text-slate-600 ml-2">
            <input type="checkbox" checked={inlineMode} onChange={e => setInlineMode(e.target.checked)} className="accent-blue-600" />
            Inline mode
          </label>
        </div>

        {diff && (
          <div>
            <div className="flex gap-4 mb-2 text-sm">
              <span className="text-green-600 font-medium">+{added} added</span>
              <span className="text-red-600 font-medium">−{removed} removed</span>
            </div>

            {inlineMode ? (
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden font-mono text-sm">
                {diff.map((line, i) => (
                  <div key={i} className={`px-4 py-0.5 flex gap-3 ${line.type === 'add' ? 'bg-green-50' : line.type === 'remove' ? 'bg-red-50' : ''}`}>
                    <span className={`select-none w-4 ${line.type === 'add' ? 'text-green-600' : line.type === 'remove' ? 'text-red-500' : 'text-slate-300'}`}>
                      {line.type === 'add' ? '+' : line.type === 'remove' ? '−' : ' '}
                    </span>
                    <span className={line.type === 'add' ? 'text-green-800' : line.type === 'remove' ? 'text-red-800' : 'text-slate-700'}>
                      {line.text}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 rounded-xl overflow-hidden border border-slate-200 font-mono text-sm">
                <div className="border-r border-slate-200">
                  <div className="bg-slate-50 px-4 py-2 text-xs text-slate-500 font-sans border-b border-slate-200">Original</div>
                  {diff.filter(d => d.type !== 'add').map((line, i) => (
                    <div key={i} className={`px-4 py-0.5 ${line.type === 'remove' ? 'bg-red-50 text-red-800' : 'text-slate-700'}`}>
                      {line.type === 'remove' && <span className="text-red-400 mr-2">−</span>}{line.text || ' '}
                    </div>
                  ))}
                </div>
                <div>
                  <div className="bg-slate-50 px-4 py-2 text-xs text-slate-500 font-sans border-b border-slate-200">Modified</div>
                  {diff.filter(d => d.type !== 'remove').map((line, i) => (
                    <div key={i} className={`px-4 py-0.5 ${line.type === 'add' ? 'bg-green-50 text-green-800' : 'text-slate-700'}`}>
                      {line.type === 'add' && <span className="text-green-500 mr-2">+</span>}{line.text || ' '}
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
