import { useState, useRef } from 'react'
import ToolLayout from '../components/ToolLayout'

// ── Types ────────────────────────────────────────────────────────────────────
type DiffLine = { type: 'add' | 'remove' | 'equal'; text: string; origLine: number | null; modLine: number | null }
type ChangeBlock = { startIdx: number; endIdx: number; leftLines: string[]; rightLines: string[] }
type ViewMode = 'split' | 'unified'

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
  const leftBanners  = new Map<number,string>()
  const rightBanners = new Map<number,string>()
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

// ── Change blocks ─────────────────────────────────────────────────────────────
function computeChangeBlocks(diff: DiffLine[]): ChangeBlock[] {
  const blocks: ChangeBlock[] = []
  let i = 0
  while (i < diff.length) {
    if (diff[i].type === 'equal') { i++; continue }
    const start = i
    const leftLines: string[] = [], rightLines: string[] = []
    while (i < diff.length && diff[i].type !== 'equal') {
      if (diff[i].type === 'remove') leftLines.push(diff[i].text)
      else rightLines.push(diff[i].text)
      i++
    }
    blocks.push({ startIdx: start, endIdx: i - 1, leftLines, rightLines })
  }
  return blocks
}

// ── Build merged output ───────────────────────────────────────────────────────
function buildMerged(diff: DiffLine[], choices: Map<number,'left'|'right'>, blocks: ChangeBlock[]): string {
  const blockByStart = new Map(blocks.map((b,i) => [b.startIdx, i]))
  const lines: string[] = []
  let i = 0
  while (i < diff.length) {
    if (diff[i].type === 'equal') { lines.push(diff[i].text); i++ }
    else {
      const bi = blockByStart.get(i)!
      const block = blocks[bi]
      const choice = choices.get(bi) ?? 'right'
      lines.push(...(choice === 'left' ? block.leftLines : block.rightLines))
      i = block.endIdx + 1
    }
  }
  return lines.join('\n')
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
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'7px 16px', background:'var(--surface2)', borderBottom:'1px solid var(--border)', flexShrink:0 }}>
        <span style={{ fontSize:13, fontWeight:600, color:'var(--text-dim)', fontFamily:'var(--font-sans)' }}>{label}</span>
        <button onClick={openFile} style={{ display:'flex', alignItems:'center', gap:5, fontSize:12, color:'var(--text-muted)', background:'none', border:'none', cursor:'pointer', fontFamily:'var(--font-sans)', padding:0 }}>
          ↑ Open file
        </button>
        <input ref={fileRef} type="file" style={{ display:'none' }} onChange={onFile} />
      </div>
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
const STRIPES   = 'repeating-linear-gradient(-45deg, transparent, transparent 5px, oklch(1 0 0 / 0.03) 5px, oklch(1 0 0 / 0.03) 10px)'

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
  const [viewMode, setViewMode] = useState<ViewMode>('split')
  const [activeBlock, setActiveBlock] = useState<number | null>(null)
  const [mergeChoices, setMergeChoices] = useState<Map<number,'left'|'right'>>(new Map())
  const scrollRef = useRef<HTMLDivElement>(null)

  const doCompare = () => { setDiff(computeDiff(left, right)); setActiveBlock(null); setMergeChoices(new Map()) }
  const doClear   = () => { setLeft(''); setRight(''); setDiff(null); setActiveBlock(null); setMergeChoices(new Map()) }

  const hasDiff    = Array.isArray(diff)
  const d          = hasDiff ? diff as DiffLine[] : []
  const added      = hasDiff ? d.filter(l=>l.type==='add').length    : 0
  const removed    = hasDiff ? d.filter(l=>l.type==='remove').length : 0
  const identical  = hasDiff && added === 0 && removed === 0
  const showDiffArea = hasDiff && !identical

  // Change blocks + maps
  const changeBlocks = showDiffArea ? computeChangeBlocks(d) : []
  const blockByStart = new Map(changeBlocks.map((b,i) => [b.startIdx, i]))
  const blockByEnd   = new Map(changeBlocks.map((b,i) => [b.endIdx,   i]))
  const lineToBlock  = new Map<number,number>()
  changeBlocks.forEach((b,i) => { for(let k=b.startIdx; k<=b.endIdx; k++) lineToBlock.set(k,i) })

  // Pre-compute word-diff pairs
  const removePairs = new Map<number,number>()
  const addPairs    = new Map<number,number>()
  if (hasDiff) {
    for (let x=0;x<d.length-1;x++) if (d[x].type==='remove'&&d[x+1].type==='add') { removePairs.set(x,x+1); addPairs.set(x+1,x) }
  }

  const { leftBanners, rightBanners } = hasDiff ? detectMoved(d) : { leftBanners: new Map(), rightBanners: new Map() }

  const copyText = (t:string) => navigator.clipboard.writeText(t)

  const navToBlock = (idx: number) => {
    const clamped = Math.max(0, Math.min(changeBlocks.length - 1, idx))
    setActiveBlock(clamped)
    requestAnimationFrame(() => {
      const el = scrollRef.current?.querySelector(`[data-block-start="${clamped}"]`)
      el?.scrollIntoView({ behavior:'smooth', block:'center' })
    })
  }

  const exportMerged = () => {
    const merged = buildMerged(d, mergeChoices, changeBlocks)
    const url = URL.createObjectURL(new Blob([merged], { type:'text/plain' }))
    const a = document.createElement('a'); a.href = url; a.download = 'merged.txt'; a.click()
    URL.revokeObjectURL(url)
  }

  const setChoice = (bi: number, side: 'left'|'right') =>
    setMergeChoices(m => { const nm = new Map(m); nm.set(bi, side); return nm })

  // ── Block Header (Floating style inside block) ──
  const renderBlockHeader = (bi: number) => {
    if (activeBlock !== bi) return null
    return (
      <div style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 16px', background:'oklch(0.18 0.02 260)', borderBottom:'1px solid var(--border)', borderTopLeftRadius:10, borderTopRightRadius:10, fontFamily:'var(--font-sans)', fontSize:12, flexShrink:0 }}>
        <span style={{ color:'var(--text-dim)', fontWeight:600 }}>Change {bi+1} of {changeBlocks.length}</span>
        <div style={{ display:'flex', gap:6 }}>
          <button onClick={(e)=>{e.stopPropagation(); navToBlock(bi-1)}} disabled={bi===0} className="btn-ghost" style={{height:24,padding:'0 10px',fontSize:11,display:'flex',alignItems:'center',gap:4,opacity:bi===0?.4:1,background:'oklch(0.25 0.02 260)',borderRadius:6}}>↑ Previous</button>
          <button onClick={(e)=>{e.stopPropagation(); navToBlock(bi+1)}} disabled={bi===changeBlocks.length-1} className="btn-ghost" style={{height:24,padding:'0 10px',fontSize:11,display:'flex',alignItems:'center',gap:4,opacity:bi===changeBlocks.length-1?.4:1,background:'oklch(0.25 0.02 260)',borderRadius:6}}>↓ Next</button>
        </div>
      </div>
    )
  }

  // ── Merge bar rendered at bottom of each change block ──
  const renderMergeBar = (bi: number) => {
    if (activeBlock !== bi) return null
    const choice = mergeChoices.get(bi)
    const barBg  = 'oklch(0.18 0.02 260)'
    const barBorder = `1px solid var(--border)`

    const btnL: React.CSSProperties = {
      display:'flex', alignItems:'center', gap:6, padding:'6px 18px',
      fontSize:12, borderRadius:8, cursor:'pointer', border:'none',
      fontFamily:'var(--font-sans)', fontWeight:600, color:'#fff',
      background: choice==='left' ? 'oklch(0.58 0.20 25)' : 'oklch(0.52 0.22 25 / 0.88)',
      boxShadow: choice==='left' ? '0 0 0 2px oklch(0.72 0.18 25 / .45)' : 'none',
      transition:'all .15s',
    }
    const btnR: React.CSSProperties = {
      display:'flex', alignItems:'center', gap:6, padding:'6px 18px',
      fontSize:12, borderRadius:8, cursor:'pointer', border:'none',
      fontFamily:'var(--font-sans)', fontWeight:600, color:'#fff',
      background: choice==='right' ? 'oklch(0.52 0.17 165)' : 'oklch(0.46 0.18 165 / 0.88)',
      boxShadow: choice==='right' ? '0 0 0 2px oklch(0.68 0.15 165 / .45)' : 'none',
      transition:'all .15s',
    }
    return (
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:14, padding:'12px 16px', background:barBg, borderTop:barBorder, borderBottomLeftRadius:10, borderBottomRightRadius:10 }}>
        <button onClick={(e)=>{e.stopPropagation(); setChoice(bi,'left')}} style={btnL}>
          {choice==='left' && <span style={{fontSize:11}}>✓</span>} Merge change <span style={{fontSize:15,lineHeight:1}}>›</span>
        </button>
        <button onClick={(e)=>{e.stopPropagation(); setActiveBlock(null)}} title="Close merge options" style={{ background:'oklch(0.25 0.02 260)', border:'1px solid var(--border)', borderRadius:'50%', width:28, height:28, cursor:'pointer', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, flexShrink:0, transition:'all .15s', fontWeight:700 }}>×</button>
        <button onClick={(e)=>{e.stopPropagation(); setChoice(bi,'right')}} style={btnR}>
          <span style={{fontSize:15,lineHeight:1}}>‹</span> Merge change {choice==='right' && <span style={{fontSize:11}}>✓</span>}
        </button>
      </div>
    )
  }

  // ── Render ──
  return (
    <ToolLayout title="Diff Checker" description="Compare two texts and highlight additions and deletions line by line." fullWidth>
      <div style={{ display:'flex', flexDirection:'column', flex:1, minHeight:0 }}>

        {/* ════ TOP CONTROLS ════ */}
        <div style={{ flexShrink:0, display:'flex', alignItems:'center', gap:12, marginBottom:10, marginTop:8, flexWrap:'wrap' }}>
          <button onClick={doClear} className="btn-ghost" style={{fontSize:13,padding:'4px 14px'}}>Clear</button>
          {/* Split / Unified pill */}
          <div style={{ display:'flex', borderRadius:8, overflow:'hidden', border:'1px solid var(--border)', flexShrink:0 }}>
            {(['split','unified'] as ViewMode[]).map(m => (
              <button key={m} onClick={()=>setViewMode(m)} style={{ padding:'4px 14px', fontSize:12, border:'none', cursor:'pointer', fontFamily:'var(--font-sans)', fontWeight:500, textTransform:'capitalize', background: viewMode===m ? 'var(--accent)' : 'var(--surface)', color: viewMode===m ? '#fff' : 'var(--text-muted)', transition:'background .15s,color .15s' }}>{m}</button>
            ))}
          </div>
          {showDiffArea && (
            <>
              <span style={{ fontSize:12, color:'var(--text-muted)', fontFamily:'var(--font-sans)' }}>
                {mergeChoices.size}/{changeBlocks.length} resolved
              </span>
              <button onClick={exportMerged} className="btn-ghost" style={{fontSize:13,padding:'4px 14px',color:'var(--accent)',marginLeft:'auto'}}>
                ↓ Export .txt
              </button>
            </>
          )}
        </div>

        {/* ════ DIFF AREA ════ */}
        {showDiffArea && <div style={{ flex:1, minHeight:0, display:'flex', flexDirection:'column', border:'1px solid var(--border)', borderRadius:12, overflow:'hidden', marginBottom:12 }}>
          {/* keep scrollRef on the inner scroll area — wired below */}

          {typeof diff === 'string' && diff === 'too-large' && (
            <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', padding:32, color:'oklch(0.75 0.14 25)', fontSize:13 }}>
              ⚠ Files too large. Try smaller sections (limit: ~2800×2800 lines).
            </div>
          )}

          {showDiffArea && (<>
            {/* Stats header - Screenshot style */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr auto 1fr', alignItems:'center', background:'var(--surface2)', borderBottom:'1px solid var(--border)', flexShrink:0 }}>
              {/* Left Side (Removals) */}
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 16px', borderRight:'1px solid var(--border)' }}>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <span style={{ color:'oklch(0.65 0.18 25)', fontSize:18 }}>⊖</span>
                  <span style={{ fontWeight:600, fontSize:13, color:'oklch(0.65 0.18 25)', fontFamily:'var(--font-sans)' }}>{removed} removals</span>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:10, fontSize:12, color:'var(--text-muted)', fontFamily:'var(--font-sans)' }}>
                  <span>{left.split('\n').length.toLocaleString()} lines</span>
                  <button onClick={()=>copyText(left)} className="btn-ghost" style={{height:24,padding:'0 8px',fontSize:12,fontWeight:600}}>Copy</button>
                </div>
              </div>

              {/* Center Icon */}
              <div style={{ padding:'0 12px', color:'var(--text-muted)', fontSize:16, userSelect:'none' }}>⇄</div>

              {/* Right Side (Additions) */}
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 16px', borderLeft:'1px solid var(--border)' }}>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <span style={{ color:'oklch(0.72 0.15 145)', fontSize:18 }}>⊕</span>
                  <span style={{ fontWeight:600, fontSize:13, color:'oklch(0.72 0.15 145)', fontFamily:'var(--font-sans)' }}>{added} additions</span>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:10, fontSize:12, color:'var(--text-muted)', fontFamily:'var(--font-sans)' }}>
                  <span>{right.split('\n').length.toLocaleString()} lines</span>
                  <button onClick={()=>copyText(right)} className="btn-ghost" style={{height:24,padding:'0 8px',fontSize:12,fontWeight:600}}>Copy</button>
                </div>
              </div>
            </div>



            {viewMode === 'unified' ? (
              /* ── Unified mode ── */
              <div ref={scrollRef} style={{ overflowY:'auto', flex:1, fontFamily:'var(--font-mono)', fontSize:13 }}>
                <div style={{ display:'grid', gridTemplateColumns:`${LN_W}px ${LN_W}px 18px 1fr`, background:'var(--surface2)', borderBottom:'1px solid var(--border)', padding:'3px 0', fontSize:11, color:'var(--text-muted)', fontWeight:600, textTransform:'uppercase', letterSpacing:'.06em', fontFamily:'var(--font-sans)' }}>
                  <div style={{textAlign:'right',paddingRight:10}}>Old</div>
                  <div style={{textAlign:'right',paddingRight:10}}>New</div>
                  <div/>
                  <div style={{paddingLeft:10}}>Content</div>
                </div>
                {d.map((line,idx)=>{
                  const blockStartIdx = blockByStart.get(idx)
                  const blockEndIdx   = blockByEnd.get(idx)
                  const isCur = (activeBlock !== null) && (idx >= changeBlocks[activeBlock].startIdx && idx <= changeBlocks[activeBlock].endIdx)

                  return (
                    <div key={idx} data-block-start={blockStartIdx !== undefined ? blockStartIdx : undefined}
                      onClick={()=>{ const bi = lineToBlock.get(idx); if(bi!==undefined) setActiveBlock(bi) }}
                      style={{ 
                        margin: (activeBlock !== null && blockStartIdx === activeBlock) ? '12px 12px 0 12px' : (activeBlock !== null && blockEndIdx === activeBlock) ? '0 12px 12px 12px' : (isCur ? '0 12px' : '0'),
                        borderRadius: (activeBlock !== null && blockStartIdx === activeBlock) ? '10px 10px 0 0' : (activeBlock !== null && blockEndIdx === activeBlock) ? '0 0 10px 10px' : 0,
                        boxShadow: isCur ? '0 4px 20px rgba(0,0,0,0.4)' : 'none',
                        borderLeft: isCur ? '1px solid var(--border)' : 'none',
                        borderRight: isCur ? '1px solid var(--border)' : 'none',
                        background: isCur ? 'oklch(0.15 0.01 260)' : 'transparent',
                        position: 'relative',
                        zIndex: isCur ? 10 : 1,
                        transition: 'all .2s',
                        cursor: line.type !== 'equal' ? 'pointer' : 'default'
                      }}
                    >
                      {blockStartIdx !== undefined && renderBlockHeader(blockStartIdx)}
                      <div style={{ display:'grid', gridTemplateColumns:`${LN_W}px ${LN_W}px 18px 1fr`, background:line.type==='remove'?REMOVE_BG:line.type==='add'?ADD_BG:'transparent', borderLeft:`3px solid ${line.type==='remove'?'oklch(0.65 0.18 25 / .6)':line.type==='add'?'oklch(0.72 0.15 145 / .6)':'transparent'}`, minHeight:22 }}>
                        <div style={lnSt}>{line.origLine??''}</div>
                        <div style={lnSt}>{line.modLine??''}</div>
                        <div style={{textAlign:'center',paddingTop:2,color:line.type==='add'?'oklch(0.72 0.15 145)':line.type==='remove'?'oklch(0.65 0.18 25)':'transparent',userSelect:'none',fontSize:12}}>
                          {line.type==='add'?'+':line.type==='remove'?'−':''}
                        </div>
                        <div style={{paddingLeft:10,paddingTop:2,paddingBottom:2,whiteSpace:'pre',overflowX:'auto',color:line.type==='remove'?'oklch(0.88 0.10 25)':line.type==='add'?'oklch(0.88 0.10 145)':'var(--text-dim)'}}>
                          {line.text||' '}
                        </div>
                      </div>
                      {blockEndIdx !== undefined && renderMergeBar(blockEndIdx)}
                    </div>
                  )
                })}
              </div>
            ) : (
              /* ── Split mode ── */
              <div ref={scrollRef} style={{ overflowY:'auto', flex:1, fontFamily:'var(--font-mono)', fontSize:13 }}>
                {d.map((line,idx)=>{
                  const lb = leftBanners.get(idx)
                  const rb = rightBanners.get(idx)
                  const pairForRemove = removePairs.get(idx)
                  const pairForAdd    = addPairs.get(idx)
                  const blockStartIdx = blockByStart.get(idx)
                  const blockEndIdx   = blockByEnd.get(idx)
                  const isCurBlock    = (activeBlock !== null) && (blockStartIdx === activeBlock || blockEndIdx === activeBlock ||
                    (changeBlocks[activeBlock] && idx >= changeBlocks[activeBlock].startIdx && idx <= changeBlocks[activeBlock].endIdx))

                  return (
                    <div key={idx}
                      data-block-start={blockStartIdx !== undefined ? blockStartIdx : undefined}
                      onClick={() => { const bi = lineToBlock.get(idx); if(bi!==undefined) setActiveBlock(bi) }}
                      style={{ 
                        margin: (activeBlock !== null && blockStartIdx === activeBlock) ? '12px 12px 0 12px' : (activeBlock !== null && blockEndIdx === activeBlock) ? '0 12px 12px 12px' : (isCurBlock ? '0 12px' : '0'),
                        borderRadius: (activeBlock !== null && blockStartIdx === activeBlock) ? '10px 10px 0 0' : (activeBlock !== null && blockEndIdx === activeBlock) ? '0 0 10px 10px' : 0,
                        boxShadow: isCurBlock ? '0 4px 20px rgba(0,0,0,0.4)' : 'none',
                        borderLeft: isCurBlock ? '1px solid var(--border)' : 'none',
                        borderRight: isCurBlock ? '1px solid var(--border)' : 'none',
                        background: isCurBlock ? 'oklch(0.15 0.01 260)' : 'transparent',
                        position: 'relative',
                        zIndex: isCurBlock ? 10 : 1,
                        transition: 'all .2s',
                        cursor: line.type !== 'equal' ? 'pointer' : 'default'
                      }}
                    >
                      {blockStartIdx !== undefined && renderBlockHeader(blockStartIdx)}

                      {/* Moved-block banner */}
                      {(lb||rb) && (
                        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', fontSize:12, fontStyle:'italic', fontFamily:'var(--font-sans)' }}>
                          <div style={{ padding:'3px 12px', borderRight:'1px solid var(--border)', color:'oklch(0.65 0.18 25 / .8)', background:'oklch(0.65 0.18 25 / .06)' }}>{lb??''}</div>
                          <div style={{ padding:'3px 12px', color:'oklch(0.72 0.15 145 / .8)', background:'oklch(0.72 0.15 145 / .06)' }}>{rb??''}</div>
                        </div>
                      )}
                      
                      {/* Aligned diff row */}
                      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', minHeight:22 }}>
                        {/* LEFT */}
                        <div style={{ 
                          display:'flex', 
                          borderRight:'1px solid var(--border)', 
                          backgroundColor: line.type==='remove' ? REMOVE_BG : line.type==='add' ? ADD_BG : 'transparent',
                          backgroundImage: line.type==='add' ? STRIPES : 'none',
                          borderLeft:`3px solid ${line.type==='remove'?'oklch(0.65 0.18 25 / .6)':'transparent'}` 
                        }}>
                          {line.type!=='add' ? (<>
                            <div style={lnSt}>{line.origLine??''}</div>
                            <div style={{flex:1,paddingLeft:10,paddingTop:2,paddingBottom:2,whiteSpace:'pre',overflowX:'hidden',color:line.type==='remove'?'oklch(0.88 0.10 25)':'var(--text-dim)'}}>
                              {line.type==='remove'&&pairForRemove!==undefined
                                ? wordDiff(line.text, d[pairForRemove].text, 'from', 'oklch(0.65 0.18 25 / .42)')
                                : (line.text||' ')}
                            </div>
                          </>) : <div style={{flex:1}}/>}
                        </div>
                        {/* RIGHT */}
                        <div style={{ 
                          display:'flex', 
                          backgroundColor: line.type==='add' ? ADD_BG : line.type==='remove' ? REMOVE_BG : 'transparent',
                          backgroundImage: line.type==='remove' ? STRIPES : 'none',
                          borderLeft:`3px solid ${line.type==='add'?'oklch(0.72 0.15 145 / .6)':'transparent'}` 
                        }}>
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

                      {blockEndIdx !== undefined && renderMergeBar(blockEndIdx)}
                    </div>
                  )
                })}
              </div>
            )}
          </>)}
        </div>}

        {/* ════ INPUT PANELS ════ */}
        <div className="diff-inputs" style={{ flexShrink:0, height: showDiffArea ? 200 : undefined, flex: showDiffArea ? '0 0 200px' : 1, display:'grid', gridTemplateColumns:'1fr 1fr', border:'1px solid var(--border)', borderRadius:12, overflow:'hidden', marginBottom:10 }}>
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
