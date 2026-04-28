import { useState, useMemo } from 'react'
import ToolLayout from '../components/ToolLayout'

function CopyBtn({ text, label = 'Copy' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false)
  const click = () => { navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500) }) }
  return <button className="btn btn-ghost btn-sm" onClick={click}>{copied ? '✓ Copied' : label}</button>
}

const OPS = [
  { id:'sort-az',   label:'Sort A → Z',      fn: (lines: string[]) => [...lines].sort((a,b) => a.localeCompare(b)) },
  { id:'sort-za',   label:'Sort Z → A',      fn: (lines: string[]) => [...lines].sort((a,b) => b.localeCompare(a)) },
  { id:'sort-len',  label:'Sort by length',  fn: (lines: string[]) => [...lines].sort((a,b) => a.length - b.length) },
  { id:'reverse',   label:'Reverse order',   fn: (lines: string[]) => [...lines].reverse() },
  { id:'dedupe',    label:'Remove duplicates',fn: (lines: string[]) => [...new Set(lines)] },
  { id:'trim',      label:'Trim whitespace', fn: (lines: string[]) => lines.map(l => l.trim()) },
  { id:'remove-empty', label:'Remove empty lines', fn: (lines: string[]) => lines.filter(l => l.trim()) },
  { id:'shuffle',   label:'Shuffle',         fn: (lines: string[]) => { const a=[...lines]; for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a } },
  { id:'lowercase', label:'Lowercase',       fn: (lines: string[]) => lines.map(l => l.toLowerCase()) },
  { id:'uppercase', label:'Uppercase',       fn: (lines: string[]) => lines.map(l => l.toUpperCase()) },
  { id:'number',    label:'Add numbers',     fn: (lines: string[]) => lines.map((l,i) => `${i+1}. ${l}`) },
]

export default function LineSorterPage() {
  const [input, setInput] = useState('banana\napple\ncherry\napple\ndate\nbanana\nempty line below\n\nfig')
  const [output, setOutput] = useState('')
  const [filter, setFilter] = useState('')

  const process = (opId: string) => {
    let lines = input.split('\n')
    if (filter.trim()) lines = lines.filter(l => l.toLowerCase().includes(filter.toLowerCase()))
    const op = OPS.find(o => o.id === opId)
    if (op) lines = op.fn(lines)
    setOutput(lines.join('\n'))
  }

  const stats = useMemo(() => {
    const lines = input.split('\n')
    return { total: lines.length, nonEmpty: lines.filter(l=>l.trim()).length, unique: new Set(lines).size }
  }, [input])

  return (
    <ToolLayout title="Line Tools" description="Sort, deduplicate, reverse, trim and filter lines of text">
      <div className="one-col">
        <div className="two-col">
          <div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
              <div className="section-label">Input</div>
              <span style={{ fontSize:12, color:'var(--text-muted)' }}>{stats.total} lines · {stats.unique} unique</span>
            </div>
            <textarea value={input} onChange={e => setInput(e.target.value)} style={{ minHeight:300, fontSize:13 }} />
            <div style={{ marginTop:10 }}>
              <label>Filter (keep lines containing)</label>
              <input type="text" value={filter} onChange={e => setFilter(e.target.value)} placeholder="Type to filter lines…" />
            </div>
          </div>
          <div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
              <div className="section-label">Output</div>
              {output && <CopyBtn text={output} />}
            </div>
            <pre className="code-out" style={{ minHeight:300 }}>{output || <span style={{color:'var(--text-muted)'}}>Apply an operation →</span>}</pre>
          </div>
        </div>
        <div>
          <div className="section-label">Operations</div>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
            {OPS.map(op => (
              <button key={op.id} onClick={() => process(op.id)} style={{
                padding:'8px 15px', borderRadius:8, border:'1px solid var(--border)',
                background:'transparent', color:'var(--text-dim)', cursor:'pointer',
                fontFamily:'var(--font-sans)', fontSize:13, transition:'all 0.15s',
              }}
              onMouseEnter={e=>{(e.currentTarget as HTMLButtonElement).style.background='var(--surface2)';(e.currentTarget as HTMLButtonElement).style.color='var(--text)'}}
              onMouseLeave={e=>{(e.currentTarget as HTMLButtonElement).style.background='transparent';(e.currentTarget as HTMLButtonElement).style.color='var(--text-dim)'}}>
                {op.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </ToolLayout>
  )
}
