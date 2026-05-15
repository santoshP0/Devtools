import { useEffect, useRef } from 'react'

interface Props {
  bgStyle?: 'particles' | 'grid' | 'none'
}

export default function HeroCanvas({ bgStyle = 'particles' }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animRef = useRef<number>(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resize = () => {
      const dpr = window.devicePixelRatio || 1
      canvas.width  = canvas.offsetWidth  * dpr
      canvas.height = canvas.offsetHeight * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    window.addEventListener('resize', resize)

    const W = () => canvas.offsetWidth
    const H = () => canvas.offsetHeight

    interface Particle { x: number; y: number; vx: number; vy: number; r: number }
    const particles: Particle[] = Array.from({ length: 90 }, () => ({
      x:  Math.random() * W(),
      y:  Math.random() * H(),
      vx: (Math.random() - 0.5) * 0.25,
      vy: (Math.random() - 0.5) * 0.25,
      r:  Math.random() * 1.4 + 0.5,
    }))

    const frame = () => {
      ctx.clearRect(0, 0, W(), H())

      if (bgStyle !== 'none') {
        particles.forEach(p => {
          p.x += p.vx; p.y += p.vy
          if (p.x < 0 || p.x > W()) p.vx *= -1
          if (p.y < 0 || p.y > H()) p.vy *= -1
          ctx.beginPath()
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
          const isDark = document.documentElement.dataset.theme === 'dark'
          ctx.fillStyle = isDark ? 'oklch(0.78 0.18 195 / 0.45)' : 'oklch(0.52 0.18 195 / 0.55)'
          ctx.fill()
        })

        // connecting lines
        particles.forEach((a, i) => {
          for (let j = i + 1; j < particles.length; j++) {
            const b = particles[j]
            const d = Math.hypot(a.x - b.x, a.y - b.y)
            if (d < 110) {
              ctx.beginPath()
              ctx.moveTo(a.x, a.y)
              ctx.lineTo(b.x, b.y)
              const isDark2 = document.documentElement.dataset.theme === 'dark'
              const alpha = (isDark2 ? 0.12 : 0.18) * (1 - d / 110)
              ctx.strokeStyle = isDark2 ? `rgba(99,205,255,${alpha})` : `rgba(0,140,180,${alpha})`
              ctx.lineWidth = 0.6
              ctx.stroke()
            }
          }
        })

        if (bgStyle === 'grid') {
          ctx.strokeStyle = 'rgba(99,205,255,0.04)'
          ctx.lineWidth = 1
          for (let x = 0; x < W(); x += 48) {
            ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H()); ctx.stroke()
          }
          for (let y = 0; y < H(); y += 48) {
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W(), y); ctx.stroke()
          }
        }
      }

      animRef.current = requestAnimationFrame(frame)
    }

    frame()
    return () => {
      window.removeEventListener('resize', resize)
      cancelAnimationFrame(animRef.current)
    }
  }, [bgStyle])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute', inset: 0,
        width: '100%', height: '100%',
        pointerEvents: 'none',
      }}
    />
  )
}
