import { useState, useMemo } from 'react'
import ToolLayout from '../components/ToolLayout'
import CopyBtn from '../components/CopyBtn'

const COLORS = ['oklch(0.72 0.16 195)','oklch(0.72 0.16 285)','oklch(0.72 0.15 145)','oklch(0.80 0.14 75)','oklch(0.72 0.16 25)','oklch(0.72 0.14 260)','oklch(0.75 0.16 200)','oklch(0.80 0.12 300)','oklch(0.70 0.16 60)']

export default function GridPlaygroundPage() {
  const [cols, setCols] = useState('1fr 1fr 1fr')
  const [rows, setRows] = useState('auto auto')
  const [gap, setGap] = useState(12)
  const [colGap, setColGap] = useState(12)
  const [rowGap, setRowGap] = useState(12)
  const [useGap, setUseGap] = useState(true)
  const [justify, setJustify] = useState('stretch')
  const [align, setAlign] = useState('stretch')
  const [itemCount, setItemCount] = useState(9)
  const [containerH, setContainerH] = useState(300)

  const colCount = useMemo(() => {
    try { return cols.trim().split(/\s+/).length } catch { return 3 }
  }, [cols])

  const css = useMemo(() => {
    const gapLine = useGap ? `  gap: ${gap}px;` : `  column-gap: ${colGap}px;\n  row-gap: ${rowGap}px;`
    return `.grid {\n  display: grid;\n  grid-template-columns: ${cols};\n  grid-template-rows: ${rows};\n${gapLine}\n  justify-items: ${justify};\n  align-items: ${align};\n}`
  }, [cols, rows, gap, colGap, rowGap, useGap, justify, align])

  const PRESETS = [
    { label:'2 col', cols:'1fr 1fr', rows:'auto' },
    { label:'3 col', cols:'1fr 1fr 1fr', rows:'auto' },
    { label:'4 col', cols:'repeat(4, 1fr)', rows:'auto' },
    { label:'Sidebar', cols:'250px 1fr', rows:'auto' },
    { label:'Holy Grail', cols:'200px 1fr 200px', rows:'auto' },
    { label:'Masonry 3', cols:'repeat(3, 1fr)', rows:'masonry' },
  ]

  return (
    <ToolLayout title="Grid Playground" description="Visually build CSS Grid layouts with live preview">
      <div className="one-col">
        <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
          {PRESETS.map(p => (
            <button key={p.label} onClick={() => { setCols(p.cols); setRows(p.rows) }} style={{
              padding:'6px 12px', borderRadius:8, border:'1px solid var(--border)', background:'transparent',
              color:'var(--text-dim)', cursor:'pointer', fontSize:12, fontFamily:'var(--font-sans)', transition:'all 0.15s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--surface2)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-dim)' }}
            >{p.label}</button>
          ))}
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
          <div>
            <label>grid-template-columns</label>
            <input type="text" value={cols} onChange={e => setCols(e.target.value)} style={{ fontFamily:'var(--font-mono)' }} />
          </div>
          <div>
            <label>grid-template-rows</label>
            <input type="text" value={rows} onChange={e => setRows(e.target.value)} style={{ fontFamily:'var(--font-mono)' }} />
          </div>
          <div>
            <div className="section-label">gap: {gap}px</div>
            <input type="range" min={0} max={48} value={gap} onChange={e => setGap(Number(e.target.value))} />
          </div>
          <div>
            <div className="section-label">items: {itemCount}</div>
            <input type="range" min={1} max={16} value={itemCount} onChange={e => setItemCount(Number(e.target.value))} />
          </div>
          <div>
            <div className="section-label">Container height: {containerH}px</div>
            <input type="range" min={100} max={600} value={containerH} onChange={e => setContainerH(Number(e.target.value))} />
          </div>
        </div>
        <div style={{
          display:'grid', gridTemplateColumns: cols, gridTemplateRows: rows === 'masonry' ? undefined : rows,
          gap, height: containerH, background:'var(--bg)', border:'2px dashed var(--border)', borderRadius:12, padding:12, transition:'all 0.2s', overflow:'hidden',
        }}>
          {Array.from({ length: itemCount }, (_, i) => (
            <div key={i} style={{
              background: COLORS[i % COLORS.length] + '33', border:`2px solid ${COLORS[i % COLORS.length]}`,
              borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center',
              fontFamily:'var(--font-mono)', fontWeight:700, fontSize:13, color: COLORS[i % COLORS.length],
              minHeight:40,
            }}>{i + 1}</div>
          ))}
        </div>
        <div>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
            <div className="section-label">Generated CSS</div>
            <CopyBtn text={css} />
          </div>
          <pre className="code-out" style={{ fontSize:13 }}>{css}</pre>
        </div>
      </div>
    </ToolLayout>
  )
}
