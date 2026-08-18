import { useLocalStorage } from '../lib/storage'
import { NATIVE_SHELL } from '../lib/shell'

/**
 * A one-time orientation card. With 69 tools on screen, the features that make
 * the app quick — the command palette, favourites, rearranging — are invisible
 * on a first visit. Shown once, then dismissed for good.
 */
const KEY = 'devtoolbox-seen-tips'

const isMac = typeof navigator !== 'undefined' &&
  /mac/.test(`${navigator.userAgent} ${navigator.platform ?? ''}`.toLowerCase())

export default function FirstRunHint() {
  const [seen, setSeen] = useLocalStorage<boolean>(KEY, false)
  if (seen) return null

  const tips: { icon: string; title: string; body: string }[] = [
    {
      icon: '⌘',
      title: `${isMac ? '⌘' : 'Ctrl'} + K`,
      body: 'Jump to any tool by name. Search understands file types too — type “png” or “md”.',
    },
    { icon: '★', title: 'Star what you use', body: 'Starred tools get their own row at the top, so your everyday few stay in reach.' },
    { icon: '⇄', title: 'Arrange', body: 'Hit arrange in the header to drag tiles into the order you want. Each category remembers its own.' },
    ...(NATIVE_SHELL
      ? [{ icon: '⤓', title: 'Drop files in', body: 'Drag a file from Finder onto a tool — images, CSVs, logs and more open straight away.' }]
      : []),
  ]

  return (
    <div style={{
      position: 'relative',
      background: 'var(--surface)',
      border: '2px solid var(--sketch-text)',
      boxShadow: '4px 4px 0px var(--sketch-text)',
      borderRadius: 6,
      padding: '18px 20px',
      marginBottom: 28,
      fontFamily: "'Architects Daughter', var(--font-sans)",
      color: 'var(--sketch-text)',
    }}>
      <button
        onClick={() => setSeen(true)}
        aria-label="Dismiss tips"
        title="Dismiss"
        style={{
          position: 'absolute', top: 8, right: 10,
          background: 'transparent', border: 'none', cursor: 'pointer',
          fontSize: 20, lineHeight: 1, color: 'var(--sketch-text)', opacity: 0.55, padding: 4,
        }}
      >
        ×
      </button>

      <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 14 }}>a few things worth knowing</div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 16 }}>
        {tips.map(t => (
          <div key={t.title} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <span style={{
              flexShrink: 0, width: 28, height: 28, borderRadius: 6,
              border: '2px solid var(--sketch-text)', background: 'var(--sketch-bg)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14, fontWeight: 700,
            }}>{t.icon}</span>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 2 }}>{t.title}</div>
              <div style={{ fontFamily: 'var(--font-sans)', fontSize: 12.5, opacity: 0.75, lineHeight: 1.5 }}>{t.body}</div>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={() => setSeen(true)}
        style={{
          marginTop: 16, padding: '5px 16px', borderRadius: 4, cursor: 'pointer',
          background: 'var(--sketch-text)', color: 'var(--sketch-bg)',
          border: '2px solid var(--sketch-text)', fontSize: 13, fontWeight: 700,
          fontFamily: "'Architects Daughter', var(--font-sans)",
        }}
      >
        got it
      </button>
    </div>
  )
}
