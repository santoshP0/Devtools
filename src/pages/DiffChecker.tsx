import { useState, useRef } from 'react'
import ToolLayout from '../components/ToolLayout'

// ── Types ────────────────────────────────────────────────────────────────────
type DiffLine = { type: 'add' | 'remove' | 'equal'; text: string; origLine: number | null; modLine: number | null }

// ── LCS diff ─────────────────────────────────────────────────────────────────
function computeDiff(a: string, b: string): DiffLine[] | 'too-large' {
  const A = a.split('\n'), B = b.split('\n')
  const m = A.length, n = B.length
  if (m * n > 8_000_000) return 'too-large'
  const dp = new Int32Array((m + 1) * (n + 1)), W = n + 1
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i*W+j] = A[i-1] === B[j-1] ? dp[(i-1)*W+(j-1)]+1 : Math.max(dp[(i-1)*W+j], dp[i*W+(j-1)])
  const res: DiffLine[] = []
  let i = m, j = n
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && A[i-1] === B[j-1]) { res.unshift({ type:'equal',  text:A[i-1], origLine:i, modLine:j }); i--; j-- }
    else if (j>0 && (i===0 || dp[i*W+(j-1)] >= dp[(i-1)*W+j])) { res.unshift({ type:'add',    text:B[j-1], origLine:null, modLine:j }); j-- }
    else { res.unshift({ type:'remove', text:A[i-1], origLine:i, modLine:null }); i-- }
  }
  return res
}

// ── Detect moved blocks ───────────────────────────────────────────────────────
function detectMoved(diff: DiffLine[]) {
  type Blk = { type: 'remove'|'add'; start: number; end: number; text: string; lines: DiffLine[] }
  const blocks: Blk[] = []
  let i = 0
  while (i < diff.length) {
    const t = diff[i].type
    if (t === 'remove' || t === 'add') {
      let j = i
      while (j < diff.length && diff[j].type === t) j++
      const lines = diff.slice(i, j)
      blocks.push({ type: t, start: i, end: j-1, text: lines.map(l=>l.text).join('\n'), lines })
      i = j
    } else i++
  }
  const leftBanners  = new Map<number,string>()  // diffIdx → banner text for left panel
  const rightBanners = new Map<number,string>()  // diffIdx → banner text for right panel
  const removes = blocks.filter(b=>b.type==='remove')
  const adds    = blocks.filter(b=>b.type==='add')
  for (const rb of removes) {
    if (rb.lines.length < 2) continue
    for (const ab of adds) {
      if (rb.text !== ab.text) continue
      const modNums  = ab.lines.map(l=>l.modLine!).filter(Boolean)
      const origNums = rb.lines.map(l=>l.origLine!).filter(Boolean)
      leftBanners.set(rb.start,  `Text moved to lines ${Math.min(...modNums)}–${Math.max(...modNums)}`)
      rightBanners.set(ab.start, `Text moved from lines ${Math.min(...origNums)}–${Math.max(...origNums)}`)
      break
    }
  }
  return { leftBanners, rightBanners }
}

// ── Word-level highlight ──────────────────────────────────────────────────────
function wordDiff(fromText: string, toText: string, side: 'from'|'to', bg: string): React.ReactNode {
  const src = (side==='from' ? fromText : toText).split(/(\s+)/)
  const cmp = (side==='from' ? toText : fromText).split(/(\s+)/)
  const m = src.length, n = cmp.length
  const dp = new Int32Array((m+1)*(n+1)), W = n+1
  for (let i=1;i<=m;i++) for (let j=1;j<=n;j++)
    dp[i*W+j] = src[i-1]===cmp[j-1] ? dp[(i-1)*W+(j-1)]+1 : Math.max(dp[(i-1)*W+j], dp[i*W+(j-1)])
  type P = {text:string;changed:boolean}
  const parts:P[]=[]
  let ii=m, jj=n
  while (ii>0||jj>0) {
    if (ii>0&&jj>0&&src[ii-1]===cmp[jj-1]) { parts.unshift({text:src[ii-1],changed:false}); ii--; jj-- }
    else if (jj>0&&(ii===0||dp[ii*W+(jj-1)]>=dp[(ii-1)*W+jj])) { jj-- }
    else { parts.unshift({text:src[ii-1],changed:true}); ii-- }
  }
  return <>{parts.map((p,k)=>p.changed
    ? <mark key={k} style={{background:bg,color:'inherit',borderRadius:2,padding:'0 1px'}}>{p.text}</mark>
    : <span key={k}>{p.text}</span>)}</>
}

// ── Line-numbered textarea with file open ─────────────────────────────────────
const LH = 20

function CodeInput({ label, value, onChange }: { label:string; value:string; onChange:(v:string)=>void }) {
  const taRef  = useRef<HTMLTextAreaElement>(null)
  const gutRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const lineCount = value ? value.split('\n').length : 1

  const openFile = () => fileRef.current?.click()
  const onFile   = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return
    const r = new FileReader(); r.onload = () => onChange(r.result as string); r.readAsText(f)
    e.target.value = ''
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', minHeight:0, flex:1 }}>
      {/* Panel header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'7px 16px', background:'var(--surface2)', borderBottom:'1px solid var(--border)', flexShrink:0 }}>
        <span style={{ fontSize:13, fontWeight:600, color:'var(--text-dim)', fontFamily:'var(--font-sans)' }}>{label}</span>
        <button onClick={openFile} style={{ display:'flex', alignItems:'center', gap:5, fontSize:12, color:'var(--text-muted)', background:'none', border:'none', cursor:'pointer', fontFamily:'var(--font-sans)', padding:0 }}>
          ↑ Open file
        </button>
        <input ref={fileRef} type="file" style={{ display:'none' }} onChange={onFile} />
      </div>
      {/* Textarea with gutter */}
      <div style={{ display:'flex', flex:1, overflow:'hidden', background:'var(--surface)', fontFamily:'var(--font-mono)', fontSize:13 }}>
        <div ref={gutRef} style={{ width:46, flexShrink:0, overflowY:'hidden', padding:'8px 8px 8px 0', textAlign:'right', color:'var(--text-muted)', userSelect:'none', borderRight:'1px solid var(--border)', lineHeight:`${LH}px`, fontSize:12 }}>
          {Array.from({length:lineCount},(_,i)=><div key={i} style={{height:LH}}>{i+1}</div>)}
        </div>
        <textarea ref={taRef} value={value} onChange={e=>onChange(e.target.value)} spellCheck={false}
          onScroll={()=>{ if(gutRef.current&&taRef.current) gutRef.current.scrollTop=taRef.current.scrollTop }}
          style={{ flex:1, resize:'none', border:'none', outline:'none', background:'transparent', color:'var(--text)', fontFamily:'var(--font-mono)', fontSize:13, lineHeight:`${LH}px`, padding:'8px 12px', overflowY:'auto' }}
        />
      </div>
    </div>
  )
}

// ── Shared diff row styles ────────────────────────────────────────────────────
const LN_W = 46

const REMOVE_BG = 'oklch(0.65 0.18 25 / 0.15)'
const ADD_BG    = 'oklch(0.72 0.15 145 / 0.15)'
const PH_BG     = 'oklch(0.11 0.015 250)'  // placeholder (mismatched line slot)

const lnSt: React.CSSProperties = {
  width:LN_W, minWidth:LN_W, flexShrink:0, textAlign:'right',
  paddingRight:10, paddingTop:2, paddingBottom:2,
  color:'var(--text-muted)', userSelect:'none',
  fontFamily:'var(--font-mono)', fontSize:12,
  borderRight:'1px solid var(--border)',
}

// ── Main component ────────────────────────────────────────────────────────────
export default function DiffChecker() {
  const [left,   setLeft]   = useState('')
  const [right,  setRight]  = useState('')
  const [diff,   setDiff]   = useState<DiffLine[]|'too-large'|null>(null)
  const [inline, setInline] = useState(false)

  const doCompare = () => setDiff(computeDiff(left, right))
  const doClear   = () => { setLeft(''); setRight(''); setDiff(null) }

  const hasDiff    = Array.isArray(diff)
  const d          = hasDiff ? diff as DiffLine[] : []
  const added      = hasDiff ? d.filter(l=>l.type==='add').length    : 0
  const removed    = hasDiff ? d.filter(l=>l.type==='remove').length : 0
  const identical  = hasDiff && added === 0 && removed === 0
  const showDiffArea = hasDiff && !identical

  // Pre-compute word-diff pairs (adjacent remove→add)
  const removePairs = new Map<number,number>()
  const addPairs    = new Map<number,number>()
  if (hasDiff) {
    for (let x=0;x<d.length-1;x++) if (d[x].type==='remove'&&d[x+1].type==='add') { removePairs.set(x,x+1); addPairs.set(x+1,x) }
  }

  // Moved blocks
  const { leftBanners, rightBanners } = hasDiff ? detectMoved(d) : { leftBanners: new Map(), rightBanners: new Map() }

  const copyText = (t:string) => navigator.clipboard.writeText(t)

  // ── Render ──
  return (
    <ToolLayout title="Diff Checker" description="Compare two texts and highlight additions and deletions line by line." fullWidth>
      <div style={{ display:'flex', flexDirection:'column', flex:1, minHeight:0 }}>

        {/* ════ TOP CONTROLS (Clear + Inline switch) ════ */}
        <div style={{ flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', gap:16, marginBottom:10, marginTop:8 }}>
          <button onClick={doClear} className="btn-ghost" style={{fontSize:13,padding:'4px 14px'}}>Clear</button>
          <label style={{ display:'flex', alignItems:'center', gap:8, fontSize:13, color:'var(--text-dim)', cursor:'pointer', userSelect:'none' }}>
            {/* Toggle switch */}
            <span onClick={()=>setInline(v=>!v)} style={{ position:'relative', display:'inline-block', width:36, height:20, flexShrink:0, cursor:'pointer' }}>
              <span style={{ position:'absolute', inset:0, borderRadius:20, background: inline ? 'var(--accent)' : 'var(--surface2)', border:'1px solid var(--border)', transition:'background 0.2s' }} />
              <span style={{ position:'absolute', top:3, left: inline ? 19 : 3, width:14, height:14, borderRadius:'50%', background:'#fff', transition:'left 0.2s', boxShadow:'0 1px 3px rgba(0,0,0,.4)' }} />
            </span>
            Inline mode
          </label>
        </div>

        {/* ════ DIFF AREA (top, takes remaining space) ════ */}
        {showDiffArea && <div style={{ flex:1, minHeight:0, display:'flex', flexDirection:'column', border:'1px solid var(--border)', borderRadius:12, overflow:'hidden', marginBottom:12 }}>

          {/* Too large */}
          {diff==='too-large' && (
            <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', padding:32, color:'oklch(0.75 0.14 25)', fontSize:13 }}>
              ⚠ Files too large. Try smaller sections (limit: ~2800×2800 lines).
            </div>
          )}

          {/* ── Diff result ── */}
          {showDiffArea && (<>
            {/* Stats header */}
            {inline ? (
              <div style={{ display:'flex', alignItems:'center', padding:'8px 16px', background:'var(--surface2)', borderBottom:'1px solid var(--border)', flexShrink:0, gap:20 }}>
                <span style={{ fontWeight:600, fontSize:13, color:'oklch(0.72 0.14 25)', fontFamily:'var(--font-sans)' }}>⊖ {removed} removals</span>
                <span style={{ fontWeight:600, fontSize:13, color:'oklch(0.72 0.15 145)', fontFamily:'var(--font-sans)' }}>⊕ {added} additions</span>
                <div style={{ marginLeft:'auto', display:'flex', gap:8 }}>
                  <button onClick={()=>copyText(left)}  className="btn-ghost" style={{height:26,padding:'0 10px',fontSize:12}}>Copy original</button>
                  <button onClick={()=>copyText(right)} className="btn-ghost" style={{height:26,padding:'0 10px',fontSize:12}}>Copy modified</button>
                </div>
              </div>
            ) : (
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', flexShrink:0, background:'var(--surface2)', borderBottom:'1px solid var(--border)' }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 16px', borderRight:'1px solid var(--border)' }}>
                  <span style={{ fontWeight:600, fontSize:13, color:'oklch(0.72 0.14 25)', fontFamily:'var(--font-sans)' }}>⊖ {removed} removals</span>
                  <div style={{ display:'flex', alignItems:'center', gap:8, fontSize:12, color:'var(--text-muted)', fontFamily:'var(--font-sans)' }}>
                    <span>{left.split('\n').length.toLocaleString()} lines</span>
                    <button onClick={()=>copyText(left)} className="btn-ghost" style={{height:24,padding:'0 8px',fontSize:12}}>Copy</button>
                    <span style={{opacity:.4}}>→</span>
                  </div>
                </div>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 16px' }}>
                  <span style={{ fontWeight:600, fontSize:13, color:'oklch(0.72 0.15 145)', fontFamily:'var(--font-sans)' }}>⊕ {added} additions</span>
                  <div style={{ display:'flex', alignItems:'center', gap:8, fontSize:12, color:'var(--text-muted)', fontFamily:'var(--font-sans)' }}>
                    <span>{right.split('\n').length.toLocaleString()} lines</span>
                    <button onClick={()=>copyText(right)} className="btn-ghost" style={{height:24,padding:'0 8px',fontSize:12}}>Copy</button>
                  </div>
                </div>
              </div>
            )}

            {inline ? (
              /* ── Inline mode ── */
              <div style={{ overflowY:'auto', flex:1, fontFamily:'var(--font-mono)', fontSize:13 }}>
                {/* Column headers */}
                <div style={{ display:'grid', gridTemplateColumns:`${LN_W}px ${LN_W}px 18px 1fr`, background:'var(--surface2)', borderBottom:'1px solid var(--border)', padding:'3px 0', fontSize:11, color:'var(--text-muted)', fontWeight:600, textTransform:'uppercase', letterSpacing:'.06em', fontFamily:'var(--font-sans)' }}>
                  <div style={{textAlign:'right',paddingRight:10}}>Old</div>
                  <div style={{textAlign:'right',paddingRight:10}}>New</div>
                  <div/>
                  <div style={{paddingLeft:10}}>Content</div>
                </div>
                {d.map((line,idx)=>(
                  <div key={idx} style={{ display:'grid', gridTemplateColumns:`${LN_W}px ${LN_W}px 18px 1fr`, background:line.type==='remove'?REMOVE_BG:line.type==='add'?ADD_BG:'transparent', borderLeft:`3px solid ${line.type==='remove'?'oklch(0.65 0.18 25 / .6)':line.type==='add'?'oklch(0.72 0.15 145 / .6)':'transparent'}`, minHeight:22 }}>
                    <div style={lnSt}>{line.origLine??''}</div>
                    <div style={lnSt}>{line.modLine??''}</div>
                    <div style={{textAlign:'center',paddingTop:2,color:line.type==='add'?'oklch(0.72 0.15 145)':line.type==='remove'?'oklch(0.65 0.18 25)':'transparent',userSelect:'none',fontSize:12}}>
                      {line.type==='add'?'+':line.type==='remove'?'−':''}
                    </div>
                    <div style={{paddingLeft:10,paddingTop:2,paddingBottom:2,whiteSpace:'pre',overflowX:'auto',color:line.type==='remove'?'oklch(0.88 0.10 25)':line.type==='add'?'oklch(0.88 0.10 145)':'var(--text-dim)'}}>
                      {line.text||' '}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* ── Split mode — aligned rows, single scroll container ── */
              <div style={{ overflowY:'auto', flex:1, fontFamily:'var(--font-mono)', fontSize:13 }}>
                {d.map((line,idx)=>{
                  const lb = leftBanners.get(idx)
                  const rb = rightBanners.get(idx)
                  const pairForRemove = removePairs.get(idx)
                  const pairForAdd    = addPairs.get(idx)
                  return (
                    <div key={idx}>
                      {/* Moved-block banner row */}
                      {(lb||rb) && (
                        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', fontSize:12, fontStyle:'italic', fontFamily:'var(--font-sans)' }}>
                          <div style={{ padding:'3px 12px', borderRight:'1px solid var(--border)', color:'oklch(0.65 0.18 25 / .8)', background:'oklch(0.65 0.18 25 / .06)' }}>{lb??''}</div>
                          <div style={{ padding:'3px 12px', color:'oklch(0.72 0.15 145 / .8)', background:'oklch(0.72 0.15 145 / .06)' }}>{rb??''}</div>
                        </div>
                      )}
                      {/* Aligned diff row */}
                      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', minHeight:22 }}>
                        {/* LEFT cell */}
                        <div style={{ display:'flex', borderRight:'1px solid var(--border)', background:line.type==='remove'?REMOVE_BG:line.type==='add'?PH_BG:'transparent', borderLeft:`3px solid ${line.type==='remove'?'oklch(0.65 0.18 25 / .6)':'transparent'}` }}>
                          {line.type!=='add' ? (<>
                            <div style={lnSt}>{line.origLine??''}</div>
                            <div style={{flex:1,paddingLeft:10,paddingTop:2,paddingBottom:2,whiteSpace:'pre',overflowX:'hidden',color:line.type==='remove'?'oklch(0.88 0.10 25)':'var(--text-dim)'}}>
                              {line.type==='remove'&&pairForRemove!==undefined
                                ? wordDiff(line.text, d[pairForRemove].text, 'from', 'oklch(0.65 0.18 25 / .42)')
                                : (line.text||' ')}
                            </div>
                          </>) : <div style={{flex:1}}/>}
                        </div>
                        {/* RIGHT cell */}
                        <div style={{ display:'flex', background:line.type==='add'?ADD_BG:line.type==='remove'?PH_BG:'transparent', borderLeft:`3px solid ${line.type==='add'?'oklch(0.72 0.15 145 / .6)':'transparent'}` }}>
                          {line.type!=='remove' ? (<>
                            <div style={lnSt}>{line.modLine??''}</div>
                            <div style={{flex:1,paddingLeft:10,paddingTop:2,paddingBottom:2,whiteSpace:'pre',overflowX:'hidden',color:line.type==='add'?'oklch(0.88 0.10 145)':'var(--text-dim)'}}>
                              {line.type==='add'&&pairForAdd!==undefined
                                ? wordDiff(d[pairForAdd].text, line.text, 'to', 'oklch(0.72 0.15 145 / .44)')
                                : (line.text||' ')}
                            </div>
                          </>) : <div style={{flex:1}}/>}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </>)}
        </div>}

        {/* ════ INPUT PANELS (bottom, always visible) ════ */}
        <div style={{ flexShrink: showDiffArea ? 1 : 0, flex: !showDiffArea ? 1 : undefined, minHeight: showDiffArea ? 220 : 0, display:'grid', gridTemplateColumns:'1fr 1fr', border:'1px solid var(--border)', borderRadius:12, overflow:'hidden', marginBottom:10 }}>
          <div style={{ display:'flex', flexDirection:'column', borderRight:'1px solid var(--border)', minHeight:0 }}>
            <CodeInput label="Original text" value={left} onChange={setLeft} />
          </div>
          <div style={{ display:'flex', flexDirection:'column', minHeight:0 }}>
            <CodeInput label="Changed text" value={right} onChange={setRight} />
          </div>
        </div>

        {/* ════ IDENTICAL BANNER ════ */}
        {identical && (
          <div style={{ flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', gap:8, padding:'8px 0', color:'oklch(0.72 0.15 145)', fontSize:13, fontFamily:'var(--font-sans)', fontWeight:500 }}>
            <span>✓</span> Both files are identical
          </div>
        )}

        {/* ════ TOOLBAR ════ */}
        <div style={{ flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', paddingBottom:4 }}>
          <button onClick={doCompare} className="btn-primary" style={{padding:'8px 32px',fontSize:14}}>Compare</button>
        </div>

      </div>
    </ToolLayout>
  )
}
