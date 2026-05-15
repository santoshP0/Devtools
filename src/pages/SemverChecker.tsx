import { useState, useMemo } from 'react'
import ToolLayout from '../components/ToolLayout'

function parseSemver(v: string) {
  const m = String(v).replace(/^[v^~]*/,'').match(/^(\d+)\.(\d+)\.(\d+)(?:-(.+))?(?:\+(.+))?$/)
  if (!m) return null
  return { major:+m[1], minor:+m[2], patch:+m[3], pre:m[4]||'', build:m[5]||'' }
}
function compareSemver(a: string, b: string) {
  const av=parseSemver(a), bv=parseSemver(b)
  if (!av||!bv) return null
  if (av.major!==bv.major) return av.major>bv.major?1:-1
  if (av.minor!==bv.minor) return av.minor>bv.minor?1:-1
  if (av.patch!==bv.patch) return av.patch>bv.patch?1:-1
  if (!av.pre&&bv.pre) return 1; if (av.pre&&!bv.pre) return -1
  return av.pre.localeCompare(bv.pre)
}
function satisfiesSemver(version: string, range: string) {
  const v = parseSemver(version); if (!v) return false
  const r = range.trim()
  if (r === '*' || r === '') return true
  if (r.startsWith('^')) {
    const base = parseSemver(r.slice(1)); if (!base) return false
    if (base.major>0) return v.major===base.major && (compareSemver(version,r.slice(1))??-1)>=0
    if (base.minor>0) return v.major===0&&v.minor===base.minor&&(compareSemver(version,r.slice(1))??-1)>=0
    return v.major===0&&v.minor===0&&v.patch>=base.patch
  }
  if (r.startsWith('~')) {
    const base = parseSemver(r.slice(1)); if (!base) return false
    return v.major===base.major&&v.minor===base.minor&&v.patch>=base.patch
  }
  if (r.startsWith('>=')) { return (compareSemver(version,r.slice(2))??-1)>=0 }
  if (r.startsWith('>'))  { return (compareSemver(version,r.slice(1))??-1)>0 }
  if (r.startsWith('<=')) { return (compareSemver(version,r.slice(2))??1)<=0 }
  if (r.startsWith('<'))  { return (compareSemver(version,r.slice(1))??1)<0 }
  return compareSemver(version,r)===0
}

export default function SemverCheckerPage() {
  const [versions, setVersions] = useState('1.0.0\n1.2.3\n2.0.0\n2.1.0-beta.1\n3.0.0')
  const [range, setRange] = useState('^1.0.0')
  const [sortMode, setSortMode] = useState('asc')

  const parsed = useMemo(() =>
    versions.trim().split('\n').map(v => v.trim()).filter(Boolean)
      .map(v => ({ raw:v, parsed:parseSemver(v), matches:satisfiesSemver(v,range) }))
  , [versions,range])

  const sorted = useMemo(() =>
    [...parsed].sort((a,b) => { const c=compareSemver(a.raw,b.raw)??0; return sortMode==='asc'?c:-c })
  , [parsed,sortMode])

  return (
    <ToolLayout title="Semver Checker" description="Parse npm semantic version ranges and check compatibility">
      <div className="one-col">
        <div className="two-col">
          <div>
            <label>Versions (one per line)</label>
            <textarea value={versions} onChange={e=>setVersions(e.target.value)} style={{ minHeight:200, fontSize:14, fontFamily:'var(--font-mono)' }} spellCheck={false} />
          </div>
          <div>
            <label>Range / Constraint</label>
            <input type="text" value={range} onChange={e=>setRange(e.target.value)} style={{ fontFamily:'var(--font-mono)', fontSize:16, marginBottom:12 }} placeholder="^1.0.0 or >=2.0.0 or ~1.2.0" />
            <div style={{ fontSize:13, color:'var(--text-dim)', lineHeight:1.9, background:'var(--bg)', border:'1px solid var(--border)', borderRadius:10, padding:'12px 14px' }}>
              <div><code style={{ color:'var(--accent)' }}>^1.2.3</code> — compatible with 1.x.x</div>
              <div><code style={{ color:'var(--accent)' }}>~1.2.3</code> — approximately 1.2.x</div>
              <div><code style={{ color:'var(--accent)' }}>{`>=1.0.0`}</code> — at least 1.0.0</div>
              <div><code style={{ color:'var(--accent)' }}>{`<2.0.0`}</code> — below 2.0.0</div>
              <div><code style={{ color:'var(--accent)' }}>1.2.3</code> — exactly 1.2.3</div>
            </div>
          </div>
        </div>
        <div>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
            <div className="section-label">Results ({parsed.filter(p=>p.matches).length} match range "{range}")</div>
            <select value={sortMode} onChange={e=>setSortMode(e.target.value)} style={{ width:130, fontSize:12 }}>
              <option value="asc">Sort: Oldest first</option>
              <option value="desc">Sort: Newest first</option>
            </select>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
            {sorted.map(({ raw, parsed: pv, matches }) => (
              <div key={raw} style={{
                display:'flex', gap:14, alignItems:'center',
                background: matches ? 'var(--cat-gen-bg)' : 'var(--surface)',
                border:`1px solid ${matches ? 'var(--cat-gen)' : 'var(--border)'}`,
                borderRadius:10, padding:'11px 16px',
              }}>
                <span style={{ fontFamily:'var(--font-mono)', fontWeight:700, fontSize:15, minWidth:100 }}>{raw}</span>
                {pv && <span style={{ fontSize:12, color:'var(--text-muted)' }}>v{pv.major}.{pv.minor}.{pv.patch}{pv.pre?`-${pv.pre}`:''}</span>}
                <span style={{ marginLeft:'auto', fontSize:12, fontWeight:600, color: matches?'var(--cat-gen)':'var(--text-muted)' }}>{matches?'✓ matches':'✗ no match'}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </ToolLayout>
  )
}
