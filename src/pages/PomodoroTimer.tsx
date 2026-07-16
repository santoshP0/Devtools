import { useState, useEffect, useRef, useCallback } from 'react'
import ToolLayout from '../components/ToolLayout'

const PRESETS = [
  { label: 'Pomodoro', work: 25, short: 5, long: 15 },
  { label: 'Short', work: 15, short: 3, long: 10 },
  { label: 'Long', work: 50, short: 10, long: 20 },
]

type Phase = 'work' | 'short' | 'long'

function beep(freq: number, dur: number) {
  try {
    const ctx = new AudioContext()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.value = freq
    osc.type = 'sine'
    gain.gain.setValueAtTime(0.3, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + dur)
  } catch {}
}

export default function PomodoroTimer() {
  const [preset, setPreset] = useState(0)
  const [work, setWork] = useState(25)
  const [short, setShort] = useState(5)
  const [long, setLong] = useState(15)
  const [phase, setPhase] = useState<Phase>('work')
  const [seconds, setSeconds] = useState(25 * 60)
  const [running, setRunning] = useState(false)
  const [sessions, setSessions] = useState(0)
  const [sound, setSound] = useState(true)
  const intervalRef = useRef<ReturnType<typeof setInterval>>()

  const durations: Record<Phase, number> = { work: work * 60, short: short * 60, long: long * 60 }

  const reset = useCallback((p: Phase = phase, w = work, s = short, l = long) => {
    clearInterval(intervalRef.current)
    setRunning(false)
    const dur = { work: w * 60, short: s * 60, long: l * 60 }
    setSeconds(dur[p])
  }, [phase, work, short, long])

  const switchPhase = useCallback((p: Phase) => {
    setPhase(p)
    const dur = { work: work * 60, short: short * 60, long: long * 60 }
    setSeconds(dur[p])
    setRunning(false)
    clearInterval(intervalRef.current)
  }, [work, short, long])

  useEffect(() => {
    if (!running) return
    intervalRef.current = setInterval(() => {
      setSeconds(s => {
        if (s <= 1) {
          clearInterval(intervalRef.current)
          setRunning(false)
          if (sound) beep(880, 0.4)
          if (phase === 'work') {
            setSessions(n => {
              const next = n + 1
              switchPhase(next % 4 === 0 ? 'long' : 'short')
              return next
            })
          } else {
            switchPhase('work')
          }
          return 0
        }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(intervalRef.current)
  }, [running, phase, sound, switchPhase])

  const applyPreset = (i: number) => {
    const p = PRESETS[i]
    setPreset(i); setWork(p.work); setShort(p.short); setLong(p.long)
    setPhase('work'); setSeconds(p.work * 60); setRunning(false)
    clearInterval(intervalRef.current)
  }

  const total = durations[phase]
  const progress = (total - seconds) / total
  const r = 80
  const circ = 2 * Math.PI * r
  const mm = String(Math.floor(seconds / 60)).padStart(2, '0')
  const ss = String(seconds % 60).padStart(2, '0')

  const phaseLabel: Record<Phase, string> = { work: 'Focus', short: 'Short Break', long: 'Long Break' }
  const phaseColor: Record<Phase, string> = { work: 'var(--accent)', short: 'oklch(0.72 0.15 145)', long: 'oklch(0.72 0.16 300)' }

  return (
    <ToolLayout title="Pomodoro Timer" description="Stay focused with timed work and break intervals.">
      <div style={{ maxWidth: 480, margin: '0 auto' }} className="space-y-6">
        {/* Preset + phase tabs */}
        <div className="flex gap-2 flex-wrap justify-center">
          {PRESETS.map((p, i) => (
            <button key={p.label} onClick={() => applyPreset(i)} className={i === preset ? 'btn-primary' : 'btn-secondary'}>
              {p.label}
            </button>
          ))}
        </div>

        <div className="flex gap-2 justify-center">
          {(['work', 'short', 'long'] as Phase[]).map(p => (
            <button
              key={p}
              onClick={() => switchPhase(p)}
              style={{
                padding: '6px 14px', borderRadius: 20, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                background: phase === p ? phaseColor[p] : 'transparent',
                color: phase === p ? (p === 'work' ? 'var(--bg)' : 'var(--bg)') : 'var(--text-dim)',
                border: `1.5px solid ${phase === p ? phaseColor[p] : 'var(--border)'}`,
                transition: 'all 0.15s',
              }}
            >
              {phaseLabel[p]}
            </button>
          ))}
        </div>

        {/* Timer ring */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24 }}>
          <div style={{ position: 'relative', width: 200, height: 200 }}>
            <svg width="200" height="200" style={{ transform: 'rotate(-90deg)' }}>
              <circle cx="100" cy="100" r={r} fill="none" stroke="var(--surface2)" strokeWidth="8" />
              <circle
                cx="100" cy="100" r={r} fill="none"
                stroke={phaseColor[phase]} strokeWidth="8"
                strokeDasharray={circ}
                strokeDashoffset={circ * (1 - progress)}
                strokeLinecap="round"
                style={{ transition: 'stroke-dashoffset 0.5s ease' }}
              />
            </svg>
            <div style={{
              position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: 4,
            }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 42, fontWeight: 700, color: 'var(--text)', letterSpacing: '-2px' }}>
                {mm}:{ss}
              </span>
              <span style={{ fontSize: 12, color: 'var(--text-dim)', fontFamily: 'var(--font-sans)' }}>
                {phaseLabel[phase]}
              </span>
            </div>
          </div>

          {/* Controls */}
          <div className="flex gap-3">
            <button
              onClick={() => setRunning(r => !r)}
              style={{
                padding: '10px 32px', borderRadius: 12, fontSize: 16, fontWeight: 700, cursor: 'pointer',
                background: phaseColor[phase], color: 'var(--bg)', border: 'none',
                transition: 'all 0.15s', letterSpacing: '-0.02em',
              }}
            >
              {running ? '⏸ Pause' : '▶ Start'}
            </button>
            <button onClick={() => reset()} className="btn-secondary">Reset</button>
          </div>
        </div>

        {/* Sessions + durations */}
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius)', padding: '16px 20px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontSize: 14, color: 'var(--text)', fontWeight: 600 }}>
              Sessions completed: <strong style={{ color: phaseColor.work }}>{sessions}</strong>
            </span>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-dim)', cursor: 'pointer' }}>
              <input type="checkbox" checked={sound} onChange={e => setSound(e.target.checked)} />
              Sound
            </label>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            {[
              { label: 'Focus (min)', val: work, set: (v: number) => { setWork(v); if (phase === 'work') setSeconds(v * 60) } },
              { label: 'Short break', val: short, set: (v: number) => { setShort(v); if (phase === 'short') setSeconds(v * 60) } },
              { label: 'Long break', val: long, set: (v: number) => { setLong(v); if (phase === 'long') setSeconds(v * 60) } },
            ].map(({ label, val, set }) => (
              <div key={label}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, fontFamily: 'var(--font-sans)' }}>{label}</div>
                <input
                  type="number" min={1} max={120} value={val}
                  onChange={e => { const v = Math.max(1, Math.min(120, Number(e.target.value))); setPreset(-1); set(v) }}
                  style={{
                    width: '100%', padding: '6px 8px', background: 'var(--surface2)',
                    border: '1px solid var(--border)', borderRadius: 6,
                    color: 'var(--text)', fontSize: 14, fontFamily: 'var(--font-mono)', outline: 'none',
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </ToolLayout>
  )
}
