import { useState, useMemo, useRef, useEffect } from 'react'
import ToolLayout from '../components/ToolLayout'

interface Keyframe {
  id: number
  percent: number
  opacity: number
  scale: number
  rotate: number
  x: number
  y: number
  easing: string
}

const PRESETS: Record<string, { duration: number; iterCount: string; direction: string; keyframes: Keyframe[] }> = {
  pulse: {
    duration: 1.2,
    iterCount: 'infinite',
    direction: 'alternate',
    keyframes: [
      { id: 1, percent: 0, opacity: 1, scale: 1, rotate: 0, x: 0, y: 0, easing: 'ease-in-out' },
      { id: 2, percent: 50, opacity: 0.8, scale: 1.3, rotate: 0, x: 0, y: 0, easing: 'ease-in-out' },
      { id: 3, percent: 100, opacity: 1, scale: 1, rotate: 0, x: 0, y: 0, easing: 'ease-in-out' }
    ]
  },
  spin: {
    duration: 2.0,
    iterCount: 'infinite',
    direction: 'normal',
    keyframes: [
      { id: 1, percent: 0, opacity: 1, scale: 1, rotate: 0, x: 0, y: 0, easing: 'linear' },
      { id: 2, percent: 100, opacity: 1, scale: 1, rotate: 360, x: 0, y: 0, easing: 'linear' }
    ]
  },
  bounce: {
    duration: 1.0,
    iterCount: 'infinite',
    direction: 'alternate',
    keyframes: [
      { id: 1, percent: 0, opacity: 1, scale: 1, rotate: 0, x: 0, y: 0, easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)' },
      { id: 2, percent: 50, opacity: 0.9, scale: 1.15, rotate: 0, x: 0, y: -70, easing: 'cubic-bezier(0.55, 0.085, 0.68, 0.53)' },
      { id: 3, percent: 100, opacity: 1, scale: 0.9, rotate: 0, x: 0, y: 0, easing: 'linear' }
    ]
  },
}

const EASINGS = [
  { value: 'linear', label: 'Linear' },
  { value: 'ease', label: 'Ease' },
  { value: 'ease-in', label: 'Ease In' },
  { value: 'ease-out', label: 'Ease Out' },
  { value: 'ease-in-out', label: 'Ease In-Out' },
  { value: 'cubic-bezier(0.34,1.56,0.64,1)', label: 'Spring' },
  { value: 'cubic-bezier(0.68,-0.55,0.27,1.55)', label: 'Bounce' },
]

function PropSlider({
  label, value, min, max, step, unit, onChange,
}: {
  label: string; value: number; min: number; max: number
  step: number; unit: string; onChange: (v: number) => void
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', fontFamily: 'var(--font-sans)' }}>
          {label}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <input
            type="number"
            value={value}
            min={min} max={max} step={step}
            onChange={e => onChange(parseFloat(e.target.value) || 0)}
            style={{
              width: 60, height: 26, padding: '0 6px', textAlign: 'right',
              fontFamily: 'var(--font-mono)', fontSize: 12,
              background: 'var(--bg)', border: '1px solid var(--border)',
              borderRadius: 6, color: 'var(--accent)',
            }}
          />
          <span style={{ fontSize: 11, color: 'var(--text-muted)', minWidth: 20, fontFamily: 'var(--font-mono)' }}>{unit}</span>
        </div>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        style={{ width: '100%', accentColor: 'var(--accent)' }}
      />
    </div>
  )
}

function CopyBtn({ text }: { text: string }) {
  const [done, setDone] = useState(false)
  return (
    <button
      className="btn btn-ghost btn-sm"
      onClick={() => { navigator.clipboard.writeText(text).then(() => { setDone(true); setTimeout(() => setDone(false), 1600) }) }}
    >
      {done ? '✓ Copied' : 'Copy CSS'}
    </button>
  )
}

export default function KeyframeBuilder() {
  const [activePreset, setActivePreset] = useState<string>('pulse')
  const [animName, setAnimName] = useState('myAnimation')
  const [duration, setDuration] = useState(1.2)
  const [iterCount, setIterCount] = useState('infinite')
  const [direction, setDirection] = useState('alternate')
  const [previewSubject, setPreviewSubject] = useState<string>('circle')
  const [selectedId, setSelectedId] = useState(1)
  const [playing, setPlaying] = useState(true)
  const [progress, setProgress] = useState(0)

  const [keyframes, setKeyframes] = useState<Keyframe[]>([
    { id: 1, percent: 0, opacity: 1, scale: 1, rotate: 0, x: 0, y: 0, easing: 'ease-in-out' },
    { id: 2, percent: 50, opacity: 0.8, scale: 1.3, rotate: 0, x: 0, y: 0, easing: 'ease-in-out' },
    { id: 3, percent: 100, opacity: 1, scale: 1, rotate: 0, x: 0, y: 0, easing: 'ease-in-out' },
  ])

  const trackRef = useRef<HTMLDivElement>(null)
  const previewKey = useRef(0)

  const selected = keyframes.find(k => k.id === selectedId) ?? keyframes[0]
  const sorted = useMemo(() => [...keyframes].sort((a, b) => a.percent - b.percent), [keyframes])

  // Apply Preset
  const handlePresetSelect = (key: string) => {
    setActivePreset(key)
    const preset = PRESETS[key]
    if (preset) {
      setKeyframes(preset.keyframes.map(k => ({ ...k })))
      setDuration(preset.duration)
      setIterCount(preset.iterCount)
      setDirection(preset.direction)
      setSelectedId(preset.keyframes[0].id)
      setPlaying(true)
    }
  }

  // Smooth Sweeping Playhead
  useEffect(() => {
    if (!playing) {
      setProgress(0)
      return
    }
    let start: number | null = null
    let animFrameId: number

    const tick = (now: number) => {
      if (!start) start = now
      const elapsed = now - start
      const durationMs = duration * 1000

      let currentPct = 0
      if (iterCount === 'infinite') {
        const cycleTime = elapsed % durationMs
        const cycleIndex = Math.floor(elapsed / durationMs)
        let isAlternate = direction.startsWith('alternate') && (cycleIndex % 2 === 1)
        if (direction === 'reverse' || direction === 'alternate-reverse') {
          isAlternate = !isAlternate
        }
        currentPct = (cycleTime / durationMs) * 100
        if (isAlternate) {
          currentPct = 100 - currentPct
        }
      } else {
        const totalCycles = parseInt(iterCount) || 1
        const totalDuration = durationMs * totalCycles
        if (elapsed >= totalDuration) {
          setPlaying(false)
          setProgress(100)
          return
        }
        const cycleTime = elapsed % durationMs
        const cycleIndex = Math.floor(elapsed / durationMs)
        let isAlternate = direction.startsWith('alternate') && (cycleIndex % 2 === 1)
        if (direction === 'reverse' || direction === 'alternate-reverse') {
          isAlternate = !isAlternate
        }
        currentPct = (cycleTime / durationMs) * 100
        if (isAlternate) {
          currentPct = 100 - currentPct
        }
      }
      setProgress(currentPct)
      animFrameId = requestAnimationFrame(tick)
    }
    animFrameId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(animFrameId)
  }, [playing, duration, iterCount, direction])

  // Drag Timeline Marker
  const handleMarkerMouseDown = (e: React.MouseEvent, id: number) => {
    e.preventDefault()
    e.stopPropagation()
    const track = trackRef.current
    if (!track) return
    const rect = track.getBoundingClientRect()
    const trackWidth = rect.width
    // Subtract padding (16px left + 16px right = 32px) to get the true draggable range
    const draggableWidth = Math.max(1, trackWidth - 32)
    const startX = e.clientX
    const initialPercent = keyframes.find(k => k.id === id)?.percent ?? 0
    setSelectedId(id)

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX
      const deltaPercent = (deltaX / draggableWidth) * 100
      let newPercent = Math.round(initialPercent + deltaPercent)
      newPercent = Math.max(0, Math.min(100, newPercent))
      setKeyframes(prev => prev.map(k => k.id === id ? { ...k, percent: newPercent } : k))
    }

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  }

  // Update properties
  const updateKeyframeProp = (key: keyof Keyframe, value: any) => {
    setKeyframes(prev => prev.map(k => k.id === selectedId ? { ...k, [key]: value } : k))
  }

  const currentProgress = playing ? progress : selected.percent

  const addKeyframe = () => {
    const percents = sorted.map(k => k.percent)
    let bestPct = 50
    let bestGap = 0
    for (let i = 0; i < percents.length - 1; i++) {
      const gap = percents[i + 1] - percents[i]
      if (gap > bestGap) {
        bestGap = gap
        bestPct = Math.round((percents[i] + percents[i + 1]) / 2)
      }
    }
    const newId = Math.max(...keyframes.map(k => k.id), 0) + 1
    const ref = selected
    setKeyframes(prev => [...prev, {
      id: newId,
      percent: bestPct,
      opacity: ref.opacity,
      scale: ref.scale,
      rotate: ref.rotate,
      x: ref.x,
      y: ref.y,
      easing: 'ease-in-out'
    }])
    setSelectedId(newId)
  }

  const removeKeyframe = () => {
    if (keyframes.length <= 2) return
    const remaining = keyframes.filter(k => k.id !== selectedId)
    setKeyframes(remaining)
    setSelectedId(remaining[0].id)
  }

  // CSS Generation
  const exportCss = useMemo(() => {
    const steps = sorted.map(k =>
      `  ${k.percent}% {\n    opacity: ${k.opacity};\n    transform: translate(${k.x}px, ${k.y}px) scale(${k.scale}) rotate(${k.rotate}deg);\n    animation-timing-function: ${k.easing};\n  }`
    ).join('\n')
    return `@keyframes ${animName} {\n${steps}\n}\n\n.animated-element {\n  animation: ${animName} ${duration}s ${iterCount} ${direction} both;\n}`
  }, [sorted, animName, duration, iterCount, direction])

  const [pName, setPName] = useState(`_pv_init`)
  useEffect(() => {
    setPName(`_pv_${previewKey.current++}_${Math.random().toString(36).slice(2, 5)}`)
  }, [keyframes])

  const previewStyle = useMemo(() => {
    const steps = sorted.map(k =>
      `  ${k.percent}% { opacity:${k.opacity}; transform:translate(${k.x}px,${k.y}px) scale(${k.scale}) rotate(${k.rotate}deg); animation-timing-function:${k.easing}; }`
    ).join('\n')
    return `@keyframes ${pName} {\n${steps}\n}`
  }, [sorted, pName])

  return (
    <ToolLayout title="Keyframe Builder" description="A simple, interactive animation tool. Pick a preset, drag points on the timeline, and copy the CSS.">
      <style>{previewStyle}</style>

      {/* Preset Toolbar & Subject Selectors */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 12,
        marginBottom: 16,
        padding: '12px 16px',
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 12,
      }}>
        {/* Presets */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Preset:</span>
          {Object.keys(PRESETS).map(key => (
            <button
              key={key}
              onClick={() => handlePresetSelect(key)}
              style={{
                padding: '6px 12px',
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 600,
                border: '1px solid',
                cursor: 'pointer',
                background: activePreset === key ? 'var(--accent-bg)' : 'transparent',
                borderColor: activePreset === key ? 'var(--accent-dim)' : 'var(--border)',
                color: activePreset === key ? 'var(--accent)' : 'var(--text-dim)',
                transition: 'all 0.15s ease',
              }}
            >
              {key.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Shape */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Shape:</span>
          {(['circle', 'box', 'card'] as const).map(subj => (
            <button
              key={subj}
              onClick={() => setPreviewSubject(subj)}
              style={{
                padding: '6px 12px',
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 600,
                border: '1px solid',
                cursor: 'pointer',
                background: previewSubject === subj ? 'var(--accent-bg)' : 'transparent',
                borderColor: previewSubject === subj ? 'var(--accent-dim)' : 'var(--border)',
                color: previewSubject === subj ? 'var(--accent)' : 'var(--text-dim)',
                transition: 'all 0.15s ease',
                textTransform: 'capitalize',
              }}
            >
              {subj}
            </button>
          ))}
        </div>
      </div>

      {/* Main Two Column Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20, alignItems: 'start' }}>

        {/* Left Column: Timeline & Properties */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Simple Timeline Card */}
          <div className="panel" style={{ padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                Timeline Track
              </span>
              <button className="btn btn-ghost btn-sm" onClick={addKeyframe}>+ Add Keyframe</button>
            </div>

            {/* Draggable Track Container */}
            <div
              ref={trackRef}
              style={{
                position: 'relative',
                height: 48,
                display: 'flex',
                alignItems: 'center',
                userSelect: 'none',
                background: 'var(--bg2)',
                borderRadius: 10,
                padding: '0 16px',
                border: '1px solid var(--border)',
              }}
            >
              {/* Central horizontal line */}
              <div style={{ position: 'absolute', left: 16, right: 16, height: 4, background: 'var(--border)', borderRadius: 2 }} />

              {/* Sweeping progress bar */}
              <div style={{
                position: 'absolute',
                left: `calc(16px + (100% - 32px) * ${currentProgress / 100})`,
                top: 2,
                bottom: 2,
                width: 2,
                background: 'var(--accent)',
                boxShadow: '0 0 8px var(--accent)',
                pointerEvents: 'none',
              }} />

              {/* Markers */}
              {sorted.map(k => {
                const isSelected = k.id === selectedId
                return (
                  <div
                    key={k.id}
                    onMouseDown={e => handleMarkerMouseDown(e, k.id)}
                    style={{
                      position: 'absolute',
                      left: `calc(16px + (100% - 32px) * ${k.percent / 100})`,
                      transform: 'translate(-50%, -50%)',
                      top: '50%',
                      cursor: 'grab',
                      zIndex: isSelected ? 10 : 5,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                    }}
                  >
                    {/* Tooltip Percentage Label */}
                    <div style={{
                      position: 'absolute',
                      bottom: 12,
                      background: isSelected ? 'var(--accent)' : 'var(--surface)',
                      border: `1px solid ${isSelected ? 'var(--accent-dim)' : 'var(--border)'}`,
                      borderRadius: 4,
                      padding: '2px 5px',
                      fontSize: 9,
                      fontWeight: 700,
                      fontFamily: 'var(--font-mono)',
                      color: isSelected ? '#fff' : 'var(--text-dim)',
                      pointerEvents: 'none',
                      whiteSpace: 'nowrap',
                      boxShadow: 'var(--shadow-sm)',
                      transform: isSelected ? 'scale(1.05)' : 'scale(1)',
                      transition: 'all 0.15s ease',
                      opacity: isSelected ? 1 : 0.8,
                    }}>
                      {k.percent}%
                    </div>

                    {/* Diamond Node */}
                    <div style={{
                      width: 10,
                      height: 10,
                      background: isSelected ? 'var(--accent)' : 'var(--surface)',
                      border: `2px solid ${isSelected ? 'var(--accent)' : 'var(--text-muted)'}`,
                      transform: 'rotate(45deg)',
                      boxShadow: isSelected
                        ? '0 0 0 3px var(--accent-bg), 0 2px 6px var(--accent-dim)'
                        : '0 1px 3px rgba(0,0,0,0.15)',
                      transition: 'all 0.15s ease',
                    }} />
                  </div>
                )
              })}
            </div>
          </div>

          {/* Properties Editor */}
          <div className="panel" style={{ padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text)' }}>
                Customize Point ({selected.percent}%)
              </span>
              {keyframes.length > 2 && (
                <button
                  className="btn btn-ghost btn-sm"
                  style={{ color: 'oklch(0.60 0.18 29)' }}
                  onClick={removeKeyframe}
                >
                  Delete Point
                </button>
              )}
            </div>

            {/* Properties Sliders */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 24px', marginBottom: 16 }}>
              <PropSlider label="Opacity" value={selected.opacity} min={0} max={1} step={0.05} unit="" onChange={v => updateKeyframeProp('opacity', v)} />
              <PropSlider label="Scale" value={selected.scale} min={0.2} max={2.5} step={0.05} unit="×" onChange={v => updateKeyframeProp('scale', v)} />
              <PropSlider label="Rotate" value={selected.rotate} min={-360} max={360} step={5} unit="°" onChange={v => updateKeyframeProp('rotate', v)} />
              <div /> {/* Spacer */}
              <PropSlider label="Offset X" value={selected.x} min={-120} max={120} step={2} unit="px" onChange={v => updateKeyframeProp('x', v)} />
              <PropSlider label="Offset Y" value={selected.y} min={-120} max={120} step={2} unit="px" onChange={v => updateKeyframeProp('y', v)} />
            </div>

            {/* Easing speed curve */}
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                  Easing Speed Curve
                </span>
                <select
                  value={selected.easing}
                  onChange={e => updateKeyframeProp('easing', e.target.value)}
                  style={{ width: 160, height: 34, fontSize: 12, padding: '4px 8px', color: 'var(--text)' }}
                >
                  {EASINGS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
              </div>
            </div>
          </div>

        </div>

        {/* Right Column: Live Preview & Playback */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Preview Container */}
          <div className="panel" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>
            {/* Visual Screen */}
            <div style={{
              height: 220,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundImage: 'radial-gradient(var(--border) 1px, transparent 1px)',
              backgroundSize: '16px 16px',
              position: 'relative',
              overflow: 'hidden',
            }}>
              {/* Centered crosshairs */}
              <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', width: 1, height: 40, background: 'var(--border)', opacity: 0.3 }} />
              <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', width: 40, height: 1, background: 'var(--border)', opacity: 0.3 }} />

              {(() => {
                const animStyle = playing
                  ? `${pName} ${duration}s ${iterCount} ${direction} both`
                  : 'none'

                const pausedStyle: React.CSSProperties = !playing
                  ? {
                      opacity: selected.opacity,
                      transform: `translate(${selected.x}px, ${selected.y}px) scale(${selected.scale}) rotate(${selected.rotate}deg)`,
                      transition: 'transform 0.05s linear, opacity 0.05s linear',
                    }
                  : {}

                if (previewSubject === 'circle') {
                  return (
                    <div style={{
                      width: 80, height: 80, borderRadius: '50%',
                      background: 'linear-gradient(135deg, var(--accent), oklch(0.55 0.20 285))',
                      boxShadow: '0 8px 24px var(--accent-dim)',
                      animation: animStyle,
                      ...pausedStyle,
                    }} />
                  )
                }
                if (previewSubject === 'box') {
                  return (
                    <div style={{
                      width: 80, height: 80, borderRadius: 12,
                      background: 'linear-gradient(135deg, #f97316, #ec4899)',
                      boxShadow: '0 8px 24px rgba(249, 115, 22, 0.2)',
                      animation: animStyle,
                      ...pausedStyle,
                    }} />
                  )
                }
                // default: card
                return (
                    <div style={{
                      width: 100, height: 70, borderRadius: 10,
                      background: 'var(--surface)', border: '1px solid var(--border-hi)',
                      boxShadow: 'var(--shadow-md)', display: 'flex', flexDirection: 'column',
                      padding: 8, justifyContent: 'space-between', boxSizing: 'border-box',
                      animation: animStyle,
                      ...pausedStyle,
                    }}>
                      <div style={{ width: '40%', height: 5, background: 'var(--accent)', borderRadius: 2 }} />
                      <div style={{ width: '80%', height: 3, background: 'var(--border)', borderRadius: 1 }} />
                      <div style={{ width: '50%', height: 3, background: 'var(--border)', borderRadius: 1 }} />
                    </div>
                  )
              })()}
            </div>

            {/* Playback Settings strip */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '12px 16px',
              borderTop: '1px solid var(--border)',
              background: 'var(--bg2)',
            }}>
              <button
                onClick={() => setPlaying(p => !p)}
                style={{
                  width: 36, height: 36, borderRadius: '50%',
                  background: playing ? 'var(--accent)' : 'var(--surface)',
                  border: '1.5px solid var(--border-hi)',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, color: playing ? '#fff' : 'var(--text-dim)',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
                  outline: 'none',
                }}
              >
                {playing ? '⏸' : '▶'}
              </button>

              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
                <input
                  type="range" min={0.2} max={4} step={0.1} value={duration}
                  onChange={e => setDuration(parseFloat(e.target.value))}
                  style={{ width: '100%', accentColor: 'var(--accent)', height: 4 }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                  <span>Fast</span>
                  <span style={{ color: 'var(--accent)' }}>{duration}s</span>
                  <span>Slow</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Config details */}
          <div className="panel" style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Name:</span>
              <input
                type="text" value={animName} onChange={e => setAnimName(e.target.value.replace(/\s/g, ''))}
                style={{ width: 140, height: 24, fontSize: 12, padding: '0 4px' }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Repeat:</span>
              <select value={iterCount} onChange={e => setIterCount(e.target.value)} style={{ width: 130, height: 34, fontSize: 12, padding: '4px 8px', color: 'var(--text)' }}>
                <option value="infinite">Looping</option>
                <option value="1">Once</option>
                <option value="2">Twice</option>
                <option value="3">3 times</option>
              </select>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Style:</span>
              <select value={direction} onChange={e => setDirection(e.target.value)} style={{ width: 130, height: 34, fontSize: 12, padding: '4px 8px', color: 'var(--text)' }}>
                <option value="alternate">Bounce back</option>
                <option value="normal">Restart</option>
              </select>
            </div>
          </div>

          {/* Compact CSS Code Box */}
          <div className="panel" style={{ padding: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                CSS Code
              </span>
              <CopyBtn text={exportCss} />
            </div>
            <pre style={{
              background: 'var(--bg)', border: '1px solid var(--border)',
              borderRadius: 8, padding: '8px 10px',
              fontFamily: 'var(--font-mono)', fontSize: 11,
              color: 'var(--text-dim)', lineHeight: 1.5,
              overflowX: 'auto', maxHeight: 110, overflowY: 'auto',
            }}>
              {exportCss}
            </pre>
          </div>

        </div>
      </div>
    </ToolLayout>
  )
}
