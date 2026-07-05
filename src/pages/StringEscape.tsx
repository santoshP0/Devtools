import { useState, useEffect } from 'react'
import ToolLayout from '../components/ToolLayout'
import CopyBtn from '../components/CopyBtn'

function SegControl({ options, value, onChange }: { options: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="option-row">
      {options.map(o => (
        <button key={o} className={`seg-btn ${value === o ? 'active' : ''}`} onClick={() => onChange(o)}>{o}</button>
      ))}
    </div>
  )
}

type EscType = 'JSON' | 'HTML' | 'URL' | 'RegEx' | 'SQL' | 'Unicode'
const escapeTransforms: Record<EscType, { encode: (s: string) => string; decode: (s: string) => string }> = {
  JSON: {
    encode: s => JSON.stringify(s).slice(1,-1),
    decode: s => { try { return JSON.parse('"' + s + '"') } catch { throw new Error('Invalid JSON string') } },
  },
  HTML: {
    encode: s => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#x27;'),
    decode: s => { const el = document.createElement('div'); el.innerHTML = s; return el.textContent || '' },
  },
  URL: {
    encode: s => encodeURIComponent(s),
    decode: s => { try { return decodeURIComponent(s) } catch { throw new Error('Invalid URL encoding') } },
  },
  RegEx: {
    encode: s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
    decode: s => s.replace(/\\([.*+?^${}()|[\]\\])/g, '$1'),
  },
  SQL: {
    encode: s => s.replace(/'/g,"''").replace(/\\/g,'\\\\'),
    decode: s => s.replace(/''/g,"'").replace(/\\\\/g,'\\'),
  },
  Unicode: {
    encode: s => [...s].map(c => c.codePointAt(0)! > 127 ? `\\u${c.codePointAt(0)!.toString(16).padStart(4,'0')}` : c).join(''),
    decode: s => s.replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCodePoint(parseInt(h,16))),
  },
}

export default function StringEscapePage() {
  const [input, setInput] = useState('Hello "World"!\nTab:\there & <special> chars © 2024')
  const [mode, setMode] = useState('Encode')
  const [type, setType] = useState<EscType>('JSON')
  const [output, setOutput] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!input) { setOutput(''); setError(''); return }
    try {
      const fn = escapeTransforms[type][mode === 'Encode' ? 'encode' : 'decode']
      setOutput(fn(input)); setError('')
    } catch (e: unknown) { setError(e instanceof Error ? e.message : String(e)); setOutput('') }
  }, [input, mode, type])

  return (
    <ToolLayout title="String Escape" description="Escape and unescape JSON, HTML, RegEx, URL and SQL strings">
      <div className="one-col">
        <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
          <SegControl options={['Encode','Decode']} value={mode} onChange={setMode} />
          <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
            {(Object.keys(escapeTransforms) as EscType[]).map(t => (
              <button key={t} className={`seg-btn ${type === t ? 'active' : ''}`} onClick={() => setType(t)}>{t}</button>
            ))}
          </div>
        </div>
        <div className="two-col">
          <div>
            <div className="section-label">Input</div>
            <textarea value={input} onChange={e => setInput(e.target.value)} style={{ minHeight:200, fontSize:13 }} spellCheck={false} />
          </div>
          <div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
              <div className="section-label">Output</div>
              {output && <CopyBtn text={output} />}
            </div>
            {error ? <div className="error-msg">⚠ {error}</div> : <pre className="code-out" style={{ minHeight:200 }}>{output}</pre>}
          </div>
        </div>
      </div>
    </ToolLayout>
  )
}
