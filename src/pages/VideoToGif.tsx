import { useState, useEffect } from 'react'
import ToolLayout from '../components/ToolLayout'
import { invoke, isTauri } from '@tauri-apps/api/core'
import { open, save } from '@tauri-apps/plugin-dialog'

const RELEASES_URL = 'https://github.com/santoshP0/Devtools/releases/latest'
const VIDEO_EXTS = ['mp4', 'mov', 'mkv', 'webm', 'avi', 'm4v']

function fmt(bytes: number) {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / 1024 / 1024).toFixed(2) + ' MB'
}

function ext(path: string) {
  return path.split('.').pop()?.toLowerCase() ?? ''
}

function Hint({ children }: { children: React.ReactNode }) {
  return <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, lineHeight: 1.5 }}>{children}</p>
}

type Result = { ok: boolean; log: string; in_size: number; out_size: number; preview_b64: string | null }

export default function VideoToGif() {
  // ── Web fallback: this tool needs native ffmpeg ──
  if (!isTauri()) {
    return (
      <ToolLayout title="Video → GIF" description="Turn a video clip into an optimized GIF — desktop app exclusive.">
        <div className="panel" style={{ maxWidth: 560, margin: '40px auto', padding: 32, textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🎞️</div>
          <h2 style={{ fontSize: 20, marginBottom: 10 }}>Available in the desktop app</h2>
          <p style={{ fontSize: 14, color: 'var(--text-dim)', lineHeight: 1.7, marginBottom: 20 }}>
            This tool uses native FFmpeg with a palette pipeline to make small, sharp GIFs
            from any video — trim the clip, set the frame rate and size.
            Download DevToolbox for Mac, Windows or Linux and get it for free.
          </p>
          <a href={RELEASES_URL} target="_blank" rel="noreferrer" className="btn-primary" style={{ display: 'inline-block', padding: '10px 24px' }}>
            ⬇ Download Desktop App
          </a>
        </div>
      </ToolLayout>
    )
  }
  return <DesktopVideoGif />
}

function DesktopVideoGif() {
  const [ffmpeg, setFfmpeg] = useState<{ available: boolean; version: string } | null>(null)
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<Result | null>(null)
  const [outPath, setOutPath] = useState('')

  const [start, setStart] = useState('0')       // trim start, seconds
  const [duration, setDuration] = useState('5') // clip length, seconds
  const [fps, setFps] = useState(15)
  const [width, setWidth] = useState('480')
  const [quality, setQuality] = useState(80)

  useEffect(() => {
    invoke<{ available: boolean; version: string }>('ffmpeg_check').then(setFfmpeg).catch(() => setFfmpeg({ available: false, version: '' }))
  }, [])

  const isVideo = VIDEO_EXTS.includes(ext(input))

  const pick = async () => {
    const p = await open({ multiple: false, filters: [{ name: 'Video', extensions: VIDEO_EXTS }] })
    if (typeof p === 'string') { setInput(p); setResult(null) }
  }

  const run = async () => {
    if (!input || !isVideo) return
    const base = input.replace(/\.[^.]+$/, '')
    const target = await save({ defaultPath: `${base}.gif` })
    if (!target) return

    setBusy(true); setResult(null); setOutPath(target)
    try {
      const r = await invoke<Result>('ffmpeg_compress', {
        req: {
          input, output: target, strip_metadata: false,
          kind: 'video_gif',
          fps,
          width: width ? Number(width) : null,
          start: Number(start) || 0,
          duration: Number(duration) || 5,
          quality,
        },
      })
      setResult(r)
    } catch (e) {
      setResult({ ok: false, log: String(e), in_size: 0, out_size: 0, preview_b64: null })
    } finally {
      setBusy(false)
    }
  }

  return (
    <ToolLayout title="Video → GIF" description="Native FFmpeg — trim a clip and export a small, sharp GIF.">
      <div className="one-col" style={{ maxWidth: 720, margin: '0 auto', width: '100%' }}>

        {ffmpeg && !ffmpeg.available && (
          <div className="panel" style={{ padding: 20, marginBottom: 4 }}>
            ⚠️ FFmpeg not found on your PATH. Install it (<code>brew install ffmpeg</code> on macOS) and reopen this tool.
          </div>
        )}

        {/* Source */}
        <div className="panel" style={{ padding: 20 }}>
          <label className="label">Video file</label>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button className="btn-secondary" onClick={pick}>Choose video…</button>
            <span style={{ fontSize: 12, color: 'var(--text-dim)', wordBreak: 'break-all' }}>
              {input ? input.split('/').pop() : 'No file selected'}
            </span>
          </div>
          {input && !isVideo && <Hint>Not a supported video. Use {VIDEO_EXTS.join(', ')}.</Hint>}
        </div>

        {/* Settings */}
        <div className="panel" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label className="label" title="Where in the video the GIF starts, in seconds.">Start (s)</label>
              <input type="number" min={0} step={0.1} value={start}
                onChange={e => setStart(e.target.value)}
                onBlur={() => setStart(s => String(Math.max(0, Number(s) || 0)))}
                className="tool-input" />
              <Hint>Skip into the clip. 0 = from the beginning.</Hint>
            </div>
            <div>
              <label className="label" title="How many seconds of video to capture. Max 60.">Length (s)</label>
              <input type="number" min={0.1} max={60} step={0.1} value={duration}
                onChange={e => setDuration(e.target.value)}
                onBlur={() => setDuration(d => String(Math.min(60, Math.max(0.1, Number(d) || 5))))}
                className="tool-input" />
              <Hint>Keep it short — GIFs balloon fast. Max 60s.</Hint>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label className="label" title="Frames per second. Higher = smoother but bigger.">Frame rate: {fps} fps</label>
              <input type="range" min={5} max={30} value={fps} onChange={e => setFps(Number(e.target.value))} style={{ width: '100%', accentColor: 'var(--accent)' }} />
              <Hint>10–15 fps is plenty for most GIFs.</Hint>
            </div>
            <div>
              <label className="label" title="Max width in pixels; height scales automatically. Blank = original.">Width (px)</label>
              <input type="number" min={16} max={2000} value={width}
                onChange={e => setWidth(e.target.value)}
                onBlur={() => setWidth(w => w === '' ? '' : String(Math.min(2000, Math.max(16, Number(w) || 480))))}
                className="tool-input" />
              <Hint>Smaller width = much smaller file. Blank keeps original.</Hint>
            </div>
          </div>

          <div>
            <label className="label" title="More colors = better quality but larger file.">Quality: {quality}%</label>
            <input type="range" min={40} max={100} value={quality} onChange={e => setQuality(Number(e.target.value))} style={{ width: '100%', accentColor: 'var(--accent)' }} />
            <Hint>Controls the GIF color palette size (64–256 colors).</Hint>
          </div>

          <button className="btn-primary" onClick={run} disabled={!input || !isVideo || busy} style={{ padding: '10px 0' }}>
            {busy ? 'Rendering GIF…' : 'Convert to GIF'}
          </button>
        </div>

        {/* Result */}
        {result && (
          <div className="panel" style={{ padding: 20 }}>
            {result.ok ? (
              <>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, fontSize: 13, marginBottom: 12 }}>
                  <span>Source: <b>{fmt(result.in_size)}</b></span>
                  <span>GIF: <b>{fmt(result.out_size)}</b></span>
                  <span style={{ color: 'var(--text-dim)' }}>{outPath.split('/').pop()}</span>
                </div>
                {result.preview_b64 && (
                  <img src={`data:image/gif;base64,${result.preview_b64}`} alt="GIF preview" style={{ maxWidth: '100%', maxHeight: 320, borderRadius: 8, background: 'var(--surface2)' }} />
                )}
              </>
            ) : (
              <div style={{ color: '#ef4444', fontSize: 13 }}>
                <b>Failed.</b>
                <pre style={{ whiteSpace: 'pre-wrap', marginTop: 8, fontSize: 11, color: 'var(--text-dim)' }}>{result.log}</pre>
              </div>
            )}
          </div>
        )}
      </div>
    </ToolLayout>
  )
}
