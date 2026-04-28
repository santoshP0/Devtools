import { useState, useMemo } from 'react'
import ToolLayout from '../components/ToolLayout'

function CopyBtn({ text, label = 'Copy' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false)
  const click = () => { navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500) }) }
  return <button className="btn btn-ghost btn-sm" onClick={click}>{copied ? '✓ Copied' : label}</button>
}

type JustifyContent = 'flex-start'|'flex-end'|'center'|'space-between'|'space-around'|'space-evenly'
type AlignItems = 'flex-start'|'flex-end'|'center'|'stretch'|'baseline'
type FlexDir = 'row'|'row-reverse'|'column'|'column-reverse'
type FlexWrap = 'nowrap'|'wrap'|'wrap-reverse'

const COLORS = ['oklch(0.72 0.16 195)','oklch(0.72 0.16 285)','oklch(0.72 0.15 145)','oklch(0.80 0.14 75)','oklch(0.72 0.16 25)','oklch(0.72 0.14 260)']

export default function FlexboxPlaygroundPage() {
  const [dir, setDir] = useState<FlexDir>('row')
  const [wrap, setWrap] = useState<FlexWrap>('wrap')
  const [justify, setJustify] = useState<JustifyContent>('flex-start')
  const [align, setAlign] = useState<AlignItems>('center')
  const [gap, setGap] = useState(12)
  const [itemCount, setItemCount] = useState(5)
  const [containerH, setContainerH] = useState(240)

  const css = useMemo(() => `.container {\n  display: flex;\n  flex-direction: ${dir};\n  flex-wrap: ${wrap};\n  justify-content: ${justify};\n  align-items: ${align};\n  gap: ${gap}px;\n}`, [dir, wrap, justify, align, gap])

  const Prop = ({ label, opts, val, set }: { label: string; opts: string[]; val: string; set: (v: string) => void }) => (
    <div>
      <div className="section-label">{label}</div>
      <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
        {opts.map(o => (
          <button key={o} onClick={() => set(o)} style={{
            padding:'5px 10px', borderRadius:7, border:'1px solid', cursor:'pointer', fontSize:12,
            fontFamily:'var(--font-mono)', transition:'all 0.15s',
            background: val === o ? 'var(--accent-bg)' : 'transparent',
            color: val === o ? 'var(--accent)' : 'var(--text-dim)',
            borderColor: val === o ? 'var(--accent-dim)' : 'var(--border)',
          }}>{o}</button>
        ))}
      </div>
    </div>
  )

  return (
    <ToolLayout title="Flexbox Playground" description="Visually explore CSS flexbox properties with live preview">
      <div className="one-col">
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
          <Prop label="flex-direction" opts={['row','row-reverse','column','column-reverse']} val={dir} set={v => setDir(v as FlexDir)} />
          <Prop label="flex-wrap" opts={['nowrap','wrap','wrap-reverse']} val={wrap} set={v => setWrap(v as FlexWrap)} />
          <Prop label="justify-content" opts={['flex-start','flex-end','center','space-between','space-around','space-evenly']} val={justify} set={v => setJustify(v as JustifyContent)} />
          <Prop label="align-items" opts={['flex-start','flex-end','center','stretch','baseline']} val={align} set={v => setAlign(v as AlignItems)} />
          <div>
            <div className="section-label">gap: {gap}px</div>
            <input type="range" min={0} max={48} value={gap} onChange={e => setGap(Number(e.target.value))} />
          </div>
          <div>
            <div className="section-label">items: {itemCount}</div>
            <input type="range" min={1} max={12} value={itemCount} onChange={e => setItemCount(Number(e.target.value))} />
          </div>
          <div>
            <div className="section-label">Container height: {containerH}px</div>
            <input type="range" min={100} max={500} value={containerH} onChange={e => setContainerH(Number(e.target.value))} />
          </div>
        </div>
        <div style={{
          display:'flex', flexDirection: dir, flexWrap: wrap, justifyContent: justify, alignItems: align, gap,
          height: containerH, background:'var(--bg)', border:'2px dashed var(--border)', borderRadius:12, padding:12, transition:'all 0.2s',
        }}>
          {Array.from({ length: itemCount }, (_, i) => (
            <div key={i} style={{
              background: COLORS[i % COLORS.length] + '33', border:`2px solid ${COLORS[i % COLORS.length]}`,
              borderRadius:8, minWidth:48, minHeight:40, display:'flex', alignItems:'center', justifyContent:'center',
              fontFamily:'var(--font-mono)', fontWeight:700, fontSize:13, color: COLORS[i % COLORS.length],
              padding:'8px 14px', flexShrink: wrap === 'nowrap' ? 1 : 0,
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
