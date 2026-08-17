import { Component, type ReactNode } from 'react'

/**
 * Stops one tool's crash from taking down the whole app. Without this, a thrown
 * render error unmounts everything and leaves a blank window — worse in the
 * desktop app, where there's no address bar to reload from. Keyed by route, so
 * navigating away clears the error and the next tool renders normally.
 */
export default class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state: { error: Error | null } = { error: null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  componentDidCatch(error: Error) {
    console.error('Tool crashed:', error)
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children
    return (
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: 14, padding: 40, textAlign: 'center', fontFamily: 'var(--font-sans)', color: 'var(--sketch-text)',
      }}>
        <div style={{ fontSize: 34 }}>💥</div>
        <div style={{ fontSize: 17, fontWeight: 700, fontFamily: "'Architects Daughter', var(--font-sans)" }}>
          This tool hit an error
        </div>
        <p style={{ fontSize: 13.5, opacity: 0.75, maxWidth: 460, lineHeight: 1.6, margin: 0 }}>
          The rest of the app is fine — go back and pick another tool, or try again.
        </p>
        <pre style={{
          fontSize: 11.5, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', background: 'var(--surface2)',
          padding: '10px 14px', borderRadius: 8, maxWidth: 560, overflow: 'auto', textAlign: 'left', margin: 0,
        }}>{error.message}</pre>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-primary btn-sm" onClick={() => this.setState({ error: null })}>Try again</button>
          <button className="btn btn-ghost btn-sm" onClick={() => { window.location.hash = ''; window.location.pathname = '/' }}>
            Back to tools
          </button>
        </div>
      </div>
    )
  }
}
