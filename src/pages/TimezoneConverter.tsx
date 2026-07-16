import { useState, useEffect, useRef } from 'react'
import ToolLayout from '../components/ToolLayout'

const ALL_ZONES = Intl.supportedValuesOf('timeZone')

const COMMON_ZONES = [
  'UTC',
  'America/New_York',
  'America/Los_Angeles',
  'America/Chicago',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Asia/Kolkata',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Asia/Dubai',
  'Australia/Sydney',
  'Pacific/Auckland',
]

function formatInZone(date: Date, tz: string) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(date)
}

function offsetLabel(tz: string, date: Date) {
  const utcMs = date.getTime()
  const local = new Date(utcMs)
  const tzDate = new Date(local.toLocaleString('en-US', { timeZone: tz }))
  const utcDate = new Date(local.toLocaleString('en-US', { timeZone: 'UTC' }))
  const diff = (tzDate.getTime() - utcDate.getTime()) / 60000
  const sign = diff >= 0 ? '+' : '-'
  const h = String(Math.floor(Math.abs(diff) / 60)).padStart(2, '0')
  const m = String(Math.abs(diff) % 60).padStart(2, '0')
  return `UTC${sign}${h}:${m}`
}

export default function TimezoneConverter() {
  const [zones, setZones] = useState<string[]>(() => {
    const local = Intl.DateTimeFormat().resolvedOptions().timeZone
    const defaults = ['UTC', local, 'America/New_York', 'Europe/London', 'Asia/Kolkata']
    return [...new Set(defaults)].slice(0, 5)
  })
  const [now, setNow] = useState(new Date())
  const [paused, setPaused] = useState(false)
  const [search, setSearch] = useState('')
  const [showPicker, setShowPicker] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval>>()

  useEffect(() => {
    if (!paused) {
      intervalRef.current = setInterval(() => setNow(new Date()), 1000)
    }
    return () => clearInterval(intervalRef.current)
  }, [paused])

  const addZone = (z: string) => {
    if (!zones.includes(z)) setZones(prev => [...prev, z])
    setShowPicker(false)
    setSearch('')
  }

  const removeZone = (z: string) => setZones(prev => prev.filter(x => x !== z))

  const filtered = search.trim()
    ? ALL_ZONES.filter(z => z.toLowerCase().includes(search.toLowerCase())).slice(0, 50)
    : COMMON_ZONES.filter(z => !zones.includes(z))

  const localZone = Intl.DateTimeFormat().resolvedOptions().timeZone

  return (
    <ToolLayout title="Timezone Converter" description="Compare the current time across multiple timezones simultaneously.">
      <div className="space-y-4">
        <div className="flex gap-2 flex-wrap items-center">
          <button onClick={() => setPaused(p => !p)} className="btn-secondary">
            {paused ? '▶ Resume' : '⏸ Pause'}
          </button>
          <span className="text-xs" style={{ color: 'var(--text-dim)' }}>
            Your timezone: <strong>{localZone}</strong>
          </span>
        </div>

        <div className="space-y-2">
          {zones.map(tz => (
            <div
              key={tz}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                padding: '14px 18px',
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)', fontFamily: 'var(--font-sans)' }}>
                  {tz.replace(/_/g, ' ')}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-dim)', fontFamily: 'var(--font-sans)' }}>
                  {offsetLabel(tz, now)}
                </div>
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 18, color: 'var(--text)', letterSpacing: '-0.02em' }}>
                {formatInZone(now, tz)}
              </div>
              {zones.length > 1 && (
                <button
                  onClick={() => removeZone(tz)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 18, lineHeight: 1, padding: 4 }}
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>

        <div style={{ position: 'relative' }}>
          <button onClick={() => setShowPicker(p => !p)} className="btn-secondary">
            + Add timezone
          </button>
          {showPicker && (
            <div style={{
              position: 'absolute', top: '100%', left: 0, zIndex: 50, marginTop: 4,
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius)', padding: 8, width: 320, boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
            }}>
              <input
                autoFocus
                type="search"
                placeholder="Search timezone…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{
                  width: '100%', padding: '8px 10px', marginBottom: 6,
                  background: 'var(--surface2)', border: '1px solid var(--border)',
                  borderRadius: 6, color: 'var(--text)', fontSize: 13,
                  fontFamily: 'var(--font-sans)', outline: 'none', boxSizing: 'border-box',
                }}
              />
              <div style={{ maxHeight: 220, overflowY: 'auto' }}>
                {filtered.map(z => (
                  <button
                    key={z}
                    onClick={() => addZone(z)}
                    disabled={zones.includes(z)}
                    style={{
                      display: 'block', width: '100%', textAlign: 'left',
                      padding: '7px 10px', background: 'none', border: 'none',
                      cursor: zones.includes(z) ? 'default' : 'pointer',
                      color: zones.includes(z) ? 'var(--text-muted)' : 'var(--text)',
                      fontSize: 13, fontFamily: 'var(--font-sans)', borderRadius: 4,
                    }}
                    onMouseEnter={e => { if (!zones.includes(z)) (e.target as HTMLElement).style.background = 'var(--surface2)' }}
                    onMouseLeave={e => { (e.target as HTMLElement).style.background = 'none' }}
                  >
                    {z.replace(/_/g, ' ')}
                    {zones.includes(z) && ' ✓'}
                  </button>
                ))}
                {filtered.length === 0 && (
                  <p style={{ color: 'var(--text-muted)', fontSize: 13, padding: '8px 10px' }}>No results</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </ToolLayout>
  )
}
