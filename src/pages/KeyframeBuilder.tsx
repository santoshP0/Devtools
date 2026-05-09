import { useState, useMemo } from 'react'
import ToolLayout from '../components/ToolLayout'

interface Keyframe {
  percent: number
  opacity: number
  scale: number
  rotate: number
  x: number
  y: number
}

const PROPERTY_HELP = {
  opacity: 'Controls visibility (0 = hidden, 1 = fully visible).',
  scale: 'Adjusts size (1 = normal, 2 = double size, 0.5 = half size).',
  rotate: 'Rotates the element in degrees.',
  x: 'Moves the element horizontally in pixels.',
  y: 'Moves the element vertically in pixels.',
}

export default function KeyframeBuilder() {
  const [name, setName] = useState('proAnimation')
  const [keyframes, setKeyframes] = useState<Keyframe[]>([
    { percent: 0, opacity: 1, scale: 1, rotate: 0, x: 0, y: 0 },
    { percent: 50, opacity: 0.8, scale: 1.4, rotate: 180, x: 50, y: -20 },
    { percent: 100, opacity: 1, scale: 1, rotate: 360, x: 0, y: 0 }
  ])
  const [selectedIdx, setSelectedIdx] = useState(0)

  const updateKeyframe = (idx: number, updates: Partial<Keyframe>) => {
    const next = [...keyframes]
    next[idx] = { ...next[idx], ...updates }
    // Sort only if percent changed to avoid unnecessary re-ordering
    if ('percent' in updates) {
      setKeyframes(next.sort((a, b) => a.percent - b.percent))
    } else {
      setKeyframes(next)
    }
  }

  const addKeyframe = () => {
    const lastPercent = keyframes[keyframes.length - 1]?.percent || 0
    const newPercent = Math.min(100, lastPercent + 10)
    const next = [...keyframes, { percent: newPercent, opacity: 1, scale: 1, rotate: 0, x: 0, y: 0 }]
    setKeyframes(next.sort((a, b) => a.percent - b.percent))
    setSelectedIdx(next.length - 1)
  }

  const removeKeyframe = (idx: number) => {
    if (keyframes.length <= 2) return
    const next = keyframes.filter((_, i) => i !== idx)
    setKeyframes(next)
    setSelectedIdx(0)
  }

  // Pure CSS for export
  const exportCss = useMemo(() => {
    const steps = keyframes.map(k => `  ${k.percent}% {
    opacity: ${k.opacity};
    transform: translate(${k.x}px, ${k.y}px) scale(${k.scale}) rotate(${k.rotate}deg);
  }`).join('\n')
    return `@keyframes ${name} {\n${steps}\n}`
  }, [keyframes, name])

  // Live preview name to force browser refresh on property changes
  const previewName = useMemo(() => `pv_${Math.random().toString(36).slice(2, 6)}`, [keyframes])
  const previewCss = useMemo(() => {
    const steps = keyframes.map(k => `  ${k.percent}% {
    opacity: ${k.opacity};
    transform: translate(${k.x}px, ${k.y}px) scale(${k.scale}) rotate(${k.rotate}deg);
  }`).join('\n')
    return `@keyframes ${previewName} {\n${steps}\n}`
  }, [keyframes, previewName])

  return (
    <ToolLayout title="Pro Animation Builder" description="A professional-grade CSS @keyframes generator with visual property controls and instant preview.">
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        
        {/* LEFT: Controls */}
        <div className="xl:col-span-8 flex flex-col gap-6">
          
          {/* Timeline Panel */}
          <div className="tool-panel">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-sm font-bold text-slate-300 uppercase tracking-widest">Animation Timeline</h3>
              <button onClick={addKeyframe} className="btn-secondary btn-sm">+ Add Keyframe</button>
            </div>
            
            <div className="relative h-20 bg-black/40 rounded-2xl flex items-center px-6 border border-slate-800 shadow-inner">
              <div className="absolute left-6 right-6 h-1 bg-slate-800 rounded-full" />
              {keyframes.map((k, i) => (
                <div 
                  key={i} 
                  className="absolute transform -translate-x-1/2 flex flex-col items-center gap-2"
                  style={{ left: `calc(1.5rem + ${k.percent} * (100% - 3rem) / 100)` }}
                >
                  <button
                    onClick={() => setSelectedIdx(i)}
                    className={`w-8 h-8 rounded-lg border-2 transition-all flex items-center justify-center font-mono text-[10px] ${
                      selectedIdx === i ? 'bg-accent border-white text-white shadow-[0_0_15px_var(--accent)] scale-110' : 'bg-slate-900 border-slate-700 text-slate-500 hover:border-slate-500'
                    }`}
                  >
                    {k.percent}%
                  </button>
                  {selectedIdx === i && <div className="w-1.5 h-1.5 bg-accent rounded-full animate-pulse" />}
                </div>
              ))}
            </div>
          </div>

          {/* Properties Panel */}
          <div className="tool-panel">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-sm font-bold text-slate-300 uppercase tracking-widest">Properties @ {keyframes[selectedIdx].percent}%</h3>
              {keyframes.length > 2 && (
                <button onClick={() => removeKeyframe(selectedIdx)} className="text-[10px] text-red-500 hover:text-red-400 font-bold uppercase tracking-tighter transition-colors">Delete Keyframe</button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-8">
              {/* Opacity */}
              <div className="space-y-3">
                <div className="flex justify-between items-end">
                  <div>
                    <span className="text-[11px] font-bold text-slate-400 block mb-1">OPACITY</span>
                    <p className="text-[10px] text-slate-600 max-w-[200px] leading-tight">{PROPERTY_HELP.opacity}</p>
                  </div>
                  <span className="font-mono text-xs text-accent">{keyframes[selectedIdx].opacity}</span>
                </div>
                <input type="range" min="0" max="1" step="0.01" value={keyframes[selectedIdx].opacity} onChange={e => updateKeyframe(selectedIdx, { opacity: parseFloat(e.target.value) })} className="w-full" />
              </div>

              {/* Scale */}
              <div className="space-y-3">
                <div className="flex justify-between items-end">
                  <div>
                    <span className="text-[11px] font-bold text-slate-400 block mb-1">SCALE</span>
                    <p className="text-[10px] text-slate-600 max-w-[200px] leading-tight">{PROPERTY_HELP.scale}</p>
                  </div>
                  <span className="font-mono text-xs text-accent">{keyframes[selectedIdx].scale}x</span>
                </div>
                <input type="range" min="0.1" max="3" step="0.01" value={keyframes[selectedIdx].scale} onChange={e => updateKeyframe(selectedIdx, { scale: parseFloat(e.target.value) })} className="w-full" />
              </div>

              {/* Rotate */}
              <div className="space-y-3">
                <div className="flex justify-between items-end">
                  <div>
                    <span className="text-[11px] font-bold text-slate-400 block mb-1">ROTATION</span>
                    <p className="text-[10px] text-slate-600 max-w-[200px] leading-tight">{PROPERTY_HELP.rotate}</p>
                  </div>
                  <span className="font-mono text-xs text-accent">{keyframes[selectedIdx].rotate}°</span>
                </div>
                <input type="range" min="-360" max="360" value={keyframes[selectedIdx].rotate} onChange={e => updateKeyframe(selectedIdx, { rotate: parseInt(e.target.value) })} className="w-full" />
              </div>

              {/* Translation */}
              <div className="space-y-6">
                <div>
                  <div className="flex justify-between items-end mb-2">
                    <span className="text-[11px] font-bold text-slate-400 block">MOVE X</span>
                    <span className="font-mono text-xs text-accent">{keyframes[selectedIdx].x}px</span>
                  </div>
                  <input type="range" min="-150" max="150" value={keyframes[selectedIdx].x} onChange={e => updateKeyframe(selectedIdx, { x: parseInt(e.target.value) })} className="w-full" />
                </div>
                <div>
                  <div className="flex justify-between items-end mb-2">
                    <span className="text-[11px] font-bold text-slate-400 block">MOVE Y</span>
                    <span className="font-mono text-xs text-accent">{keyframes[selectedIdx].y}px</span>
                  </div>
                  <input type="range" min="-150" max="150" value={keyframes[selectedIdx].y} onChange={e => updateKeyframe(selectedIdx, { y: parseInt(e.target.value) })} className="w-full" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: Preview & Export */}
        <div className="xl:col-span-4 flex flex-col gap-6">
          
          {/* Live Preview */}
          <div className="tool-panel flex-1 min-h-[300px] flex flex-col bg-slate-950 border-accent/20 relative overflow-hidden">
            <style>{previewCss}</style>
            <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(var(--accent) 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
            
            <div className="flex-1 flex items-center justify-center">
              <div 
                key={previewName}
                style={{
                  width: 80, height: 80,
                  background: 'linear-gradient(135deg, var(--accent), #764ba2)',
                  borderRadius: 20,
                  boxShadow: '0 10px 30px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(255,255,255,0.2)',
                  animation: `${previewName} 2.5s infinite ease-in-out alternate`
                }}
              />
            </div>

            <div className="p-4 border-t border-white/5 bg-black/40 flex justify-between items-center">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Live Preview</span>
              <div className="flex gap-1">
                {[1, 2, 3].map(i => <div key={i} className="w-1 h-1 bg-accent rounded-full animate-pulse" style={{ animationDelay: `${i * 0.2}s` }} />)}
              </div>
            </div>
          </div>

          {/* Export Panel */}
          <div className="tool-panel">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">CSS Output</h3>
              <button 
                className="btn btn-ghost btn-sm text-accent"
                onClick={() => { navigator.clipboard.writeText(exportCss); alert('Copied to clipboard!') }}
              >
                Copy Code
              </button>
            </div>
            <pre className="bg-black/50 p-4 rounded-xl font-mono text-[11px] text-slate-300 h-64 overflow-auto custom-scrollbar border border-white/5">
              {exportCss}
            </pre>
          </div>
        </div>
      </div>
    </ToolLayout>
  )
}
