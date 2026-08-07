import { useState, useEffect, useRef, useCallback } from 'react'
import ToolLayout from '../components/ToolLayout'
import { invoke, isTauri } from '@tauri-apps/api/core'

const RELEASES_URL = 'https://github.com/santoshP0/Devtools/releases/latest'

type Device = { serial: string; model: string; state: string }
type StartResult = { http_port: number; device_w: number; device_h: number }

// Android keycodes used by the on-screen buttons and special keys
const KEY = {
  home: 3,
  back: 4,
  appSwitch: 187,
  enter: 66,
  del: 67,
  tab: 61,
  escape: 111,
} as const

const SPECIAL_KEYS: Record<string, number> = {
  Backspace: KEY.del,
  Enter: KEY.enter,
  Tab: KEY.tab,
  Escape: KEY.escape,
  ArrowUp: 19,
  ArrowDown: 20,
  ArrowLeft: 21,
  ArrowRight: 22,
}

export default function ScreenMirror() {
  if (!isTauri()) {
    return (
      <ToolLayout title="Screen Mirror" description="Mirror and control an Android device — desktop app exclusive.">
        <div className="panel" style={{ maxWidth: 560, margin: '40px auto', padding: 32, textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📱</div>
          <h2 style={{ fontSize: 20, marginBottom: 10 }}>Available in the desktop app</h2>
          <p style={{ fontSize: 14, color: 'var(--text-dim)', lineHeight: 1.7, marginBottom: 20 }}>
            Mirror your Android screen over USB and control it from your desktop — tap, swipe,
            scroll and type. The phone encodes the video in hardware and streams it to the app,
            so it stays fast and sharp. Download DevToolbox for Mac, Windows or Linux.
          </p>
          <a href={RELEASES_URL} target="_blank" rel="noreferrer" className="btn-primary" style={{ display: 'inline-block', padding: '10px 24px' }}>
            ⬇ Download Desktop App
          </a>
        </div>
      </ToolLayout>
    )
  }
  return <DesktopScreenMirror />
}

function DesktopScreenMirror() {
  const [devices, setDevices] = useState<Device[]>([])
  const [serial, setSerial] = useState('')
  const [status, setStatus] = useState('')
  const [running, setRunning] = useState(false)
  const [busy, setBusy] = useState(false)

  // quality knobs — the speed vs clarity trade-off
  const [maxSize, setMaxSize] = useState(0) // 0 = device native
  const [bitrate, setBitrate] = useState(8) // Mbps
  const [maxFps, setMaxFps] = useState(60)

  const videoRef = useRef<HTMLVideoElement>(null)
  const dims = useRef({ w: 1080, h: 1920 })
  const pressed = useRef(false)

  const refresh = useCallback(async () => {
    try {
      const list = await invoke<Device[]>('mirror_list_devices')
      setDevices(list)
      setSerial((cur) => cur || list.find((d) => d.state === 'device')?.serial || '')
    } catch (e) {
      setStatus(String(e))
    }
  }, [])

  useEffect(() => {
    refresh()
    const id = setInterval(() => { if (!running) refresh() }, 3000)
    return () => clearInterval(id)
  }, [refresh, running])

  const start = async () => {
    if (!serial || busy) return
    setBusy(true)
    setStatus('Starting…')
    try {
      const res = await invoke<StartResult>('mirror_start', {
        opts: { serial, max_size: maxSize, bitrate, max_fps: maxFps },
      })
      dims.current = { w: res.device_w, h: res.device_h }
      const v = videoRef.current
      if (v) {
        v.src = `http://127.0.0.1:${res.http_port}/`
        v.muted = true
        await v.play().catch(() => {})
      }
      setRunning(true)
      setStatus('')
    } catch (e) {
      setStatus(String(e))
    } finally {
      setBusy(false)
    }
  }

  const stop = useCallback(async () => {
    const v = videoRef.current
    if (v) { v.pause(); v.removeAttribute('src'); v.load() }
    if (serial) { try { await invoke('mirror_stop', { serial }) } catch { /* ignore */ } }
    setRunning(false)
  }, [serial])

  useEffect(() => () => { if (serial) invoke('mirror_stop', { serial }).catch(() => {}) }, [serial])

  // Keep playback at the live edge so latency doesn't creep up over time.
  useEffect(() => {
    if (!running) return
    const v = videoRef.current
    if (!v) return
    const id = setInterval(() => {
      const b = v.buffered
      if (b.length) {
        const end = b.end(b.length - 1)
        if (end - v.currentTime > 0.5) v.currentTime = end - 0.05
      }
    }, 1000)
    return () => clearInterval(id)
  }, [running])

  const send = (msg: unknown) => {
    if (!running) return
    invoke('mirror_input', { serial, msg }).catch(() => {})
  }

  const norm = (e: React.PointerEvent) => {
    const r = (e.target as HTMLElement).getBoundingClientRect()
    return {
      x: Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)),
      y: Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)),
    }
  }

  const onPointerDown = (e: React.PointerEvent) => {
    if (!running) return
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    pressed.current = true
    const { x, y } = norm(e)
    send({ kind: 'touch', action: 'down', x, y })
  }
  const onPointerMove = (e: React.PointerEvent) => {
    if (!running || !pressed.current) return
    const { x, y } = norm(e)
    send({ kind: 'touch', action: 'move', x, y })
  }
  const onPointerUp = (e: React.PointerEvent) => {
    if (!running || !pressed.current) return
    pressed.current = false
    const { x, y } = norm(e)
    send({ kind: 'touch', action: 'up', x, y })
  }
  const onWheel = (e: React.WheelEvent) => {
    if (!running) return
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const x = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width))
    const y = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height))
    send({ kind: 'scroll', x, y, dx: -e.deltaX / 100, dy: -e.deltaY / 100 })
  }
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!running || e.metaKey || e.ctrlKey) return
    if (SPECIAL_KEYS[e.key] !== undefined) {
      e.preventDefault()
      send({ kind: 'key', keycode: SPECIAL_KEYS[e.key] })
    } else if (e.key.length === 1) {
      e.preventDefault()
      send({ kind: 'text', text: e.key })
    }
  }

  const aspect = dims.current.w / dims.current.h || 0.5

  return (
    <ToolLayout title="Screen Mirror" description="Mirror and control an Android device over USB.">
      <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        {/* controls */}
        <div className="panel" style={{ padding: 20, width: 300, flexShrink: 0 }}>
          <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Device</label>
          <div style={{ display: 'flex', gap: 8, marginTop: 6, marginBottom: 16 }}>
            <select
              value={serial}
              onChange={(e) => setSerial(e.target.value)}
              disabled={running}
              style={{ flex: 1, padding: '6px 8px', borderRadius: 6, background: 'var(--bg-input)', color: 'var(--text)', border: '1px solid var(--border)' }}
            >
              {devices.length === 0 && <option value="">No devices found</option>}
              {devices.map((d) => (
                <option key={d.serial} value={d.serial}>
                  {d.model} {d.state !== 'device' ? `(${d.state})` : ''}
                </option>
              ))}
            </select>
            <button className="btn" onClick={refresh} disabled={running} title="Refresh devices">↻</button>
          </div>

          <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Resolution cap</label>
          <select
            value={maxSize}
            onChange={(e) => setMaxSize(Number(e.target.value))}
            disabled={running}
            style={{ width: '100%', padding: '6px 8px', borderRadius: 6, marginTop: 6, marginBottom: 16, background: 'var(--bg-input)', color: 'var(--text)', border: '1px solid var(--border)' }}
          >
            <option value={0}>Native (sharpest)</option>
            <option value={1920}>1920 px</option>
            <option value={1440}>1440 px</option>
            <option value={1080}>1080 px</option>
            <option value={720}>720 px (fastest)</option>
          </select>

          <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Bitrate: {bitrate} Mbps</label>
          <input type="range" min={1} max={30} value={bitrate} disabled={running}
            onChange={(e) => setBitrate(Number(e.target.value))}
            style={{ width: '100%', marginTop: 6, marginBottom: 16 }} />

          <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Max FPS: {maxFps}</label>
          <input type="range" min={15} max={120} step={5} value={maxFps} disabled={running}
            onChange={(e) => setMaxFps(Number(e.target.value))}
            style={{ width: '100%', marginTop: 6, marginBottom: 20 }} />

          {!running ? (
            <button className="btn-primary" style={{ width: '100%', padding: 10 }} onClick={start} disabled={!serial || busy}>
              {busy ? 'Starting…' : '▶ Start mirroring'}
            </button>
          ) : (
            <button className="btn" style={{ width: '100%', padding: 10 }} onClick={stop}>■ Stop</button>
          )}

          {status && <p style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 12, lineHeight: 1.5 }}>{status}</p>}

          {running && (
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button className="btn" style={{ flex: 1 }} onClick={() => send({ kind: 'key', keycode: KEY.appSwitch })} title="Recents">▭</button>
              <button className="btn" style={{ flex: 1 }} onClick={() => send({ kind: 'key', keycode: KEY.home })} title="Home">○</button>
              <button className="btn" style={{ flex: 1 }} onClick={() => send({ kind: 'key', keycode: KEY.back })} title="Back">◁</button>
            </div>
          )}
        </div>

        {/* screen */}
        <div
          tabIndex={0}
          onKeyDown={onKeyDown}
          style={{
            outline: 'none',
            background: '#000',
            borderRadius: 12,
            overflow: 'hidden',
            width: 'min(360px, 90vw)',
            aspectRatio: String(aspect),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid var(--border)',
          }}
        >
          <video
            ref={videoRef}
            playsInline
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onWheel={onWheel}
            style={{ width: '100%', height: '100%', objectFit: 'contain', touchAction: 'none', display: running ? 'block' : 'none' }}
          />
          {!running && (
            <div style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', padding: 20 }}>
              Connect an Android device with USB debugging enabled, then press Start.
            </div>
          )}
        </div>
      </div>
    </ToolLayout>
  )
}
