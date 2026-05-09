import { useState } from 'react'
import ToolLayout from '../components/ToolLayout'

export default function GlassmorphismBuilder() {
  const [blur, setBlur] = useState(10)
  const [transparency, setTransparency] = useState(0.2)
  const [color, setColor] = useState('#ffffff')
  const [outline, setOutline] = useState(0.1)

  const glassStyle = {
    background: `${color}${Math.round(transparency * 255).toString(16).padStart(2, '0')}`,
    backdropFilter: `blur(${blur}px)`,
    WebkitBackdropFilter: `blur(${blur}px)`,
    border: `1px solid rgba(255, 255, 255, ${outline})`,
    borderRadius: '20px',
    boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)'
  }

  const cssCode = `background: rgba(${parseInt(color.slice(1,3), 16)}, ${parseInt(color.slice(3,5), 16)}, ${parseInt(color.slice(5,7), 16)}, ${transparency});
backdrop-filter: blur(${blur}px);
-webkit-backdrop-filter: blur(${blur}px);
border-radius: 20px;
border: 1px solid rgba(255, 255, 255, ${outline});
box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);`

  return (
    <ToolLayout title="Glassmorphism Builder" description="Visually design modern glassmorphism UI elements with real-time CSS generation.">
      <div className="two-col">
        <div className="flex flex-col gap-6">
          <div className="tool-panel space-y-5">
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="label">Blur ({blur}px)</label>
              </div>
              <input type="range" min="0" max="40" value={blur} onChange={e => setBlur(parseInt(e.target.value))} />
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="label">Transparency ({Math.round(transparency * 100)}%)</label>
              </div>
              <input type="range" min="0" max="1" step="0.01" value={transparency} onChange={e => setTransparency(parseFloat(e.target.value))} />
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="label">Base Color</label>
              </div>
              <div className="flex gap-4 items-center">
                <input type="color" value={color} onChange={e => setColor(e.target.value)} className="w-12 h-10 p-1 rounded-lg border border-border" />
                <span className="font-mono text-sm uppercase">{color}</span>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="label">Outline Opacity ({outline})</label>
              </div>
              <input type="range" min="0" max="1" step="0.01" value={outline} onChange={e => setOutline(parseFloat(e.target.value))} />
            </div>
          </div>

          <div className="tool-panel">
            <div className="flex justify-between items-center mb-3">
              <label className="label">CSS Snippet</label>
              <button className="btn btn-ghost btn-sm" onClick={() => { navigator.clipboard.writeText(cssCode); alert('Copied!') }}>Copy CSS</button>
            </div>
            <pre className="code-out text-xs">{cssCode}</pre>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <label className="label">Live Preview</label>
          <div 
            style={{ 
              flex: 1, 
              minHeight: 400, 
              borderRadius: 24,
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 40,
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            {/* Background decorative elements to show blur better */}
            <div style={{ position: 'absolute', top: '10%', left: '10%', width: 120, height: 120, borderRadius: '50%', background: '#ff9a9e', filter: 'blur(10px)' }} />
            <div style={{ position: 'absolute', bottom: '15%', right: '15%', width: 100, height: 100, borderRadius: '50%', background: '#a1c4fd', filter: 'blur(5px)' }} />
            
            <div style={{ ...glassStyle, width: '100%', height: '80%', padding: '32px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ height: '24px', width: '40%', background: 'rgba(255,255,255,0.2)', borderRadius: '12px' }} />
              <div style={{ height: '60px', width: '100%', background: 'rgba(255,255,255,0.1)', borderRadius: '12px' }} />
              <div style={{ marginTop: 'auto', display: 'flex', gap: '12px' }}>
                <div style={{ height: '36px', width: '80px', background: 'rgba(255,255,255,0.3)', borderRadius: '18px' }} />
                <div style={{ height: '36px', width: '36px', background: 'rgba(255,255,255,0.3)', borderRadius: '50%' }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </ToolLayout>
  )
}
