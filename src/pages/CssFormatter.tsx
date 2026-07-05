import { useState, useEffect } from 'react'
import ToolLayout from '../components/ToolLayout'
import CopyBtn from '../components/CopyBtn'

function formatCSS(css: string): string {
  let out = ''; let indent = 0
  const tokens = css.replace(/\/\*[\s\S]*?\*\//g, '').split(/([\{\};])/).filter(t => t.trim())
  tokens.forEach(token => {
    const t = token.trim()
    if (!t) return
    if (t === '{') { out = out.trimEnd() + ' {\n'; indent++ }
    else if (t === '}') { indent = Math.max(0, indent - 1); out += '  '.repeat(indent) + '}\n\n' }
    else if (t === ';') { out = out.trimEnd() + ';\n' }
    else { out += '  '.repeat(indent) + t }
  })
  return out.trim()
}

function minifyCSS(css: string): string {
  return css
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s*\{\s*/g, '{')
    .replace(/\s*\}\s*/g, '}')
    .replace(/\s*;\s*/g, ';')
    .replace(/\s*:\s*/g, ':')
    .replace(/\s*,\s*/g, ',')
    .trim()
}

const SAMPLE_CSS = `/* Main layout */
.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 24px;
}

.header {
  background: #0d9488;
  color: white;
  padding: 16px 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.btn {
  padding: 8px 18px;
  border-radius: 8px;
  border: none;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  transition: all 0.2s;
}`

export default function CssFormatterPage() {
  const [input, setInput] = useState(SAMPLE_CSS)
  const [mode, setMode] = useState<'format'|'minify'>('format')
  const [output, setOutput] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    try {
      setOutput(mode === 'format' ? formatCSS(input) : minifyCSS(input))
      setError('')
    } catch(e: unknown) { setError(e instanceof Error ? e.message : String(e)) }
  }, [input, mode])

  const sizeOrig = new Blob([input]).size
  const sizeOut  = new Blob([output]).size
  const savings  = sizeOrig > 0 ? Math.round((1 - sizeOut / sizeOrig) * 100) : 0

  return (
    <ToolLayout title="CSS Formatter / Minifier" description="Beautify or minify CSS code with size comparison">
      <div className="one-col">
        <div style={{ display:'flex', gap:8 }}>
          {(['format','minify'] as const).map(m => (
            <button key={m} className={`seg-btn ${mode === m ? 'active' : ''}`} onClick={() => setMode(m)}
            >{m === 'format' ? '✦ Format' : '⚡ Minify'}</button>
          ))}
          {mode === 'minify' && savings > 0 && (
            <span className="success-badge" style={{ marginLeft:'auto' }}>−{savings}% smaller</span>
          )}
        </div>
        <div className="two-col">
          <div>
            <div className="section-label">Input CSS</div>
            <textarea value={input} onChange={e => setInput(e.target.value)} style={{ minHeight:360, fontSize:13 }} spellCheck={false} />
          </div>
          <div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
              <div className="section-label">{mode === 'format' ? 'Formatted' : 'Minified'} CSS</div>
              {output && <CopyBtn text={output} />}
            </div>
            {error ? <div className="error-msg">⚠ {error}</div> : (
              <pre className="code-out" style={{ minHeight:360, fontSize:13 }}>{output}</pre>
            )}
          </div>
        </div>
        <div className="stat-grid">
          {[
            { val: `${sizeOrig} B`, key: 'Original size' },
            { val: `${sizeOut} B`,  key: 'Output size' },
            { val: `${Math.max(0, savings)}%`, key: 'Reduction' },
            { val: output.split('\n').length, key: 'Lines' },
          ].map(s => (
            <div className="stat-box" key={s.key}>
              <div className="stat-val" style={{ fontSize:20 }}>{s.val}</div>
              <div className="stat-key">{s.key}</div>
            </div>
          ))}
        </div>
      </div>
    </ToolLayout>
  )
}
