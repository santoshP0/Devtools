import { Link } from 'react-router-dom'

export default function Navbar() {
  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
      height: 54,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 32px',
      background: 'oklch(0.10 0.025 250 / 0.92)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      borderBottom: '1px solid var(--border)',
    }}>
      <Link to="/" style={{
        display: 'flex', alignItems: 'center', gap: 10,
        textDecoration: 'none', color: 'var(--text)',
      }}>
        <span style={{
          width: 32, height: 32, borderRadius: 8,
          background: 'linear-gradient(135deg, var(--accent), var(--purple))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 13, fontWeight: 700, color: '#000',
          fontFamily: 'var(--font-mono)', flexShrink: 0,
        }}>DT</span>
        <span style={{ fontSize: 15, fontWeight: 600, fontFamily: 'var(--font-sans)' }}>
          DevToolbox
        </span>
      </Link>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        fontSize: 13, color: 'var(--text-muted)',
        fontFamily: 'var(--font-sans)',
      }}>
        <span style={{
          width: 7, height: 7, borderRadius: '50%',
          background: 'var(--cat-gen)',
          display: 'inline-block',
          animation: 'pulseRing 2s infinite',
        }} />
        <span className="hidden sm:inline">No ads · No tracking · All in your browser</span>
      </div>
    </nav>
  )
}
