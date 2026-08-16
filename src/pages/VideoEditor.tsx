import { useEffect, useRef, useState, useCallback } from 'react'
import ToolLayout from '../components/ToolLayout'
import { invoke, isTauri, convertFileSrc } from '@tauri-apps/api/core'
import { open, save } from '@tauri-apps/plugin-dialog'
import { useToast } from '../components/Toast'
import {
  Scissors, Copy, Trash2, SkipBack, SkipForward, Play, Pause, ChevronLeft, ChevronRight,
  Undo2, Redo2, ZoomIn, ZoomOut, Maximize2,
  Type, Square, Droplets, Upload, ChevronUp, ChevronDown, Circle, Minus, ArrowRight,
  AudioLines,
} from 'lucide-react'

const RELEASES_URL = 'https://github.com/santoshP0/Devtools/releases/latest'
const VIDEO_EXTS = ['mp4', 'mov', 'mkv', 'webm', 'avi', 'm4v']
const IMG_EXTS = ['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp']
const MAX_LAYERS = 10
const SNAP = 0.12
const MIN_PPS = 24
const MAX_PPS = 400
const ROW_H = 40   // timeline track row: 34 block + 6 margin

type Kind = 'video' | 'image' | 'text' | 'box' | 'blur' | 'circle' | 'line' | 'arrow' | 'audio'
const SHAPES: Kind[] = ['circle', 'line', 'arrow']

type Item = {
  id: string
  kind: Kind
  name: string
  track: number
  src?: string
  url?: string
  thumb?: string
  strip?: string        // filmstrip data URL (video block background)
  inPoint: number
  clipDur: number
  tStart: number
  tEnd: number
  x: number; y: number; w: number; h: number
  opacity: number
  text?: string
  size?: number
  color?: string
  strength?: number
  volume?: number
  mute?: boolean
  srcId?: string        // audio layer -> the clip it was detached from
}

const uid = () => Math.random().toString(36).slice(2, 9)
const clampN = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))
// re-pack tracks to contiguous 0..k-1 (preserving order) so there are never gaps
const normalizeTracks = (arr: Item[]): Item[] => {
  const uniq = [...new Set(arr.map(i => i.track))].sort((a, b) => a - b)
  const map = new Map(uniq.map((t, i) => [t, i]))
  return arr.map(i => ({ ...i, track: map.get(i.track)! }))
}
const fmtTime = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}.${String(Math.floor((s % 1) * 100)).padStart(2, '0')}`

const KIND_COLOR: Record<Kind, string> = { video: '#3b82f6', image: '#a855f7', text: '#22c55e', box: '#f97316', blur: '#06b6d4', circle: '#ec4899', line: '#eab308', arrow: '#14b8a6', audio: '#8b5cf6' }
const KIND_LABEL: Record<Kind, string> = { video: 'Clip', image: 'Image', text: 'Text', box: 'Box', blur: 'Blur', circle: 'Circle', line: 'Line', arrow: 'Arrow', audio: 'Audio' }

// shape as SVG (stretched to the layer box) — same markup previews and, once
// rasterized, becomes the export overlay so preview matches output.
function shapeSvg(kind: Kind, rawColor: string): string {
  const color = /^#[0-9a-fA-F]{3,8}$/.test(rawColor) ? rawColor : '#ff3b30'  // no injection via innerHTML
  const body = kind === 'circle' ? `<ellipse cx="50" cy="50" rx="49" ry="49" fill="${color}"/>`
    : kind === 'line' ? `<rect x="0" y="40" width="100" height="20" fill="${color}"/>`
    : `<rect x="0" y="40" width="68" height="20" fill="${color}"/><polygon points="60,18 100,50 60,82" fill="${color}"/>`
  return `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">${body}</svg>`
}
function svgToPng(svg: string, w: number, h: number): Promise<string> {
  return new Promise((res, rej) => {
    const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }))
    const img = new Image()
    img.onload = () => {
      const c = document.createElement('canvas'); c.width = Math.max(2, w); c.height = Math.max(2, h)
      c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height)
      URL.revokeObjectURL(url)
      res(c.toDataURL('image/png').split(',')[1])
    }
    img.onerror = e => { URL.revokeObjectURL(url); rej(e) }
    img.src = url
  })
}
type MediaAsset = { id: string; kind: 'video' | 'image'; name: string; src: string; url: string; thumb?: string }

function probeVideo(url: string): Promise<{ w: number; h: number; dur: number }> {
  return new Promise(res => {
    const v = document.createElement('video')
    v.preload = 'metadata'
    v.onloadedmetadata = () => res({ w: v.videoWidth || 1280, h: v.videoHeight || 720, dur: v.duration || 5 })
    v.onerror = () => res({ w: 1280, h: 720, dur: 5 })
    v.src = url
  })
}
function probeImage(url: string): Promise<{ w: number; h: number }> {
  return new Promise(res => {
    const i = new Image()
    i.onload = () => res({ w: i.naturalWidth || 640, h: i.naturalHeight || 480 })
    i.onerror = () => res({ w: 640, h: 480 })
    i.src = url
  })
}
// single frame for the timeline block; canvas can be tainted by the asset
// protocol, so fail soft to no-thumbnail rather than throwing.
function grabThumb(url: string): Promise<string> {
  return new Promise(res => {
    const v = document.createElement('video')
    v.src = url; v.muted = true
    v.onloadeddata = () => { try { v.currentTime = Math.min(0.1, v.duration || 0) } catch { res('') } }
    v.onseeked = () => {
      try {
        const c = document.createElement('canvas'); c.width = 160; c.height = 90
        c.getContext('2d')!.drawImage(v, 0, 0, 160, 90)
        res(c.toDataURL('image/jpeg', 0.6))
      } catch { res('') }
    }
    v.onerror = () => res('')
  })
}

const HANDLES: { dir: string; cur: string; pos: React.CSSProperties }[] = [
  { dir: 'nw', cur: 'nwse-resize', pos: { left: -5, top: -5 } },
  { dir: 'n', cur: 'ns-resize', pos: { left: '50%', top: -5, transform: 'translateX(-50%)' } },
  { dir: 'ne', cur: 'nesw-resize', pos: { right: -5, top: -5 } },
  { dir: 'e', cur: 'ew-resize', pos: { right: -5, top: '50%', transform: 'translateY(-50%)' } },
  { dir: 'se', cur: 'nwse-resize', pos: { right: -5, bottom: -5 } },
  { dir: 's', cur: 'ns-resize', pos: { left: '50%', bottom: -5, transform: 'translateX(-50%)' } },
  { dir: 'sw', cur: 'nesw-resize', pos: { left: -5, bottom: -5 } },
  { dir: 'w', cur: 'ew-resize', pos: { left: -5, top: '50%', transform: 'translateY(-50%)' } },
]

export default function VideoEditor() {
  if (!isTauri()) {
    return (
      <ToolLayout title="Video Editor" description="Cut, layer and export video — desktop app exclusive.">
        <div className="panel" style={{ maxWidth: 560, margin: '40px auto', padding: 32, textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🎬</div>
          <h2 style={{ fontSize: 20, marginBottom: 10 }}>Available in the desktop app</h2>
          <p style={{ fontSize: 14, color: 'var(--text-dim)', lineHeight: 1.7, marginBottom: 20 }}>
            A simple timeline editor — trim, split, join clips, stack up to {MAX_LAYERS} layers,
            add boxes, text and blur, then export with bundled FFmpeg. No upload, no setup.
          </p>
          <a href={RELEASES_URL} target="_blank" rel="noreferrer" className="btn-primary" style={{ display: 'inline-block', padding: '10px 24px' }}>
            ⬇ Download Desktop App
          </a>
        </div>
      </ToolLayout>
    )
  }
  return <Editor />
}

function Editor() {
  const [items, setItems] = useState<Item[]>([])
  const [selId, setSelId] = useState<string | null>(null)
  const [proj, setProj] = useState({ w: 1280, h: 720, fps: 30 })
  const [time, setTime] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; log: string; path: string } | null>(null)
  const [box, setBox] = useState({ w: 640, h: 360 })
  const [pps, setPps] = useState(100)
  const [undoStack, setUndoStack] = useState<Item[][]>([])
  const [redoStack, setRedoStack] = useState<Item[][]>([])
  const [dragOver, setDragOver] = useState(false)
  const [media, setMedia] = useState<MediaAsset[]>([])
  const [scrubbing, setScrubbing] = useState(false)
  const [mediaW, setMediaW] = useState(158)
  const [propsW, setPropsW] = useState(236)
  const [timelineH, setTimelineH] = useState(210)
  const toast = useToast()

  const duration = Math.max(1, ...items.map(i => i.tEnd))
  const trackCount = Math.max(1, ...items.map(i => i.track + 1))
  const laneCount = clampN(trackCount, 1, MAX_LAYERS)
  const sel = items.find(i => i.id === selId) || null

  const timeRef = useRef(0)
  const rafRef = useRef(0)
  const ppsRef = useRef(pps); ppsRef.current = pps
  const stageRef = useRef<HTMLDivElement>(null)
  const previewBoxRef = useRef<HTMLDivElement>(null)
  const tracksAreaRef = useRef<HTMLDivElement>(null)
  const newLaneRef = useRef<HTMLDivElement>(null)   // "drops into a new lane" bar
  const mediaPanelRef = useRef<HTMLDivElement>(null)
  const tlRef = useRef<HTMLDivElement>(null)
  const phRef = useRef<HTMLDivElement>(null)
  const videoEls = useRef<Map<string, HTMLMediaElement>>(new Map())  // video + detached-audio elements
  const layerEls = useRef<Map<string, HTMLElement>>(new Map())       // stage layer wrappers (imperative show/hide during play)
  const timeReadRef = useRef<HTMLSpanElement>(null)                  // time readout (updated imperatively during play)
  const scrubBubbleRef = useRef<HTMLDivElement>(null)               // scrub time bubble (updated imperatively during scrub)
  const clipRef = useRef<Item | null>(null)   // copy/paste buffer
  const itemsRef = useRef(items); itemsRef.current = items
  const durRef = useRef(duration); durRef.current = duration
  const laneCountRef = useRef(laneCount); laneCountRef.current = laneCount

  useEffect(() => {
    const el = previewBoxRef.current
    if (!el) return
    const ro = new ResizeObserver(() => setBox({ w: el.clientWidth, h: el.clientHeight }))
    ro.observe(el); setBox({ w: el.clientWidth, h: el.clientHeight })
    return () => ro.disconnect()
  }, [])

  // OS file drag-drop — the webview swallows HTML5 drops, so Tauri delivers the
  // real file paths through this event instead. Paths are absolute (ffmpeg-ready).
  useEffect(() => {
    let un: (() => void) | undefined
    const ext = (s: string) => s.split('.').pop()?.toLowerCase() || ''
    import('@tauri-apps/api/webview').then(({ getCurrentWebview }) => {
      getCurrentWebview().onDragDropEvent(ev => {
        const p = ev.payload as { type: string; paths?: string[]; position?: { x: number; y: number } }
        if (p.type === 'enter' || p.type === 'over') setDragOver(true)
        else if (p.type === 'leave') setDragOver(false)
        else if (p.type === 'drop') {
          setDragOver(false)
          const paths = p.paths || []
          const vids = paths.filter(x => VIDEO_EXTS.includes(ext(x)))
          const imgs = paths.filter(x => IMG_EXTS.includes(ext(x)))
          const dpr = window.devicePixelRatio || 1
          const cx = (p.position?.x ?? 0) / dpr, cy = (p.position?.y ?? 0) / dpr
          // dropped onto the MEDIA panel → import into the bin only
          const mp = mediaPanelRef.current?.getBoundingClientRect()
          if (mp && cy >= mp.top && cy <= mp.bottom && cx >= mp.left && cx <= mp.right) {
            importToBin([...vids, ...imgs]); return
          }
          // dropped onto the timeline → place at that lane + time
          const area = tracksAreaRef.current?.getBoundingClientRect()
          let place: { track: number; at: number } | undefined
          if (area && cy >= area.top && cy <= area.bottom && cx >= area.left && cx <= area.right) {
            const rows = laneCountRef.current
            const rowFromTop = Math.floor((cy - area.top - 6) / ROW_H)
            const track = clampN((rows - 1) - rowFromTop, 0, MAX_LAYERS - 1)
            const at = Math.max(0, (cx - area.left) / ppsRef.current)
            place = { track, at }
          }
          if (vids.length) addVideoPaths(vids, place)
          if (imgs.length) addImagePaths(imgs, place)
        }
      }).then(f => { un = f })
    })
    return () => { if (un) un() }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── history ──
  const snapshot = useCallback(() => {
    setUndoStack(s => [...s.slice(-49), itemsRef.current.map(i => ({ ...i }))])
    setRedoStack([])
  }, [])
  const undo = () => setUndoStack(s => {
    if (!s.length) return s
    setRedoStack(r => [...r, itemsRef.current.map(i => ({ ...i }))])
    setItems(s[s.length - 1]); setSelId(null)
    return s.slice(0, -1)
  })
  const redo = () => setRedoStack(r => {
    if (!r.length) return r
    setUndoStack(u => [...u, itemsRef.current.map(i => ({ ...i }))])
    setItems(r[r.length - 1])
    return r.slice(0, -1)
  })

  const patch = (id: string, p: Partial<Item>) => setItems(xs => xs.map(i => i.id === id ? { ...i, ...p } : i))

  // ── playback ──
  const syncVideos = useCallback((t: number, isPlaying: boolean) => {
    for (const it of itemsRef.current) {
      if (it.kind !== 'video' && it.kind !== 'audio') continue
      const el = videoEls.current.get(it.id)
      if (el instanceof HTMLAudioElement) el.volume = clampN(it.volume ?? 1, 0, 1)
      if (!el) continue
      const active = t >= it.tStart && t < it.tEnd
      if (!active) { if (!el.paused) el.pause(); continue }
      const want = it.inPoint + (t - it.tStart)
      if (isPlaying) {
        if (el.paused) el.play().catch(() => {})
        if (Math.abs(el.currentTime - want) > 0.3) el.currentTime = want
      } else {
        if (!el.paused) el.pause()
        if (Math.abs(el.currentTime - want) > 0.05) el.currentTime = want
      }
    }
  }, [])

  // paint a frame imperatively (no React state) — layer show/hide + time readout.
  // Lets the rAF playback loop run without re-rendering the whole editor each tick.
  const paintFrame = useCallback((t: number) => {
    for (const it of itemsRef.current) {
      if (it.kind === 'audio') continue
      const el = layerEls.current.get(it.id)
      if (el) el.style.display = (t >= it.tStart && t < it.tEnd) ? 'block' : 'none'
    }
    if (timeReadRef.current) timeReadRef.current.textContent = `${fmtTime(t)} / ${fmtTime(durRef.current)}`
  }, [])

  const seek = useCallback((t: number) => {
    const c = clampN(t, 0, durRef.current)
    timeRef.current = c; setTime(c)
    if (phRef.current) phRef.current.style.left = `${c * ppsRef.current}px`
    syncVideos(c, false)
  }, [syncVideos])
  const stepFrame = (n: number) => { setPlaying(false); seek(timeRef.current + n / proj.fps) }

  useEffect(() => {
    if (!playing && phRef.current) phRef.current.style.left = `${time * pps}px`
  }, [time, playing, pps])

  useEffect(() => {
    if (!playing) return
    let last = performance.now()
    const tick = (now: number) => {
      const dt = (now - last) / 1000; last = now
      const t = timeRef.current + dt
      if (t >= durRef.current) {
        timeRef.current = durRef.current
        if (phRef.current) phRef.current.style.left = `${durRef.current * ppsRef.current}px`
        syncVideos(durRef.current, false); paintFrame(durRef.current)
        setTime(durRef.current); setPlaying(false); return
      }
      timeRef.current = t
      if (phRef.current) phRef.current.style.left = `${t * ppsRef.current}px`
      syncVideos(t, true); paintFrame(t)   // all imperative — no setState during play
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    // on pause, sync React state to where playback actually stopped
    return () => { cancelAnimationFrame(rafRef.current); setTime(timeRef.current) }
  }, [playing, syncVideos, paintFrame])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      if (e.code === 'Space') { e.preventDefault(); setPlaying(p => !p) }
      else if (e.key === 'ArrowRight') { e.preventDefault(); stepFrame(e.shiftKey ? 5 : 1) }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); stepFrame(e.shiftKey ? -5 : -1) }
      else if ((e.key === 'Delete' || e.key === 'Backspace') && selId) { e.preventDefault(); removeSel() }
      else if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo() }
      else if ((e.metaKey || e.ctrlKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); redo() }
      else if ((e.metaKey || e.ctrlKey) && e.key === 'c' && selId) { e.preventDefault(); const s = itemsRef.current.find(i => i.id === selId); if (s) clipRef.current = { ...s } }
      else if ((e.metaKey || e.ctrlKey) && e.key === 'v' && clipRef.current) { e.preventDefault(); pasteClip() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selId]) // eslint-disable-line react-hooks/exhaustive-deps

  const topTrack = () => (items.length ? Math.max(...items.map(i => i.track)) + 1 : 0)

  // filmstrip for a clip's timeline block — generated natively, patched in async
  const makeStrip = (id: string, src: string, dur: number) => {
    invoke<string>('ffmpeg_filmstrip', { src, count: 14, duration: dur })
      .then(s => { if (s) patch(id, { strip: s }) }).catch(() => {})
  }

  const addMedia = (entries: MediaAsset[]) => setMedia(m => {
    const have = new Set(m.map(x => x.src))
    return [...m, ...entries.filter(e => !have.has(e.src))]
  })

  type Place = { track: number; at: number }
  // ── add layers (path-based so dialog + drag-drop share one path) ──
  const addVideoPaths = async (paths: string[], place?: Place) => {
    const cur = itemsRef.current
    if (!paths.length || cur.length >= MAX_LAYERS) return
    const dur0 = Math.max(1, ...cur.map(i => i.tEnd))
    let cursor = place ? place.at : (cur.length === 0 ? 0 : dur0)
    const track = place ? place.track : 0
    let first = cur.length === 0
    const add: Item[] = []
    for (const p of paths) {
      if (cur.length + add.length >= MAX_LAYERS) break
      const url = convertFileSrc(p)
      const meta = await probeVideo(url)
      const thumb = await grabThumb(url)
      if (first) { setProj({ w: meta.w, h: meta.h, fps: 30 }); first = false }
      add.push({ id: uid(), kind: 'video', name: p.split(/[/\\]/).pop() || 'clip', track, src: p, url, thumb, inPoint: 0, clipDur: meta.dur, tStart: cursor, tEnd: cursor + meta.dur, x: 0, y: 0, w: 1, h: 1, opacity: 1, volume: 1, mute: false })
      cursor += meta.dur
    }
    if (!add.length) return
    snapshot(); setItems(xs => normalizeTracks([...xs, ...add])); setSelId(add[add.length - 1].id)
    add.forEach(it => makeStrip(it.id, it.src!, it.clipDur))
    addMedia(add.map(it => ({ id: it.id, kind: 'video', name: it.name, src: it.src!, url: it.url!, thumb: it.thumb })))
  }
  const addImagePaths = async (paths: string[], place?: Place) => {
    const cur = itemsRef.current
    if (!paths.length || cur.length >= MAX_LAYERS) return
    const dur0 = Math.max(1, ...cur.map(i => i.tEnd))
    const baseTrack = place ? place.track : (cur.length ? Math.max(...cur.map(i => i.track)) + 1 : 0)
    const at = place ? place.at : 0
    const end = at + (dur0 > 1 ? Math.min(5, dur0) : 5)
    const add: Item[] = []
    for (const p of paths) {
      if (cur.length + add.length >= MAX_LAYERS) break
      const url = convertFileSrc(p)
      const meta = await probeImage(url)
      const arI = meta.w / meta.h
      const w = 0.4, h = clampN(0.4 / arI * (proj.w / proj.h), 0.05, 1)
      const off = add.length * 0.04
      add.push({ id: uid(), kind: 'image', name: p.split(/[/\\]/).pop() || 'image', track: baseTrack + add.length, src: p, url, thumb: url, inPoint: 0, clipDur: 0, tStart: at, tEnd: end, x: 0.3 + off, y: 0.3 + off, w, h, opacity: 1 })
    }
    if (!add.length) return
    snapshot(); setItems(xs => normalizeTracks([...xs, ...add])); setSelId(add[add.length - 1].id)
    addMedia(add.map(it => ({ id: it.id, kind: 'image', name: it.name, src: it.src!, url: it.url!, thumb: it.thumb })))
  }
  // one importer for both video + image (dialog); drops share the same paths
  const importMedia = async () => {
    const picked = await open({ multiple: true, filters: [{ name: 'Media', extensions: [...VIDEO_EXTS, ...IMG_EXTS] }] })
    if (!picked) return
    const paths = Array.isArray(picked) ? picked : [picked]
    const ex = (s: string) => s.split('.').pop()?.toLowerCase() || ''
    const vids = paths.filter(x => VIDEO_EXTS.includes(ex(x)))
    const imgs = paths.filter(x => IMG_EXTS.includes(ex(x)))
    if (vids.length) await addVideoPaths(vids)
    if (imgs.length) await addImagePaths(imgs)
  }
  const addOverlay = (kind: 'text' | 'box' | 'blur' | 'circle' | 'line' | 'arrow') => {
    if (items.length >= MAX_LAYERS) return
    snapshot()
    const base: Item = { id: uid(), kind, name: KIND_LABEL[kind], track: topTrack(), inPoint: 0, clipDur: 0, tStart: 0, tEnd: Math.min(5, duration), x: 0.3, y: 0.35, w: 0.4, h: 0.25, opacity: 1 }
    if (kind === 'text') { base.text = 'Your text'; base.size = Math.round(proj.h * 0.07); base.color = '#ffffff'; base.h = 0.15 }
    if (kind === 'box' || SHAPES.includes(kind)) base.color = '#ff3b30'
    if (kind === 'line') { base.h = 0.04; base.y = 0.48 }
    if (kind === 'arrow') { base.h = 0.14; base.y = 0.43 }
    if (kind === 'blur') base.strength = 14
    setItems(xs => normalizeTracks([...xs, base])); setSelId(base.id)
  }
  // add a bin asset back onto the timeline
  const addFromMedia = (a: MediaAsset) => { if (a.kind === 'video') addVideoPaths([a.src]); else addImagePaths([a.src]) }
  // import into the media bin only (dropped onto the MEDIA panel, not the timeline)
  const importToBin = async (paths: string[]) => {
    const entries: MediaAsset[] = []
    for (const p of paths) {
      const ex = p.split('.').pop()?.toLowerCase() || ''
      const isVid = VIDEO_EXTS.includes(ex), isImg = IMG_EXTS.includes(ex)
      if (!isVid && !isImg) continue
      const url = convertFileSrc(p)
      entries.push({ id: uid(), kind: isVid ? 'video' : 'image', name: p.split(/[/\\]/).pop() || 'media', src: p, url, thumb: isVid ? await grabThumb(url) : url })
    }
    addMedia(entries)
  }

  const removeSel = () => { if (selId) { snapshot(); setItems(xs => normalizeTracks(xs.filter(i => i.id !== selId))); setSelId(null) } }
  const duplicateSel = () => {
    if (!sel || items.length >= MAX_LAYERS) return
    snapshot()
    const c: Item = { ...sel, id: uid() }
    setItems(xs => normalizeTracks([...xs, c])); setSelId(c.id)
  }
  // paste the copy buffer at the playhead (same lane)
  const pasteClip = () => {
    const c = clipRef.current
    if (!c || itemsRef.current.length >= MAX_LAYERS) return
    snapshot()
    const at = timeRef.current, len = c.tEnd - c.tStart
    const n: Item = { ...c, id: uid(), tStart: at, tEnd: at + len }
    setItems(xs => normalizeTracks([...xs, n])); setSelId(n.id)
  }
  const splitAtPlayhead = () => {
    if (!sel || sel.kind !== 'video' || items.length >= MAX_LAYERS) return
    const t = timeRef.current
    if (t <= sel.tStart + 0.05 || t >= sel.tEnd - 0.05) return
    snapshot()
    const left: Item = { ...sel, tEnd: t }
    const right: Item = { ...sel, id: uid(), tStart: t, inPoint: sel.inPoint + (t - sel.tStart) }
    setItems(xs => xs.flatMap(i => i.id === sel.id ? [left, right] : [i])); setSelId(right.id)
  }
  // pull a clip's audio onto its own layer: mute the video, add an audio layer
  // that keeps the same source + timing and carries the volume (own lane, movable)
  const detachAudio = (v: Item) => {
    // one audio layer per clip — bail if it's already been detached
    if (v.kind !== 'video' || items.length >= MAX_LAYERS) return
    if (items.some(i => i.kind === 'audio' && i.srcId === v.id)) return
    snapshot()
    const a: Item = {
      id: uid(), kind: 'audio', name: v.name, track: topTrack(), srcId: v.id,
      src: v.src, url: v.url, inPoint: v.inPoint, clipDur: v.clipDur,
      tStart: v.tStart, tEnd: v.tEnd, x: 0, y: 0, w: 1, h: 1, opacity: 1,
      volume: v.volume ?? 1, mute: false,
    }
    setItems(xs => normalizeTracks([...xs.map(i => i.id === v.id ? { ...i, mute: true } : i), a]))
    setSelId(a.id)
  }

  // move a layer up/down past its neighbour, then re-pack (no gaps)
  const moveLayer = (id: string, dir: 1 | -1) => {
    if (!items.some(x => x.id === id)) return
    snapshot()
    setItems(xs => normalizeTracks(xs.map(i => i.id === id ? { ...i, track: i.track + dir * 1.5 } : i)))
  }

  // ── preview move / resize (imperative) ──
  const startLayerDrag = (e: React.PointerEvent, it: Item) => {
    e.stopPropagation(); setSelId(it.id); snapshot(); if (playing) setPlaying(false)
    const rect = stageRef.current!.getBoundingClientRect()
    const el = (e.currentTarget as HTMLElement).closest('[data-layer]') as HTMLElement
    const sx = e.clientX, sy = e.clientY, o = { x: it.x, y: it.y, w: it.w, h: it.h }
    const move = (ev: PointerEvent) => {
      const nx = clampN(o.x + (ev.clientX - sx) / rect.width, 0, 1 - o.w)
      const ny = clampN(o.y + (ev.clientY - sy) / rect.height, 0, 1 - o.h)
      el.style.left = `${nx * 100}%`; el.style.top = `${ny * 100}%`
    }
    const up = (ev: PointerEvent) => {
      window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up)
      patch(it.id, { x: clampN(o.x + (ev.clientX - sx) / rect.width, 0, 1 - o.w), y: clampN(o.y + (ev.clientY - sy) / rect.height, 0, 1 - o.h) })
    }
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', up)
  }
  const startResize = (e: React.PointerEvent, it: Item, dir: string) => {
    e.stopPropagation(); setSelId(it.id); snapshot(); if (playing) setPlaying(false)
    const rect = stageRef.current!.getBoundingClientRect()
    const el = (e.currentTarget as HTMLElement).closest('[data-layer]') as HTMLElement
    const sx = e.clientX, sy = e.clientY, o = { x: it.x, y: it.y, w: it.w, h: it.h }
    const calc = (ev: PointerEvent) => {
      const dx = (ev.clientX - sx) / rect.width, dy = (ev.clientY - sy) / rect.height
      let { x, y, w, h } = o
      if (dir.includes('e')) w = clampN(o.w + dx, 0.03, 1 - o.x)
      if (dir.includes('s')) h = clampN(o.h + dy, 0.03, 1 - o.y)
      if (dir.includes('w')) { const nx = clampN(o.x + dx, 0, o.x + o.w - 0.03); x = nx; w = o.w + (o.x - nx) }
      if (dir.includes('n')) { const ny = clampN(o.y + dy, 0, o.y + o.h - 0.03); y = ny; h = o.h + (o.y - ny) }
      return { x, y, w, h }
    }
    const move = (ev: PointerEvent) => { const b = calc(ev); el.style.left = `${b.x * 100}%`; el.style.top = `${b.y * 100}%`; el.style.width = `${b.w * 100}%`; el.style.height = `${b.h * 100}%` }
    const up = (ev: PointerEvent) => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); patch(it.id, calc(ev)) }
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', up)
  }

  // ── timeline block: move (horizontal time + vertical track) / trim edges ──
  // Fully imperative while dragging — mutate the block's own left/width/transform
  // and paint the drop lane directly on the row DOM. State is committed once, on
  // release, so there's no per-move React re-render of the whole timeline (that
  // full re-render, filmstrips and all, was the jitter).
  const startBlockDrag = (e: React.PointerEvent, it: Item, mode: 'move' | 'l' | 'r') => {
    e.stopPropagation(); setSelId(it.id); snapshot(); if (playing) setPlaying(false)
    document.body.style.cursor = mode === 'move' ? 'grabbing' : 'ew-resize'
    const blockEl = (e.currentTarget as HTMLElement).closest('[data-block]') as HTMLElement
    const rowEl = blockEl.parentElement as HTMLElement   // lift the row so the block floats over other lanes
    if (mode === 'move') rowEl.style.zIndex = '5'
    const areaEl = tracksAreaRef.current!
    const areaTop = areaEl.getBoundingClientRect().top + 6
    const sx = e.clientX, o = { tStart: it.tStart, tEnd: it.tEnd, inPoint: it.inPoint }
    const pps0 = ppsRef.current, lanes0 = laneCountRef.current
    const edges = itemsRef.current.filter(i => i.id !== it.id).flatMap(i => [i.tStart, i.tEnd])
    const snap = (v: number) => { for (const e2 of edges) if (Math.abs(v - e2) < SNAP) return e2; return v }
    let final = { tStart: o.tStart, tEnd: o.tEnd, inPoint: o.inPoint, track: it.track }
    let litLane = -2
    const lightLane = (t: number) => {   // t out of [0,lanes0) → new lane, light nothing
      if (t === litLane) return
      litLane = t
      areaEl.querySelectorAll<HTMLElement>('[data-lane]').forEach(row => {
        const on = Number(row.dataset.lane) === t
        row.style.background = on ? 'color-mix(in srgb, var(--accent) 22%, transparent)' : 'var(--surface2)'
        row.style.outline = on ? '2px dashed var(--accent)' : 'none'
      })
    }
    const move = (ev: PointerEvent) => {
      const d = (ev.clientX - sx) / pps0
      if (mode === 'move') {
        const len = o.tEnd - o.tStart
        let ns = Math.max(0, o.tStart + d); ns = snap(ns)
        if (Math.abs(snap(ns + len) - (ns + len)) < SNAP) ns = snap(ns + len) - len
        // nearest lane; one past the top (new lane above) or -1 (new lane below)
        const laneFloat = (lanes0 - 1) - (ev.clientY - areaTop) / ROW_H
        const nt = clampN(Math.round(laneFloat), -1, lanes0)
        blockEl.style.left = `${ns * pps0}px`
        blockEl.style.transform = `translateY(${(it.track - nt) * ROW_H}px)`
        const newLane = nt < 0 || nt >= lanes0
        lightLane(newLane ? -2 : nt)
        if (newLaneRef.current) {   // show the "new lane" bar above/below the rows
          newLaneRef.current.style.display = newLane ? 'block' : 'none'
          if (newLane) newLaneRef.current.style.top = `${nt < 0 ? lanes0 * ROW_H + 3 : -ROW_H + 3}px`
        }
        final = { tStart: ns, tEnd: ns + len, inPoint: o.inPoint, track: nt }
      } else if (mode === 'l') {
        let ns = clampN(o.tStart + d, 0, o.tEnd - 0.1); ns = snap(ns)
        const nin = it.kind === 'video' ? Math.max(0, o.inPoint + (ns - o.tStart)) : o.inPoint
        blockEl.style.left = `${ns * pps0}px`
        blockEl.style.width = `${Math.max(8, (o.tEnd - ns) * pps0)}px`
        final = { tStart: ns, tEnd: o.tEnd, inPoint: nin, track: it.track }
      } else {
        let ne = Math.max(o.tStart + 0.1, o.tEnd + d)
        if (it.kind === 'video') ne = Math.min(ne, o.tStart + (it.clipDur - o.inPoint))
        ne = snap(ne)
        blockEl.style.width = `${Math.max(8, (ne - o.tStart) * pps0)}px`
        final = { tStart: o.tStart, tEnd: ne, inPoint: o.inPoint, track: it.track }
      }
    }
    const up = () => {
      document.body.style.cursor = ''; blockEl.style.transform = ''; rowEl.style.zIndex = ''
      if (newLaneRef.current) newLaneRef.current.style.display = 'none'
      window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up)
      setItems(xs => normalizeTracks(xs.map(i => i.id === it.id ? { ...i, ...final } : i)))
    }
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', up)
  }

  // ── scrub (ruler click-drag + playhead handle drag) ──
  // imperative during the drag (playhead + video sync + layer paint + bubble),
  // commit React state once on release — no per-move re-render of the timeline
  const scrub = (originLeft: number, startClientX: number, seekNow: boolean) => {
    setPlaying(false); setScrubbing(true)
    document.body.style.cursor = 'ew-resize'
    const to = (cx: number) => {
      const c = clampN((cx - originLeft) / ppsRef.current, 0, durRef.current)
      timeRef.current = c
      if (phRef.current) phRef.current.style.left = `${c * ppsRef.current}px`
      syncVideos(c, false); paintFrame(c)
      if (scrubBubbleRef.current) scrubBubbleRef.current.textContent = fmtTime(c)
    }
    if (seekNow) to(startClientX)
    const mv = (ev: PointerEvent) => to(ev.clientX)
    const up = () => { setScrubbing(false); setTime(timeRef.current); document.body.style.cursor = ''; window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', up) }
    window.addEventListener('pointermove', mv); window.addEventListener('pointerup', up)
  }
  const startScrub = (e: React.PointerEvent) => scrub(e.currentTarget.getBoundingClientRect().left, e.clientX, true)
  const startPlayheadDrag = (e: React.PointerEvent) => {
    e.stopPropagation()
    const area = tracksAreaRef.current?.getBoundingClientRect()
    if (area) scrub(area.left, e.clientX, false)
  }

  // drag a pane divider — absolute from the value captured at pointer-down
  const startPaneDrag = (e: React.PointerEvent, start: number, set: (n: number) => void, axis: 'x' | 'y', sign: number, min: number, max: number) => {
    e.preventDefault()
    const s0 = axis === 'x' ? e.clientX : e.clientY
    document.body.style.cursor = axis === 'x' ? 'col-resize' : 'row-resize'
    const mv = (ev: PointerEvent) => { const c = axis === 'x' ? ev.clientX : ev.clientY; set(clampN(start + (c - s0) * sign, min, max)) }
    const up = () => { document.body.style.cursor = ''; window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', up) }
    window.addEventListener('pointermove', mv); window.addEventListener('pointerup', up)
  }

  const zoom = (f: number) => setPps(p => clampN(p * f, MIN_PPS, MAX_PPS))
  const zoomFit = () => { const w = tlRef.current?.clientWidth; if (w) setPps(clampN((w - 24) / duration, MIN_PPS, MAX_PPS)) }

  const exportVideo = async () => {
    if (items.length === 0) return
    const out = await save({ defaultPath: 'edit.mp4', filters: [{ name: 'Video', extensions: ['mp4', 'mov', 'mkv'] }] })
    if (!out) return
    setBusy(true); setResult(null); setPlaying(false)
    try {
      const ordered = [...items].sort((a, b) => a.track - b.track)
      const specItems: Record<string, unknown>[] = []
      for (const i of ordered) {
        if (i.kind === 'video') specItems.push({ kind: 'video', src: i.src, in_point: i.inPoint, t_start: i.tStart, t_end: i.tEnd, x: i.x, y: i.y, w: i.w, h: i.h, opacity: i.opacity, volume: i.volume ?? 1, mute: !!i.mute })
        else if (i.kind === 'image') specItems.push({ kind: 'image', src: i.src, t_start: i.tStart, t_end: i.tEnd, x: i.x, y: i.y, w: i.w, h: i.h, opacity: i.opacity })
        else if (i.kind === 'text') specItems.push({ kind: 'text', text: i.text || '', t_start: i.tStart, t_end: i.tEnd, x: i.x, y: i.y, size: i.size || 32, color: i.color || '#ffffff', opacity: i.opacity })
        else if (i.kind === 'box') specItems.push({ kind: 'box', t_start: i.tStart, t_end: i.tEnd, x: i.x, y: i.y, w: i.w, h: i.h, color: i.color || '#ff3b30', opacity: i.opacity })
        else if (i.kind === 'blur') specItems.push({ kind: 'blur', t_start: i.tStart, t_end: i.tEnd, x: i.x, y: i.y, w: i.w, h: i.h, strength: i.strength || 12 })
        else if (i.kind === 'audio') specItems.push({ kind: 'audio', src: i.src, in_point: i.inPoint, t_start: i.tStart, t_end: i.tEnd, volume: i.volume ?? 1 })
        else {
          const png = await svgToPng(shapeSvg(i.kind, i.color || '#ff3b30'), Math.round(i.w * proj.w), Math.round(i.h * proj.h))
          specItems.push({ kind: 'shape', png, t_start: i.tStart, t_end: i.tEnd, x: i.x, y: i.y, w: i.w, h: i.h, opacity: i.opacity })
        }
      }
      const spec = { width: proj.w, height: proj.h, fps: proj.fps, duration, bg: '#000000', output: out, items: specItems }
      const r = await invoke<{ ok: boolean; log: string }>('ffmpeg_render', { spec })
      if (r.ok) { setResult(null); toast.show(`Exported to ${out.split(/[/\\]/).pop()}`) }
      else setResult({ ok: false, log: r.log, path: out })
    } catch (err) {
      setResult({ ok: false, log: String(err), path: out })
    } finally { setBusy(false) }
  }

  // preview letterbox fit
  const ar = proj.w / proj.h
  const availW = Math.max(0, box.w - 24), availH = Math.max(0, box.h - 24)
  const fitW = availW && availH ? Math.min(availW, availH * ar) : 320
  const fitH = fitW / ar
  const scale = fitW / proj.w
  const tlWidth = duration * pps + 24
  const tickStep = pps < 45 ? 5 : pps < 90 ? 2 : 1

  const ELEMENTS = [
    { label: 'Text', icon: Type, fn: () => addOverlay('text') },
    { label: 'Box', icon: Square, fn: () => addOverlay('box') },
    { label: 'Circle', icon: Circle, fn: () => addOverlay('circle') },
    { label: 'Line', icon: Minus, fn: () => addOverlay('line') },
    { label: 'Arrow', icon: ArrowRight, fn: () => addOverlay('arrow') },
    { label: 'Blur', icon: Droplets, fn: () => addOverlay('blur') },
  ]

  return (
    <ToolLayout fullWidth hideDescription title="Video Editor" description="Trim, split and join clips, stack layers, add boxes, text and blur — then export. Offline, bundled FFmpeg.">
      <div className="editor-tips" style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1, minHeight: 0, position: 'relative', userSelect: 'none', WebkitUserSelect: 'none' }}>

        {dragOver && (
          <div style={{ position: 'absolute', inset: 0, zIndex: 2000, borderRadius: 12, border: '2px dashed var(--accent)', background: 'color-mix(in srgb, var(--accent) 12%, transparent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, color: 'var(--accent)', pointerEvents: 'none' }}>
            Drop videos or images to add
          </div>
        )}

        {/* top bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button aria-label="Undo (⌘Z)" onClick={undo} disabled={!undoStack.length} style={iconBtn}><Undo2 size={18} /></button>
          <button aria-label="Redo (⌘⇧Z)" onClick={redo} disabled={!redoStack.length} style={iconBtn}><Redo2 size={18} /></button>
          <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-muted)' }}>{items.length}/{MAX_LAYERS} layers · {proj.w}×{proj.h}</span>
          <button className="btn-primary" onClick={exportVideo} disabled={busy || items.length === 0} style={{ padding: '8px 20px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Upload size={16} /> {busy ? 'Rendering…' : 'Export'}
          </button>
        </div>

        {/* middle: media bin (left) + preview (center) + properties (right) */}
        <div style={{ display: 'flex', gap: 4, flex: 1, minHeight: 0 }}>

          {/* media bin */}
          <div ref={mediaPanelRef} className="panel" style={{ width: mediaW, flexShrink: 0, padding: 12, display: 'flex', flexDirection: 'column', gap: 10, minHeight: 0 }}>
            <div style={sectionLabel}>Media</div>
            <button onClick={importMedia} disabled={items.length >= MAX_LAYERS} aria-label="Import video or images (or drop anywhere)" style={importZone}>
              <Upload size={15} />
              <span style={{ fontWeight: 700, fontSize: 12 }}>Import</span>
            </button>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, overflowY: 'auto', overflowX: 'hidden', minHeight: 0, flex: 1 }}>
              {media.map(a => (
                <button key={a.id} onClick={() => addFromMedia(a)} disabled={items.length >= MAX_LAYERS} aria-label={`Add ${a.name}`} style={mediaCard}>
                  <div style={{ width: '100%', aspectRatio: '16 / 9', borderRadius: 4, background: a.thumb ? `#000 url(${a.thumb}) center/cover` : '#222' }} />
                  <span style={{ fontSize: 10.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%' }}>{a.name}</span>
                </button>
              ))}
              {media.length === 0 && <span style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', marginTop: 6, lineHeight: 1.5 }}>Imported clips &amp; images show here</span>}
            </div>
          </div>

          <div className="pane-grip" title="Drag to resize" onPointerDown={e => startPaneDrag(e, mediaW, setMediaW, 'x', 1, 120, 380)} style={gripX}><div style={gripBarX} /></div>

          {/* preview + transport */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0 }}>
            <div ref={previewBoxRef} style={{ flex: 1, minHeight: 0, background: '#0b0b0d', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', padding: 12 }}>
              <div
                ref={stageRef}
                onPointerDown={() => setSelId(null)}
                style={{ position: 'relative', width: fitW, height: fitH, background: '#000', boxShadow: '0 0 0 1px rgba(255,255,255,0.08)', userSelect: 'none' }}
              >
                {items.map(it => {
                  // detached audio has no visual — mount a muted-by-default <audio>
                  // that syncVideos drives (kept in the same el map as videos)
                  if (it.kind === 'audio') return <audio key={it.id} ref={el => { if (el) videoEls.current.set(it.id, el); else videoEls.current.delete(it.id) }} src={it.url} style={{ display: 'none' }} />
                  const on = time >= it.tStart && time < it.tEnd
                  const selected = selId === it.id
                  const style: React.CSSProperties = { position: 'absolute', left: `${it.x * 100}%`, top: `${it.y * 100}%`, width: `${it.w * 100}%`, height: `${it.h * 100}%`, display: on ? 'block' : 'none', cursor: 'move', boxSizing: 'border-box', zIndex: selected ? 999 : it.track, opacity: it.kind === 'blur' ? 1 : it.opacity }
                  const chrome = selected && (
                    <>
                      <div style={{ position: 'absolute', inset: 0, outline: '1.5px solid var(--accent)', pointerEvents: 'none' }} />
                      {HANDLES.map(hd => (
                        <div key={hd.dir} onPointerDown={e => startResize(e, it, hd.dir)} style={{ position: 'absolute', width: 10, height: 10, background: '#fff', border: '1.5px solid var(--accent)', borderRadius: 2, cursor: hd.cur, ...hd.pos }} />
                      ))}
                    </>
                  )
                  const common = { 'data-layer': it.id, ref: (el: HTMLDivElement | null) => { if (el) layerEls.current.set(it.id, el); else layerEls.current.delete(it.id) }, onPointerDown: (e: React.PointerEvent) => startLayerDrag(e, it) }
                  if (it.kind === 'video') return <div key={it.id} {...common} style={style}><video ref={el => { if (el) videoEls.current.set(it.id, el); else videoEls.current.delete(it.id) }} src={it.url} muted playsInline style={{ width: '100%', height: '100%', objectFit: 'fill', pointerEvents: 'none' }} />{chrome}</div>
                  if (it.kind === 'image') return <div key={it.id} {...common} style={style}><img src={it.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'fill', pointerEvents: 'none' }} />{chrome}</div>
                  if (SHAPES.includes(it.kind)) return <div key={it.id} {...common} style={style}><div style={{ width: '100%', height: '100%', pointerEvents: 'none' }} dangerouslySetInnerHTML={{ __html: shapeSvg(it.kind, it.color || '#ff3b30') }} />{chrome}</div>
                  if (it.kind === 'box') return <div key={it.id} {...common} style={{ ...style, background: it.color }}>{chrome}</div>
                  if (it.kind === 'blur') return <div key={it.id} {...common} style={{ ...style, backdropFilter: `blur(${(it.strength || 12) * scale}px)`, WebkitBackdropFilter: `blur(${(it.strength || 12) * scale}px)` }}>{chrome}</div>
                  return <div key={it.id} {...common} style={{ ...style, color: it.color, fontSize: (it.size || 32) * scale, fontFamily: 'Helvetica, Arial, sans-serif', lineHeight: 1.1, overflow: 'hidden', whiteSpace: 'pre-wrap' }}>{it.text}{chrome}</div>
                })}
                {items.length === 0 && (
                  <div style={{ position: 'absolute', inset: 16, display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center', justifyContent: 'center', color: '#6b6b6b', fontSize: 14, border: '2px dashed #333', borderRadius: 10 }}>
                    <Upload size={26} />
                    <div>Drag &amp; drop videos or images here</div>
                    <div style={{ fontSize: 12, opacity: 0.7 }}>or import on the left</div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="pane-grip" title="Drag to resize" onPointerDown={e => startPaneDrag(e, propsW, setPropsW, 'x', -1, 180, 480)} style={gripX}><div style={gripBarX} /></div>

          {/* properties (right) */}
          <div className="panel" style={{ width: propsW, flexShrink: 0, padding: 14, overflowY: 'auto' }}>
            {!sel ? (
              <div style={{ color: 'var(--text-muted)', fontSize: 12.5, lineHeight: 1.7 }}>
                <div style={sectionLabel}>Properties</div>
                Select a layer to edit it. Import media on the left, add elements from the bottom bar. Drag in the preview to move, grab a handle to resize, drag on the timeline to trim or change lane.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 13 }}>
                <div style={{ fontWeight: 700, color: KIND_COLOR[sel.kind], display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                  <span style={{ width: 9, height: 9, borderRadius: 2, background: KIND_COLOR[sel.kind], flexShrink: 0 }} />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0 }}>{KIND_LABEL[sel.kind]}{sel.name && sel.kind !== 'text' ? ` · ${sel.name}` : ''}</span>
                  <button style={{ ...iconBtn, width: 26, height: 26, flexShrink: 0 }} aria-label="Bring forward" onClick={() => moveLayer(sel.id, 1)}><ChevronUp size={15} /></button>
                  <button style={{ ...iconBtn, width: 26, height: 26, flexShrink: 0 }} aria-label="Send back" onClick={() => moveLayer(sel.id, -1)}><ChevronDown size={15} /></button>
                </div>

                {sel.kind === 'text' && (
                  <label style={fieldLabel}>Text
                    <textarea value={sel.text} onFocus={snapshot} onChange={e => patch(sel.id, { text: e.target.value })} rows={2} className="tool-input" style={{ width: '100%', resize: 'vertical' }} />
                  </label>
                )}
                {sel.kind === 'text' && (
                  <label style={fieldLabel}>Size: {sel.size}px
                    <input type="range" min={12} max={Math.round(proj.h * 0.4)} value={sel.size} onPointerDown={snapshot} onChange={e => patch(sel.id, { size: Number(e.target.value) })} style={rangeStyle} />
                  </label>
                )}
                {(sel.kind === 'text' || sel.kind === 'box' || SHAPES.includes(sel.kind)) && (
                  <label style={{ ...fieldLabel, flexDirection: 'row', alignItems: 'center', gap: 8 }}>Color
                    <input type="color" value={sel.color} onFocus={snapshot} onChange={e => patch(sel.id, { color: e.target.value })} style={{ width: 40, height: 26, padding: 0, border: 'none', background: 'none' }} />
                  </label>
                )}
                {sel.kind === 'blur' && (
                  <label style={fieldLabel}>Strength: {sel.strength}
                    <input type="range" min={1} max={50} value={sel.strength} onPointerDown={snapshot} onChange={e => patch(sel.id, { strength: Number(e.target.value) })} style={rangeStyle} />
                  </label>
                )}
                {sel.kind !== 'blur' && sel.kind !== 'audio' && (
                  <label style={fieldLabel}>Opacity: {Math.round(sel.opacity * 100)}%
                    <input type="range" min={0} max={100} value={Math.round(sel.opacity * 100)} onPointerDown={snapshot} onChange={e => patch(sel.id, { opacity: Number(e.target.value) / 100 })} style={rangeStyle} />
                  </label>
                )}
                {(sel.kind === 'video' || sel.kind === 'audio') && (
                  <label style={fieldLabel}>Volume: {Math.round((sel.volume ?? 1) * 100)}%
                    <input type="range" min={0} max={200} value={Math.round((sel.volume ?? 1) * 100)} onPointerDown={snapshot} onChange={e => patch(sel.id, { volume: Number(e.target.value) / 100 })} style={rangeStyle} />
                  </label>
                )}
                {sel.kind === 'video' && (
                  <>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input type="checkbox" checked={!sel.mute} onChange={e => { snapshot(); patch(sel.id, { mute: !e.target.checked }) }} /> Keep audio
                    </label>
                    {(() => { const done = items.some(i => i.kind === 'audio' && i.srcId === sel.id); return (
                    <button onClick={() => detachAudio(sel)} disabled={done || items.length >= MAX_LAYERS} style={{ ...iconBtn, width: 'auto', padding: '0 12px', gap: 6 }}>
                      <AudioLines size={15} /> {done ? 'Audio detached' : 'Detach audio'}
                    </button>
                    ) })()}
                  </>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <label style={fieldLabel}>Start (s)
                    <input type="number" step={0.1} min={0} value={sel.tStart.toFixed(2)} onFocus={snapshot} onChange={e => patch(sel.id, { tStart: clampN(Number(e.target.value) || 0, 0, sel.tEnd - 0.1) })} className="tool-input" style={{ width: '100%' }} />
                  </label>
                  <label style={fieldLabel}>End (s)
                    <input type="number" step={0.1} min={0} value={sel.tEnd.toFixed(2)} onFocus={snapshot} onChange={e => patch(sel.id, { tEnd: Math.max(sel.tStart + 0.1, Number(e.target.value) || 0) })} className="tool-input" style={{ width: '100%' }} />
                  </label>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="pane-grip" title="Drag to resize" onPointerDown={e => startPaneDrag(e, timelineH, setTimelineH, 'y', -1, 120, 460)} style={gripY}><div style={gripBarY} /></div>

        {/* timeline */}
        <div className="panel" style={{ padding: 0, flexShrink: 0, height: timelineH, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
            {/* left: edit + add-element tools */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 0, overflowX: 'auto' }}>
              <button style={iconBtn} aria-label="Split at playhead" onClick={splitAtPlayhead} disabled={!sel || sel.kind !== 'video'}><Scissors size={16} /></button>
              <button style={iconBtn} aria-label="Duplicate" onClick={duplicateSel} disabled={!sel}><Copy size={16} /></button>
              <button style={iconBtn} aria-label="Delete" onClick={removeSel} disabled={!sel}><Trash2 size={16} /></button>
              <span style={{ width: 1, height: 22, background: 'var(--border)', margin: '0 4px', flexShrink: 0 }} />
              {ELEMENTS.map(el => (
                <button key={el.label} onClick={el.fn} disabled={items.length >= MAX_LAYERS} aria-label={`Add ${el.label}`} style={iconBtn}>
                  <el.icon size={16} />
                </button>
              ))}
            </div>
            {/* center: transport */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
              <button style={iconBtn} aria-label="Start" onClick={() => seek(0)}><SkipBack size={16} /></button>
              <button style={iconBtn} aria-label="Previous frame (←)" onClick={() => stepFrame(-1)}><ChevronLeft size={18} /></button>
              <button className="btn-primary" onClick={() => setPlaying(p => !p)} aria-label={playing ? 'Pause (space)' : 'Play (space)'} style={{ width: 40, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>{playing ? <Pause size={17} /> : <Play size={17} />}</button>
              <button style={iconBtn} aria-label="Next frame (→)" onClick={() => stepFrame(1)}><ChevronRight size={18} /></button>
              <button style={iconBtn} aria-label="End" onClick={() => seek(duration)}><SkipForward size={16} /></button>
              <span ref={timeReadRef} style={{ fontSize: 12.5, color: 'var(--text-dim)', fontVariantNumeric: 'tabular-nums', minWidth: 120, textAlign: 'center' }}>{fmtTime(time)} / {fmtTime(duration)}</span>
            </div>
            {/* right: zoom */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, flex: 1, justifyContent: 'flex-end' }}>
              <button style={iconBtn} aria-label="Zoom out" onClick={() => zoom(1 / 1.3)}><ZoomOut size={17} /></button>
              <button style={iconBtn} aria-label="Zoom in" onClick={() => zoom(1.3)}><ZoomIn size={17} /></button>
              <button style={iconBtn} aria-label="Fit" onClick={zoomFit}><Maximize2 size={16} /></button>
            </div>
          </div>
          <div ref={tlRef} style={{ overflow: 'auto', flex: 1, minHeight: 0 }}>
            <div style={{ position: 'relative', width: tlWidth, minWidth: '100%', minHeight: '100%', display: 'flex', flexDirection: 'column' }}>
              <div onPointerDown={startScrub} style={{ height: 22, flexShrink: 0, borderBottom: '1px solid var(--border)', position: 'relative', cursor: 'pointer', background: 'var(--surface2)' }}>
                {Array.from({ length: Math.floor(duration / tickStep) + 1 }).map((_, n) => {
                  const s = n * tickStep
                  return <div key={n} style={{ position: 'absolute', left: s * pps, top: 0, height: '100%', borderLeft: '1px solid var(--border)', paddingLeft: 4, fontSize: 10, color: 'var(--text-muted)', lineHeight: '22px' }}>{s}s</div>
                })}
              </div>
              {/* center the track rows vertically — empty space above/below when the pane is tall */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: 0 }}>
              <div ref={tracksAreaRef} style={{ position: 'relative', padding: '6px 0' }}>
                <div ref={newLaneRef} style={{ display: 'none', position: 'absolute', left: 0, right: 0, height: 34, borderRadius: 6, background: 'color-mix(in srgb, var(--accent) 22%, transparent)', outline: '2px dashed var(--accent)', outlineOffset: -1, pointerEvents: 'none', zIndex: 4 }} />
                {Array.from({ length: laneCount }).map((_, ri) => {
                  const t = laneCount - 1 - ri   // top row = highest track
                  return (
                    <div key={t} data-lane={t} style={{ height: 34, position: 'relative', margin: '3px 0', borderRadius: 6, background: 'var(--surface2)', outline: 'none', outlineOffset: -1 }}>
                      {items.filter(i => i.track === t).map(it => {
                        const selected = selId === it.id
                        return (
                          <div key={it.id} data-block={it.id} onPointerDown={e => startBlockDrag(e, it, 'move')} style={{
                            position: 'absolute', left: it.tStart * pps, width: Math.max(8, (it.tEnd - it.tStart) * pps), top: 0, height: '100%',
                            borderRadius: 6, overflow: 'hidden', cursor: 'grab', boxSizing: 'border-box',
                            background: it.strip ? `#000 url(${it.strip}) left center / auto 100% repeat-x`
                              : it.thumb ? `#000 url(${it.thumb}) center/cover` : KIND_COLOR[it.kind],
                            boxShadow: `inset 4px 0 0 ${KIND_COLOR[it.kind]}`,
                            outline: selected ? '2.5px solid var(--accent)' : 'none', outlineOffset: 1,
                            opacity: selId && !selected ? 0.55 : 1,
                            zIndex: selected ? 3 : 1,
                          }}>
                            <span style={{ position: 'absolute', left: 8, top: 4, fontSize: 10.5, fontWeight: 600, color: '#fff', textShadow: '0 1px 2px rgba(0,0,0,0.8)', pointerEvents: 'none', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 4 }}>{it.kind === 'audio' && <AudioLines size={11} />}{KIND_LABEL[it.kind]}</span>
                            <div onPointerDown={e => startBlockDrag(e, it, 'l')} style={{ position: 'absolute', left: 0, top: 0, width: 8, height: '100%', cursor: 'ew-resize' }} />
                            <div onPointerDown={e => startBlockDrag(e, it, 'r')} style={{ position: 'absolute', right: 0, top: 0, width: 8, height: '100%', cursor: 'ew-resize' }} />
                          </div>
                        )
                      })}
                    </div>
                  )
                })}
              </div>
              </div>
              {/* playhead — left owned imperatively; children hang off it */}
              <div ref={phRef} style={{ position: 'absolute', top: 0, bottom: 0, width: 0, zIndex: 6, pointerEvents: 'none' }}>
                <div style={{ position: 'absolute', top: 0, bottom: 0, left: -1, width: 2, background: 'var(--accent)' }} />
                <div onPointerDown={startPlayheadDrag} aria-label="Scrub" style={{ position: 'absolute', top: 0, left: -7, width: 14, height: 12, background: 'var(--accent)', cursor: 'ew-resize', pointerEvents: 'auto', clipPath: 'polygon(0 0, 100% 0, 100% 60%, 50% 100%, 0 60%)' }} />
                {scrubbing && (
                  <div ref={scrubBubbleRef} style={{ position: 'absolute', top: -19, left: 0, transform: 'translateX(-50%)', background: 'var(--accent)', color: '#fff', fontSize: 10, fontWeight: 700, padding: '1px 5px', borderRadius: 4, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{fmtTime(time)}</div>
                )}
              </div>
            </div>
          </div>
        </div>

        {result && !result.ok && (
          <div className="panel" style={{ padding: 14, fontSize: 13, flexShrink: 0, display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <div style={{ color: '#ef4444', flex: 1, minWidth: 0 }}><b>Export failed.</b><pre style={{ whiteSpace: 'pre-wrap', marginTop: 8, fontSize: 11, color: 'var(--text-dim)', maxHeight: 120, overflow: 'auto' }}>{result.log}</pre></div>
            <button style={{ ...iconBtn, width: 26, height: 26, flexShrink: 0 }} aria-label="Dismiss" onClick={() => setResult(null)}><Minus size={15} /></button>
          </div>
        )}
      </div>
    </ToolLayout>
  )
}

const iconBtn: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'center', width: 34, height: 34,
  borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)',
  color: 'var(--text-dim)', cursor: 'pointer',
}
const importZone: React.CSSProperties = {
  display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
  padding: '8px 10px', borderRadius: 8, border: '2px dashed var(--border)', background: 'var(--surface)',
  color: 'var(--text-dim)', cursor: 'pointer',
  width: '100%', minWidth: 0, maxWidth: '100%', boxSizing: 'border-box', flexShrink: 0,
}
const mediaCard: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 3, padding: 5,
  borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface)',
  color: 'var(--text-dim)', cursor: 'pointer', width: '100%',
}
const gripX: React.CSSProperties = { width: 12, flexShrink: 0, cursor: 'col-resize', display: 'flex', alignItems: 'center', justifyContent: 'center', alignSelf: 'stretch' }
const gripY: React.CSSProperties = { height: 12, flexShrink: 0, cursor: 'row-resize', display: 'flex', alignItems: 'center', justifyContent: 'center' }
const gripBarX: React.CSSProperties = { width: 4, height: '34%', maxHeight: 48, borderRadius: 3, background: 'var(--text-muted)' }
const gripBarY: React.CSSProperties = { height: 4, width: 64, borderRadius: 3, background: 'var(--text-muted)' }
const sectionLabel: React.CSSProperties = { fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--text-muted)', marginBottom: 8 }
const fieldLabel: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, color: 'var(--text-dim)' }
const rangeStyle: React.CSSProperties = { width: '100%', accentColor: 'var(--accent)' }
