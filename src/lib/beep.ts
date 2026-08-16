// A short triple beep via Web Audio — volume is adjustable (0..1). Works in the
// browser and the desktop webview; no asset files. Best-effort: any failure
// (autoplay policy, no AudioContext) is swallowed.
export function playBeep(volume = 0.6) {
  if (volume <= 0) return
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    const ctx = new Ctx()
    const now = ctx.currentTime
    const gain = Math.max(0, Math.min(1, volume))
    for (const at of [0, 0.28, 0.56]) {
      const osc = ctx.createOscillator()
      const g = ctx.createGain()
      osc.type = 'square'
      osc.frequency.value = 880
      g.gain.setValueAtTime(0, now + at)
      g.gain.linearRampToValueAtTime(gain, now + at + 0.02)
      g.gain.linearRampToValueAtTime(0, now + at + 0.22)
      osc.connect(g); g.connect(ctx.destination)
      osc.start(now + at); osc.stop(now + at + 0.24)
    }
    setTimeout(() => ctx.close().catch(() => {}), 1000)
  } catch { /* no audio available */ }
}
