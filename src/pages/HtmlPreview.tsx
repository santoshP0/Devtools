import { useState, useRef, useEffect, useCallback } from 'react'
import ToolLayout from '../components/ToolLayout'

const DEFAULT_HTML = `<h1>Hello, DevToolbox!</h1>
<p>Edit the HTML, CSS, and JS panels to see live preview.</p>
<button id="btn">Click me</button>
<div id="out"></div>`

const DEFAULT_CSS = `body {
  font-family: system-ui, sans-serif;
  max-width: 600px;
  margin: 2rem auto;
  padding: 0 1rem;
  color: #1e293b;
}

h1 { color: #2563eb; }

button {
  background: #2563eb;
  color: white;
  border: none;
  padding: 8px 18px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
}

button:hover { background: #1d4ed8; }

#out {
  margin-top: 12px;
  font-family: monospace;
  color: #64748b;
}`

const DEFAULT_JS = `document.getElementById('btn').addEventListener('click', () => {
  const out = document.getElementById('out')
  out.textContent = 'Button clicked at ' + new Date().toLocaleTimeString()
})`

type Tab = 'html' | 'css' | 'js'

const TAB_COLORS: Record<Tab, string> = {
  html: 'oklch(0.72 0.16 25)',
  css: 'oklch(0.72 0.16 195)',
  js: 'oklch(0.80 0.14 75)',
}

export default function HtmlPreview() {
  const [html, setHtml] = useState(DEFAULT_HTML)
  const [css, setCss] = useState(DEFAULT_CSS)
  const [js, setJs] = useState(DEFAULT_JS)
  const [tab, setTab] = useState<Tab>('html')
  const [srcDoc, setSrcDoc] = useState('')
  const [autoRun, setAutoRun] = useState(true)
  const [layout, setLayout] = useState<'split' | 'editor' | 'preview'>('split')
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()

  const buildDoc = useCallback(() => {
    return `<!DOCTYPE html><html><head><style>${css}</style></head><body>${html}<script>${js}<\/script></body></html>`
  }, [html, css, js])

  useEffect(() => {
    if (!autoRun) return
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => setSrcDoc(buildDoc()), 500)
    return () => clearTimeout(debounceRef.current)
  }, [html, css, js, autoRun, buildDoc])

  const run = () => setSrcDoc(buildDoc())

  const openInTab = () => {
    const w = window.open()
    w?.document.write(buildDoc())
    w?.document.close()
  }

  const values: Record<Tab, string> = { html, css, js }
  const setters: Record<Tab, (v: string) => void> = { html: setHtml, css: setCss, js: setJs }

  const editor = (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', gap: 4, marginBottom: 0, flexShrink: 0 }}>
        {(['html', 'css', 'js'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: '6px 16px', borderRadius: '6px 6px 0 0', fontSize: 12, fontWeight: 700,
              cursor: 'pointer', border: '1px solid var(--border)', borderBottom: 'none',
              background: tab === t ? 'var(--surface)' : 'var(--surface2)',
              color: tab === t ? TAB_COLORS[t] : 'var(--text-muted)',
              fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.05em',
              transition: 'all 0.15s',
            }}
          >
            {t}
          </button>
        ))}
      </div>
      <textarea
        value={values[tab]}
        onChange={e => setters[tab](e.target.value)}
        spellCheck={false}
        style={{
          flex: 1, width: '100%', padding: 14, resize: 'none', outline: 'none',
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: '0 6px 6px 6px', color: 'var(--text)',
          fontFamily: 'var(--font-mono)', fontSize: 13, lineHeight: 1.6,
          boxSizing: 'border-box',
        }}
      />
    </div>
  )

  const preview = (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 4, flexShrink: 0,
        padding: '4px 8px', background: 'var(--surface2)', borderRadius: '6px 6px 0 0',
        border: '1px solid var(--border)', borderBottom: 'none',
      }}>
        <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-sans)' }}>Preview</span>
        <button onClick={openInTab} style={{ fontSize: 11, background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}>
          Open in new tab ↗
        </button>
      </div>
      <iframe
        ref={iframeRef}
        srcDoc={srcDoc}
        sandbox="allow-scripts"
        title="preview"
        style={{
          flex: 1, border: '1px solid var(--border)', borderRadius: '0 0 6px 6px',
          background: 'white', width: '100%',
        }}
      />
    </div>
  )

  return (
    <ToolLayout title="HTML Preview" description="Live HTML + CSS + JS editor with sandboxed preview." fullWidth>
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexShrink: 0 }}>
          {(['split', 'editor', 'preview'] as const).map(v => (
            <button key={v} onClick={() => setLayout(v)} className={layout === v ? 'btn-primary' : 'btn-secondary'} style={{ textTransform: 'capitalize' }}>
              {v}
            </button>
          ))}
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-dim)', cursor: 'pointer', userSelect: 'none' }}>
              <input type="checkbox" checked={autoRun} onChange={e => setAutoRun(e.target.checked)} />
              Auto-run
            </label>
            {!autoRun && <button onClick={run} className="btn-primary">Run ▶</button>}
          </div>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: layout === 'split' ? '1fr 1fr' : '1fr',
          gap: 12,
          flex: 1,
          minHeight: 520,
        }}>
          {layout !== 'preview' && editor}
          {layout !== 'editor' && preview}
        </div>
      </div>
    </ToolLayout>
  )
}
