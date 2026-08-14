import { useState, useEffect } from 'react'
import ToolLayout from '../components/ToolLayout'
import { invoke, isTauri } from '@tauri-apps/api/core'
import { open, save } from '@tauri-apps/plugin-dialog'
import { useTauriFileDrop } from '../hooks/useTauriFileDrop'

const RELEASES_URL = 'https://github.com/santoshP0/Devtools/releases/latest'

const IMAGE_EXTS = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'tiff', 'avif']
const VIDEO_EXTS = ['mp4', 'mov', 'mkv', 'webm', 'avi', 'm4v']

function fmt(bytes: number) {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / 1024 / 1024).toFixed(2) + ' MB'
}

function ext(path: string) {
  return path.split('.').pop()?.toLowerCase() ?? ''
}

/** Directory of a path (everything up to the last separator), '' if none. */
function dirOf(path: string) {
  const i = Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\'))
  return i >= 0 ? path.slice(0, i + 1) : ''
}

/** Filename without directory and without extension. */
function baseName(path: string) {
  const file = path.slice(dirOf(path).length)
  return file.replace(/\.[^.]+$/, '')
}

/** Small helper line under a control explaining what it does */
function Hint({ children }: { children: React.ReactNode }) {
  return <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, lineHeight: 1.5 }}>{children}</p>
}

type Result = { ok: boolean; log: string; in_size: number; out_size: number }

export default function MediaCompressor() {
  // ── Web fallback: this tool needs native ffmpeg ──
  if (!isTauri()) {
    return (
      <ToolLayout title="Media Compressor" description="FFmpeg-powered image & video compression — desktop app exclusive.">
        <div className="panel" style={{ maxWidth: 560, margin: '40px auto', padding: 32, textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🖥️</div>
          <h2 style={{ fontSize: 20, marginBottom: 10 }}>Available in the desktop app</h2>
          <p style={{ fontSize: 14, color: 'var(--text-dim)', lineHeight: 1.7, marginBottom: 20 }}>
            This tool uses native FFmpeg for far better compression than browsers allow —
            10&nbsp;MB → ~800&nbsp;KB with no visible quality loss, videos included.
            Download DevToolbox for Mac, Windows or Linux and get it for free.
          </p>
          <a href={RELEASES_URL} target="_blank" rel="noreferrer" className="btn-primary" style={{ display: 'inline-block', padding: '10px 24px' }}>
            ⬇ Download Desktop App
          </a>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 16 }}>
            Everything else on this site keeps working right here in the browser.
          </p>
        </div>
      </ToolLayout>
    )
  }

  return <DesktopCompressor />
}

function DesktopCompressor() {
  const [ffmpeg, setFfmpeg] = useState<{ available: boolean; version: string } | null>(null)
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<Result | null>(null)
  const [outPath, setOutPath] = useState('')
  const [outName, setOutName] = useState('')  // chosen output filename (no ext)
  const [showMore, setShowMore] = useState(false)

  // image options — 'same' keeps the input format (.gif stays .gif)
  const [imgFormat, setImgFormat] = useState('same')
  const [imgQuality, setImgQuality] = useState(80)
  const [imgWidth, setImgWidth] = useState('')
  const [gifFps, setGifFps] = useState('same')

  // video options
  const [vFormat, setVFormat] = useState('same')
  const [crf, setCrf] = useState(26)
  const [preset, setPreset] = useState('medium')
  const [vCodec, setVCodec] = useState<'libx264' | 'libx265'>('libx264')
  const [vHeight, setVHeight] = useState('')
  const [vFps, setVFps] = useState('same')
  const [audioBr, setAudioBr] = useState('128k')

  // shared
  const [stripMeta, setStripMeta] = useState(true)

  useEffect(() => {
    invoke<{ available: boolean; version: string }>('ffmpeg_check').then(setFfmpeg).catch(() => setFfmpeg({ available: false, version: '' }))
  }, [])

  const kind = IMAGE_EXTS.includes(ext(input)) ? 'image' : VIDEO_EXTS.includes(ext(input)) ? 'video' : null

  const targetExt = kind === 'image'
    ? (imgFormat === 'same' ? ext(input) : imgFormat)
    : (vFormat === 'same' ? ext(input) : vFormat)

  const pick = async () => {
    const p = await open({
      multiple: false,
      filters: [{ name: 'Media', extensions: [...IMAGE_EXTS, ...VIDEO_EXTS] }],
    })
    if (typeof p === 'string') { setInput(p); setResult(null); setOutName(baseName(p)) }
  }

  // Drag a file straight onto the window (native path, ready for ffmpeg).
  const { dragging } = useTauriFileDrop(
    p => { setInput(p); setResult(null); setOutName(baseName(p)) },
    [...IMAGE_EXTS, ...VIDEO_EXTS],
  )

  const run = async () => {
    if (!input || !kind) return
    // Use the name the user chose (defaults to the source name). Falls back to
    // the source base name if the field was cleared — never silently appends.
    const name = (outName.trim() || baseName(input))
    const target = await save({ defaultPath: `${dirOf(input)}${name}.${targetExt}` })
    if (!target) return

    // Send bounded options only — ffmpeg flags are built in Rust (no arg injection surface)
    const opts = kind === 'image'
      ? {
          kind: 'image',
          format: targetExt,
          quality: imgQuality,
          width: imgWidth ? Number(imgWidth) : null,
          gif_fps: gifFps !== 'same' ? Number(gifFps) : null,
        }
      : {
          kind: 'video',
          codec: targetExt === 'webm' ? 'libvpx-vp9' : vCodec,
          crf,
          preset,
          height: vHeight ? Number(vHeight) : null,
          fps: vFps !== 'same' ? Number(vFps) : null,
          audio: audioBr,
        }

    setBusy(true); setResult(null); setOutPath(target)
    try {
      const r = await invoke<Result>('ffmpeg_compress', {
        req: { input, output: target, strip_metadata: stripMeta, ...opts },
      })
      setResult(r)
    } catch (e) {
      setResult({ ok: false, log: String(e), in_size: 0, out_size: 0 })
    } finally {
      setBusy(false)
    }
  }

  const gifOut = targetExt === 'gif'
  const pngOut = targetExt === 'png'

  return (
    <ToolLayout title="Media Compressor" description="Native FFmpeg compression for images and video — right on your machine.">
      <div className="one-col" style={{ maxWidth: 720, margin: '0 auto', width: '100%' }}>

        {ffmpeg && !ffmpeg.available && (
          <div className="panel" style={{ padding: 20 }}>
            <strong>FFmpeg not found on this machine.</strong>
            <p style={{ fontSize: 13, color: 'var(--text-dim)', margin: '8px 0' }}>Install it once, then reopen this tool:</p>
            <pre style={{ fontSize: 12, fontFamily: 'var(--font-mono)', background: 'var(--surface2)', padding: 12, borderRadius: 8, overflowX: 'auto' }}>
{`macOS:    brew install ffmpeg
Windows:  winget install ffmpeg
Linux:    sudo apt install ffmpeg`}</pre>
          </div>
        )}

        {ffmpeg?.available && (
          <>
            <div className="panel" style={{
              padding: 20, display: 'flex', flexDirection: 'column', gap: 14,
              borderStyle: dragging ? 'dashed' : undefined,
              outline: dragging ? '2px dashed var(--accent)' : 'none',
              outlineOffset: 3,
              background: dragging ? 'var(--surface2)' : undefined,
              transition: 'background 0.15s',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                <button onClick={pick} className="btn-primary">Choose file…</button>
                <span style={{ fontSize: 13, fontFamily: 'var(--font-mono)', color: 'var(--text-dim)', wordBreak: 'break-all' }}>
                  {dragging ? 'Drop to load…' : (input || 'No file selected — or drag one in')}
                </span>
              </div>

              {input && (
                <div>
                  <label className="label" title="The name of the saved file. Change it to whatever you like — it won't append “-compressed” unless you type it.">Output file name</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <input
                      type="text"
                      value={outName}
                      onChange={e => setOutName(e.target.value)}
                      placeholder={baseName(input)}
                      spellCheck={false}
                      style={{ flex: 1, minWidth: 180 }}
                    />
                    <span style={{ fontSize: 13, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>.{targetExt}</span>
                  </div>
                  <Hint>You'll still get the native save dialog to confirm the location — this just sets the starting name.</Hint>
                </div>
              )}
            </div>

            {/* ── Minimal settings ── */}
            {kind === 'image' && (
              <div className="panel" style={{ padding: 20 }}>
                <div className="two-col" style={{ gap: 16 }}>
                  <div>
                    <label className="label" title="What file type the result will be. 'Same as input' keeps your format — a .gif stays a .gif.">Output format</label>
                    <select value={imgFormat} onChange={e => setImgFormat(e.target.value)} className="tool-select" style={{ width: '100%' }}>
                      <option value="same">Same as input (.{ext(input)})</option>
                      <option value="jpg">JPEG — smallest for photos</option>
                      <option value="webp">WebP — ~30% smaller than JPEG</option>
                      <option value="png">PNG — lossless, for graphics</option>
                    </select>
                    <Hint>Keeps your format by default. Convert to WebP for the smallest files that browsers still display.</Hint>
                  </div>
                  {!pngOut && (
                    <div>
                      <label className="label" title={gifOut ? 'Fewer colors = smaller GIF. 80 keeps it looking good.' : 'Higher = better looking but bigger file. 80 is visually identical to the original for most photos.'}>
                        Quality: {imgQuality}{imgQuality >= 90 ? ' · near-lossless' : imgQuality >= 70 ? ' · recommended' : ' · small file'}
                      </label>
                      <input type="range" min={40} max={100} value={imgQuality} onChange={e => setImgQuality(Number(e.target.value))} style={{ width: '100%' }} />
                      <Hint>{gifOut
                        ? 'For GIFs this controls the color count (64–256). Fewer colors + lower FPS below = much smaller files.'
                        : '80 looks identical to the original for most photos. Below 60 you may see artifacts.'}</Hint>
                    </div>
                  )}
                  {pngOut && <Hint>PNG is lossless — maximum compression applied, pixels untouched.</Hint>}
                </div>
              </div>
            )}

            {kind === 'video' && (
              <div className="panel" style={{ padding: 20 }}>
                <div className="two-col" style={{ gap: 16 }}>
                  <div>
                    <label className="label" title="Container format of the result. 'Same as input' keeps your extension.">Output format</label>
                    <select value={vFormat} onChange={e => setVFormat(e.target.value)} className="tool-select" style={{ width: '100%' }}>
                      <option value="same">Same as input (.{ext(input)})</option>
                      <option value="mp4">MP4 — plays everywhere</option>
                      <option value="webm">WebM — best for web embeds</option>
                    </select>
                    <Hint>MP4 is the safe choice for sharing. WebM compresses more but some players skip it.</Hint>
                  </div>
                  <div>
                    <label className="label" title="CRF — the video quality dial. Lower number = better quality and bigger file. 23–28 is the sweet spot.">
                      Quality: CRF {crf}{crf <= 22 ? ' · high quality' : crf <= 28 ? ' · recommended' : ' · smallest file'}
                    </label>
                    <input type="range" min={18} max={38} value={crf} onChange={e => setCrf(Number(e.target.value))} style={{ width: '100%' }} />
                    <Hint>26 ≈ visually same as original at a fraction of the size. Push to 30+ only when size matters most.</Hint>
                  </div>
                </div>
              </div>
            )}

            {/* ── More settings ── */}
            {kind && (
              <div className="panel" style={{ padding: '12px 20px' }}>
                <button onClick={() => setShowMore(!showMore)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: 'var(--text-dim)', padding: 0, fontFamily: 'var(--font-sans)' }}>
                  {showMore ? '▾' : '▸'} More settings
                </button>
                {showMore && (
                  <div className="two-col" style={{ gap: 16, marginTop: 14 }}>
                    {kind === 'image' && (
                      <>
                        <div>
                          <label className="label" title="Shrinks the image if it's wider than this. Never upscales.">Max width (px)</label>
                          <input value={imgWidth} onChange={e => setImgWidth(e.target.value.replace(/\D/g, ''))} placeholder="blank = keep original" className="tool-input" />
                          <Hint>Resizing is the biggest size win — a 4000px photo shown at 1920px wastes 75% of its pixels.</Hint>
                        </div>
                        {gifOut && (
                          <div>
                            <label className="label" title="Animated GIFs are often 25-50fps. 15fps looks nearly identical and halves the size.">Frame rate</label>
                            <select value={gifFps} onChange={e => setGifFps(e.target.value)} className="tool-select" style={{ width: '100%' }}>
                              <option value="same">Keep original</option>
                              <option value="15">15 fps — barely noticeable</option>
                              <option value="10">10 fps — smallest</option>
                            </select>
                            <Hint>Halving frame rate ≈ halving file size for animated GIFs.</Hint>
                          </div>
                        )}
                      </>
                    )}
                    {kind === 'video' && (
                      <>
                        {targetExt !== 'webm' && (
                          <div>
                            <label className="label" title="Video codec. H.265 makes ~30% smaller files but very old devices can't play it.">Codec</label>
                            <select value={vCodec} onChange={e => setVCodec(e.target.value as typeof vCodec)} className="tool-select" style={{ width: '100%' }}>
                              <option value="libx264">H.264 — plays everywhere</option>
                              <option value="libx265">H.265 — ~30% smaller</option>
                            </select>
                            <Hint>Stick with H.264 unless the file goes to modern devices only.</Hint>
                          </div>
                        )}
                        <div>
                          <label className="label" title="How long ffmpeg spends hunting for savings. Slower preset = smaller file, same quality.">Encoding speed</label>
                          <select value={preset} onChange={e => setPreset(e.target.value)} className="tool-select" style={{ width: '100%' }}>
                            <option value="fast">fast — quick, bigger file</option>
                            <option value="medium">medium — balanced</option>
                            <option value="slow">slow — smallest file</option>
                          </select>
                          <Hint>Affects only file size vs. waiting time, never quality.</Hint>
                        </div>
                        <div>
                          <label className="label" title="Shrinks the video if it's taller than this. 1080 or 720 are typical. Never upscales.">Max height (px)</label>
                          <input value={vHeight} onChange={e => setVHeight(e.target.value.replace(/\D/g, ''))} placeholder="blank = keep original" className="tool-input" />
                          <Hint>Dropping 4K → 1080p alone can cut size by 70%+.</Hint>
                        </div>
                        <div>
                          <label className="label" title="Caps the frame rate. 30fps is fine for most content; screen recordings can go to 24.">Frame rate</label>
                          <select value={vFps} onChange={e => setVFps(e.target.value)} className="tool-select" style={{ width: '100%' }}>
                            <option value="same">Keep original</option>
                            <option value="30">30 fps</option>
                            <option value="24">24 fps</option>
                          </select>
                          <Hint>60fps → 30fps cuts size ~35% and most viewers never notice.</Hint>
                        </div>
                        <div>
                          <label className="label" title="Audio track bitrate. 96k is fine for speech; 'Remove audio' for silent clips/screen recordings.">Audio</label>
                          <select value={audioBr} onChange={e => setAudioBr(e.target.value)} className="tool-select" style={{ width: '100%' }}>
                            <option value="128k">128 kbps — music quality</option>
                            <option value="96k">96 kbps — speech</option>
                            <option value="64k">64 kbps — smallest</option>
                            <option value="none">Remove audio track</option>
                          </select>
                          <Hint>Speech-only videos don't need music-grade audio.</Hint>
                        </div>
                      </>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input id="stripMeta" type="checkbox" checked={stripMeta} onChange={e => setStripMeta(e.target.checked)} />
                      <label htmlFor="stripMeta" style={{ fontSize: 13, cursor: 'pointer' }} title="Removes EXIF/GPS/camera info from the output file.">
                        Strip metadata (EXIF, GPS, camera info)
                      </label>
                    </div>
                  </div>
                )}
              </div>
            )}

            {input && !kind && (
              <div className="panel" style={{ padding: 16, fontSize: 13, color: 'var(--text-dim)' }}>
                Unsupported file type.
              </div>
            )}

            {kind && (
              <button onClick={run} disabled={busy} className="btn-primary" style={{ padding: '12px 0', fontSize: 15, opacity: busy ? 0.6 : 1 }}>
                {busy ? 'Compressing… (large videos take a while)' : `Compress → .${targetExt}`}
              </button>
            )}

            {result && result.ok && (
              <div className="panel" style={{ padding: 20 }}>
                <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>
                  ✓ Done — {fmt(result.in_size)} → {fmt(result.out_size)}
                  {result.in_size > 0 && result.out_size > 0 && (
                    <span style={{ marginLeft: 8, color: 'var(--text-dim)' }}>
                      ({Math.round((1 - result.out_size / result.in_size) * 100)}% smaller)
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', wordBreak: 'break-all' }}>
                  Saved to: {outPath}
                </div>
              </div>
            )}

            {result && !result.ok && (
              <div className="panel" style={{ padding: 20 }}>
                <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>✗ FFmpeg failed</div>
                <pre style={{ fontSize: 11, fontFamily: 'var(--font-mono)', whiteSpace: 'pre-wrap', wordBreak: 'break-all', maxHeight: 220, overflowY: 'auto', background: 'var(--surface2)', padding: 12, borderRadius: 8 }}>
                  {result.log}
                </pre>
              </div>
            )}
          </>
        )}
      </div>
    </ToolLayout>
  )
}
