import { useState, useCallback } from 'react'
import ToolLayout from '../components/ToolLayout'

// Minimal JSONPath evaluator — supports $, .key, [n], [*], ..key
function jsonPath(obj: unknown, path: string): unknown[] {
  const results: unknown[] = []

  function get(node: unknown, tokens: string[]): void {
    if (tokens.length === 0) { results.push(node); return }
    const [tok, ...rest] = tokens

    if (tok === '$') { get(node, rest); return }

    if (tok === '**') {
      // recursive descent — apply rest to node and all descendants
      get(node, rest)
      if (Array.isArray(node)) node.forEach(item => get(item, tokens))
      else if (typeof node === 'object' && node !== null)
        Object.values(node as Record<string, unknown>).forEach(v => get(v, tokens))
      return
    }

    if (tok === '*') {
      if (Array.isArray(node)) node.forEach(item => get(item, rest))
      else if (typeof node === 'object' && node !== null)
        Object.values(node as Record<string, unknown>).forEach(v => get(v, rest))
      return
    }

    const numIdx = Number(tok)
    if (!isNaN(numIdx) && Array.isArray(node)) {
      const item = node[numIdx < 0 ? node.length + numIdx : numIdx]
      if (item !== undefined) get(item, rest)
      return
    }

    if (tok === 'length' && Array.isArray(node)) { results.push(node.length); return }

    if (typeof node === 'object' && node !== null && !Array.isArray(node)) {
      const val = (node as Record<string, unknown>)[tok]
      if (val !== undefined) get(val, rest)
    }
  }

  function tokenize(expr: string): string[] {
    const tokens: string[] = []
    let i = 0
    while (i < expr.length) {
      if (expr[i] === '$') { tokens.push('$'); i++; continue }
      if (expr.slice(i, i + 2) === '..') {
        tokens.push('**'); i += 2
        // capture key after ..
        let key = ''
        while (i < expr.length && expr[i] !== '.' && expr[i] !== '[') key += expr[i++]
        if (key) tokens.push(key)
        continue
      }
      if (expr[i] === '.') {
        i++
        if (expr[i] === '*') { tokens.push('*'); i++; continue }
        let key = ''
        while (i < expr.length && expr[i] !== '.' && expr[i] !== '[') key += expr[i++]
        if (key) tokens.push(key)
        continue
      }
      if (expr[i] === '[') {
        i++
        let inner = ''
        while (i < expr.length && expr[i] !== ']') inner += expr[i++]
        i++ // skip ]
        inner = inner.trim().replace(/^['"]|['"]$/g, '')
        tokens.push(inner === '*' ? '*' : inner)
        continue
      }
      i++
    }
    return tokens
  }

  try {
    get(obj, tokenize(path))
  } catch {}
  return results
}

const SAMPLE_JSON = JSON.stringify({
  store: {
    books: [
      { title: 'Clean Code', author: 'Martin', price: 29.99, inStock: true },
      { title: 'The Pragmatic Programmer', author: 'Hunt', price: 39.99, inStock: false },
      { title: 'Design Patterns', author: 'GoF', price: 49.99, inStock: true },
    ],
    name: 'Dev Books'
  }
}, null, 2)

const EXAMPLES = [
  { label: 'All books', path: '$.store.books[*]' },
  { label: 'First book', path: '$.store.books[0]' },
  { label: 'All titles', path: '$.store.books[*].title' },
  { label: 'All prices', path: '$..price' },
  { label: 'Store name', path: '$.store.name' },
]

export default function JsonPathTester() {
  const [json, setJson] = useState(SAMPLE_JSON)
  const [path, setPath] = useState('$.store.books[*].title')
  const [results, setResults] = useState<unknown[]>([])
  const [error, setError] = useState('')
  const [parsed, setParsed] = useState<unknown>(null)

  const evaluate = useCallback(() => {
    setError('')
    let obj: unknown
    try {
      obj = JSON.parse(json)
      setParsed(obj)
    } catch (e) {
      setError('Invalid JSON: ' + (e as Error).message)
      return
    }
    if (!path.trim()) return
    const res = jsonPath(obj, path.trim())
    setResults(res)
  }, [json, path])

  const copyResults = () => navigator.clipboard.writeText(JSON.stringify(results, null, 2))

  return (
    <ToolLayout title="JSON Path Tester" description="Query JSON data using JSONPath expressions with live results.">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Path input */}
        <div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
            <input
              type="text"
              value={path}
              onChange={e => setPath(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && evaluate()}
              placeholder="$.store.books[*].title"
              style={{
                flex: 1, padding: '9px 12px', background: 'var(--surface)',
                border: '1px solid var(--border)', borderRadius: 8,
                color: 'var(--text)', fontFamily: 'var(--font-mono)', fontSize: 14,
                outline: 'none',
              }}
            />
            <button onClick={evaluate} className="btn-primary">Evaluate</button>
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {EXAMPLES.map(ex => (
              <button
                key={ex.path}
                onClick={() => { setPath(ex.path); setResults([]); setError('') }}
                style={{
                  fontSize: 11, padding: '4px 10px', borderRadius: 20,
                  background: 'var(--surface2)', border: '1px solid var(--border)',
                  color: 'var(--text-dim)', cursor: 'pointer', fontFamily: 'var(--font-mono)',
                }}
              >
                {ex.label}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div style={{ padding: '10px 14px', background: 'oklch(0.17 0.05 25)', border: '1px solid oklch(0.72 0.16 25)', borderRadius: 8, color: 'oklch(0.80 0.16 25)', fontSize: 13 }}>
            ✗ {error}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-dim)', marginBottom: 6 }}>JSON Input</div>
            <textarea
              value={json}
              onChange={e => setJson(e.target.value)}
              spellCheck={false}
              style={{
                width: '100%', minHeight: 400, padding: 12, resize: 'vertical',
                background: 'var(--surface)', border: '1px solid var(--border)',
                borderRadius: 8, color: 'var(--text)', fontFamily: 'var(--font-mono)',
                fontSize: 13, lineHeight: 1.6, outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-dim)' }}>
                Results {results.length > 0 && <span style={{ color: 'var(--accent)' }}>({results.length})</span>}
              </span>
              {results.length > 0 && <button onClick={copyResults} className="copy-btn">Copy JSON</button>}
            </div>
            <div style={{
              minHeight: 400, background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 8, overflow: 'auto',
            }}>
              {results.length === 0 && !error && (
                <div style={{ padding: 16, color: 'var(--text-muted)', fontSize: 13 }}>
                  {path && parsed ? 'No matches found.' : 'Click Evaluate to run the expression.'}
                </div>
              )}
              {results.map((r, i) => (
                <div
                  key={i}
                  style={{
                    padding: '10px 12px', borderBottom: '1px solid var(--border)',
                    fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--text)',
                    lineHeight: 1.5,
                  }}
                >
                  <span style={{ color: 'var(--text-muted)', marginRight: 8, userSelect: 'none' }}>[{i}]</span>
                  {typeof r === 'string'
                    ? <span style={{ color: 'oklch(0.80 0.14 75)' }}>"{r}"</span>
                    : typeof r === 'number'
                    ? <span style={{ color: 'oklch(0.72 0.16 195)' }}>{r}</span>
                    : typeof r === 'boolean'
                    ? <span style={{ color: 'oklch(0.72 0.16 25)' }}>{String(r)}</span>
                    : <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{JSON.stringify(r, null, 2)}</pre>
                  }
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-sans)' }}>
          Supported: <code style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>$</code> root &nbsp;·&nbsp;
          <code style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>.key</code> child &nbsp;·&nbsp;
          <code style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>[n]</code> index &nbsp;·&nbsp;
          <code style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>[*]</code> wildcard &nbsp;·&nbsp;
          <code style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>..key</code> recursive
        </div>
      </div>
    </ToolLayout>
  )
}
