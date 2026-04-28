import { useState, useEffect } from 'react'
import ToolLayout from '../components/ToolLayout'

function CopyBtn({ text, label = 'Copy' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false)
  const click = () => { navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500) }) }
  return <button className="btn btn-ghost btn-sm" onClick={click}>{copied ? '✓ Copied' : label}</button>
}

function formatJS(js: string): string {
  let out = ''; let indent = 0; let inStr = false; let strChar = ''
  const lines = js.replace(/\r\n/g, '\n').split('\n').map(l => l.trim()).filter(Boolean)
  lines.forEach(line => {
    if (line.endsWith('{') || line.endsWith('(')) {
      out += '  '.repeat(indent) + line + '\n'; indent++
    } else if (line.startsWith('}') || line.startsWith(')')) {
      indent = Math.max(0, indent - 1); out += '  '.repeat(indent) + line + '\n'
    } else {
      out += '  '.repeat(indent) + line + '\n'
    }
  })
  return out.trim()
}

function minifyJS(js: string): string {
  return js
    .replace(/\/\/[^\n]*/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s*([{}();,=+\-*/<>!&|])\s*/g, '$1')
    .trim()
}

const SAMPLE = `// User service module
function fetchUser(id) {
  return fetch(\`/api/users/\${id}\`)
    .then(response => {
      if (!response.ok) {
        throw new Error('User not found');
      }
      return response.json();
    })
    .catch(error => {
      console.error('Error:', error);
      throw error;
    });
}

const formatDate = (timestamp) => {
  const date = new Date(timestamp);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

export { fetchUser, formatDate };`

export default function JsFormatterPage() {
  const [input, setInput] = useState(SAMPLE)
  const [mode, setMode] = useState<'format'|'minify'>('format')
  const [output, setOutput] = useState('')

  useEffect(() => {
    try { setOutput(mode === 'format' ? formatJS(input) : minifyJS(input)) } catch {}
  }, [input, mode])

  const sizeOrig = new Blob([input]).size
  const sizeOut  = new Blob([output]).size
  const savings  = sizeOrig > 0 ? Math.round((1 - sizeOut / sizeOrig) * 100) : 0

  return (
    <ToolLayout title="JS Formatter / Minifier" description="Format or minify JavaScript code with size comparison">
      <div className="one-col">
        <div style={{ display:'flex', gap:8 }}>
          {(['format','minify'] as const).map(m => (
            <button key={m} className={`seg-btn ${mode === m ? 'active' : ''}`} onClick={() => setMode(m)}>{m === 'format' ? '✦ Format' : '⚡ Minify'}</button>
          ))}
          {mode === 'minify' && savings > 0 && (
            <span className="success-badge" style={{ marginLeft:'auto' }}>−{savings}% smaller</span>
          )}
        </div>
        <div className="two-col">
          <div>
            <div className="section-label">Input JS</div>
            <textarea value={input} onChange={e => setInput(e.target.value)} style={{ minHeight:360, fontSize:13 }} spellCheck={false} />
          </div>
          <div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
              <div className="section-label">{mode === 'format' ? 'Formatted' : 'Minified'} JS</div>
              {output && <CopyBtn text={output} />}
            </div>
            <pre className="code-out" style={{ minHeight:360, fontSize:13, color:'oklch(0.80 0.14 75)' }}>{output}</pre>
          </div>
        </div>
        <div className="stat-grid">
          {[
            { val: `${sizeOrig} B`, key: 'Original' },
            { val: `${sizeOut} B`,  key: 'Output' },
            { val: `${Math.max(0, savings)}%`, key: 'Reduction' },
            { val: output.split('\n').length, key: 'Lines' },
          ].map(s => (
            <div className="stat-box" key={s.key}><div className="stat-val" style={{ fontSize:20 }}>{s.val}</div><div className="stat-key">{s.key}</div></div>
          ))}
        </div>
      </div>
    </ToolLayout>
  )
}
