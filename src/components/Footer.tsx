export default function Footer() {
  return (
    <footer style={{
      borderTop: '1px solid var(--border)',
      padding: '24px 32px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: 12,
      fontSize: 13,
      color: 'var(--text-muted)',
      fontFamily: 'var(--font-sans)',
    }}>
      <span style={{ fontWeight: 600, color: 'var(--text-dim)' }}>DevToolbox</span>
      <span>All processing happens in your browser — your data never leaves your device.</span>
      <span>Free forever · Your files stay local</span>
    </footer>
  )
}
