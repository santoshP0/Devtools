import { useState, useRef, useEffect, useMemo } from 'react'
import ToolLayout from '../components/ToolLayout'

const DEVICES = [
  { label: 'Mobile S',    w: 320,  h: 568,  icon: '📱' },
  { label: 'Mobile M',    w: 375,  h: 667,  icon: '📱' },
  { label: 'Mobile L',    w: 414,  h: 736,  icon: '📱' },
  { label: 'iPhone 14',   w: 390,  h: 844,  icon: '📱' },
  { label: 'Tablet',      w: 768,  h: 1024, icon: '📟' },
  { label: 'iPad Pro',    w: 1024, h: 1366, icon: '📟' },
  { label: 'Laptop',      w: 1280, h: 800,  icon: '💻' },
  { label: 'Desktop',     w: 1440, h: 900,  icon: '🖥️' },
  { label: 'Wide',        w: 1920, h: 1080, icon: '🖥️' },
]

export default function ResponsiveTesterPage() {
  const [url, setUrl] = useState('https://example.com')
  const [active, setActive] = useState(DEVICES[8]) // Default to Wide as user demonstrated
  const [loaded, setLoaded] = useState('https://example.com')
  const [customW, setCustomW] = useState(375)
  const [customH, setCustomH] = useState(667)
  const [useCustom, setUseCustom] = useState(false)
  const [fitToWidth, setFitToWidth] = useState(true)
  const [zoom, setZoom] = useState(0.6)
  const [isFullscreen, setIsFullscreen] = useState(false)

  const containerRef = useRef<HTMLDivElement>(null)
  const [containerWidth, setContainerWidth] = useState(1000)

  const current = useCustom ? { label: 'Custom', w: customW, h: customH, icon: '📐' } : active

  const load = () => {
    if (url.trim()) setLoaded(url.trim().startsWith('http') ? url.trim() : 'https://' + url.trim())
  }

  // Measure container width so the preview can automatically fit without scrollbars
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(entries => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0) {
          setContainerWidth(entry.contentRect.width)
        }
      }
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [loaded, isFullscreen])

  // Escape key to leave fullscreen
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) setIsFullscreen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isFullscreen])

  // Calculate auto-fit zoom
  const autoZoom = useMemo(() => {
    if (containerWidth <= 0) return 0.5
    const available = Math.max(200, containerWidth - 36)
    const fit = Math.min(1, Math.max(0.12, available / current.w))
    return Number(fit.toFixed(2))
  }, [containerWidth, current.w])

  const effectiveZoom = fitToWidth ? autoZoom : zoom

  const previewFrame = (
    <div
      ref={containerRef}
      style={{
        overflowX: fitToWidth ? 'hidden' : 'auto',
        overflowY: 'auto',
        border: '2px solid var(--sketch-text)',
        boxShadow: '3px 3px 0px var(--sketch-text)',
        borderRadius: 8,
        background: 'var(--surface2)',
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        flex: 1,
        minHeight: 450,
        maxHeight: isFullscreen ? 'calc(100vh - 110px)' : 'calc(100vh - 280px)',
      }}
    >
      <div
        style={{
          width: Math.round(current.w * effectiveZoom),
          height: Math.round(current.h * effectiveZoom),
          overflow: 'hidden',
          borderRadius: 8,
          border: '2px solid var(--sketch-text)',
          boxShadow: '4px 4px 0px var(--sketch-text)',
          background: '#fff',
          flexShrink: 0,
          transition: 'width 0.15s ease, height 0.15s ease',
        }}
      >
        <iframe
          src={loaded}
          title="Responsive Preview"
          style={{
            width: current.w,
            height: current.h,
            border: 'none',
            transform: `scale(${effectiveZoom})`,
            transformOrigin: 'top left',
          }}
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
        />
      </div>
    </div>
  )

  const content = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, flex: 1, height: isFullscreen ? '100%' : undefined }}>
      {/* URL input bar */}
      <div className="rest-url-bar">
        <input
          type="text"
          value={url}
          onChange={e => setUrl(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && load()}
          placeholder="https://example.com"
          className="rest-url-input search-input-control input-bare"
          spellCheck={false}
        />
        <button
          type="button"
          className="rest-send-btn"
          onClick={load}
        >
          Load
        </button>
      </div>

      {/* Breakpoint presets */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
        {DEVICES.map(d => {
          const isSelected = !useCustom && active.label === d.label
          return (
            <button
              key={d.label}
              type="button"
              className={`pill-btn ${isSelected ? 'active' : ''}`}
              onClick={() => { setActive(d); setUseCustom(false) }}
              style={{
                background: isSelected ? 'var(--sketch-text)' : 'transparent',
                color: isSelected ? 'var(--sketch-bg)' : 'var(--text-muted)',
                borderColor: isSelected ? 'var(--sketch-text)' : 'var(--border)',
                fontWeight: isSelected ? 700 : 500,
              }}
            >
              <span>{d.icon}</span>
              <span>{d.label}</span>
              <span style={{ opacity: 0.7, fontFamily: 'var(--font-mono)', fontSize: 10 }}>
                {d.w}×{d.h}
              </span>
            </button>
          )
        })}
      </div>

      {/* Controls & sizing toolbar */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: 'var(--sketch-text)' }}>
            <span>{current.icon} {current.label}</span>
            <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', fontSize: 12, fontWeight: 500 }}>
              {current.w} × {current.h}px
            </span>
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 12, color: 'var(--text-muted)', userSelect: 'none' }}>
            <input
              type="checkbox"
              checked={useCustom}
              onChange={e => setUseCustom(e.target.checked)}
              style={{ width: 14, height: 14 }}
            />
            Custom size
          </label>

          {useCustom && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <input
                type="number"
                value={customW}
                onChange={e => setCustomW(Number(e.target.value))}
                placeholder="W"
                className="tool-input"
                style={{ width: 75, height: 28, fontSize: 12, padding: '0 6px' }}
              />
              <span style={{ color: 'var(--text-muted)' }}>×</span>
              <input
                type="number"
                value={customH}
                onChange={e => setCustomH(Number(e.target.value))}
                placeholder="H"
                className="tool-input"
                style={{ width: 75, height: 28, fontSize: 12, padding: '0 6px' }}
              />
            </div>
          )}
        </div>

        {/* Zoom & Fullscreen options */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <button
            type="button"
            className={`pill-btn ${fitToWidth ? 'active' : ''}`}
            onClick={() => setFitToWidth(f => !f)}
            style={{
              background: fitToWidth ? 'var(--sketch-text)' : 'transparent',
              color: fitToWidth ? 'var(--sketch-bg)' : 'var(--sketch-text)',
              borderColor: 'var(--sketch-text)',
              fontWeight: fitToWidth ? 700 : 500,
            }}
            title="Auto-scale preview to fit width completely without horizontal scrollbars"
          >
            Fit to screen
          </button>

          <button
            type="button"
            className={`pill-btn ${!fitToWidth && zoom === 1 ? 'active' : ''}`}
            onClick={() => { setFitToWidth(false); setZoom(1) }}
            style={{
              background: !fitToWidth && zoom === 1 ? 'var(--sketch-text)' : 'transparent',
              color: !fitToWidth && zoom === 1 ? 'var(--sketch-bg)' : 'var(--text-muted)',
            }}
            title="100% 1:1 pixel scale"
          >
            100%
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', minWidth: 42, color: 'var(--text-muted)', textAlign: 'right' }}>
              {Math.round(effectiveZoom * 100)}%
            </span>
            <input
              type="range"
              min={0.15}
              max={1}
              step={0.02}
              value={effectiveZoom}
              onChange={e => {
                setFitToWidth(false)
                setZoom(Number(e.target.value))
              }}
              style={{ width: 90 }}
            />
          </div>

          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => setIsFullscreen(f => !f)}
            style={{ fontFamily: 'var(--font-sans)', fontSize: 12 }}
            title={isFullscreen ? 'Exit fullscreen (Esc)' : 'View full screen'}
          >
            {isFullscreen ? 'Exit Fullscreen' : '⛶ Fullscreen'}
          </button>
        </div>
      </div>

      {loaded ? previewFrame : (
        <div style={{ height: 320, border: '2px dashed var(--border)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 15 }}>
          Enter a URL and click Load
        </div>
      )}
    </div>
  )

  if (isFullscreen) {
    return (
      <div style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'var(--sketch-bg)',
        backgroundImage: 'radial-gradient(var(--sketch-dot) 1.2px, transparent 1.2px)',
        backgroundSize: '20px 20px',
        padding: '16px 24px',
        display: 'flex',
        flexDirection: 'column',
      }}>
        {content}
      </div>
    )
  }

  return (
    <ToolLayout title="Responsive Screen Tester" description="Preview any URL at common device breakpoints without scrollbar cutoff" fullWidth>
      <div className="one-col" style={{ width: '100%', maxWidth: 1400, margin: '0 auto' }}>
        {content}
      </div>
    </ToolLayout>
  )
}

