import { useState, useEffect, useCallback, useRef } from 'react'
import ToolLayout from '../components/ToolLayout'
import { Marked } from 'marked'
import DOMPurify from 'dompurify'

// Dedicated marked instance with a Mermaid-aware code renderer.
// ```mermaid fenced blocks are turned into placeholder divs that carry the
// raw diagram source; they're rendered to SVG by mermaid after the HTML mounts.
const md = new Marked()
md.use({
  renderer: {
    code(code: string, lang?: string) {
      if ((lang || '').trim().toLowerCase() === 'mermaid') {
        const fallback = code
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
        // Source is preserved in a data attribute (survives sanitization) so it
        // can be re-rendered on theme changes without touching the markdown.
        return `<div class="mermaid-diagram" data-mermaid-src="${encodeURIComponent(code)}"><pre class="mermaid-fallback">${fallback}</pre></div>`
      }
      return false
    },
  },
})

const SAMPLE = `# Hello, Markdown!

Write your **markdown** here and see a live *preview* on the right.

## Features

- **Bold**, *italic*, ~~strikethrough~~, \`inline code\`
- [Links](https://example.com) and > blockquotes
- Tables, task lists, code blocks
- **Mermaid diagrams** in \`\`\`mermaid code blocks

## Example

\`\`\`js
console.log("Hello, world!");
\`\`\`

## Diagram

\`\`\`mermaid
graph TD
  A[Start] --> B{Works?}
  B -->|Yes| C[Ship it]
  B -->|No| D[Fix it]
  D --> B
\`\`\`

> Start typing to replace this sample.
`

export default function MarkdownPreview() {
  const [markdown, setMarkdown] = useState(SAMPLE)
  const [sanitizedHtml, setSanitizedHtml] = useState('')
  const [view, setView] = useState<'split' | 'editor' | 'preview'>('split')
  const [copiedMd, setCopiedMd] = useState(false)
  const [copiedHtml, setCopiedHtml] = useState(false)
  const [fileName, setFileName] = useState<string | null>(null)

  // Draggable split
  const [splitPercent, setSplitPercent] = useState(50)
  const containerRef = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)

  // Mermaid rendering
  const previewRef = useRef<HTMLDivElement>(null)
  const mermaidRef = useRef<typeof import('mermaid').default | null>(null)
  const renderSeq = useRef(0)
  const [themeVersion, setThemeVersion] = useState(0)

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    dragging.current = true
    const onMove = (ev: MouseEvent) => {
      if (!dragging.current || !containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const pct = ((ev.clientX - rect.left) / rect.width) * 100
      setSplitPercent(Math.min(80, Math.max(20, pct)))
    }
    const onUp = () => {
      dragging.current = false
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }, [])

  useEffect(() => {
    // marked output is sanitized via DOMPurify before rendering — XSS-safe.
    // Mermaid source is preserved in data-* attributes (allowed by DOMPurify).
    const raw = md.parse(markdown) as string
    setSanitizedHtml(DOMPurify.sanitize(raw))
  }, [markdown])

  // Re-render Mermaid code blocks into SVG after the HTML mounts, and again
  // whenever the content or theme changes.
  useEffect(() => {
    let cancelled = false
    const seq = ++renderSeq.current

    const run = async () => {
      const container = previewRef.current
      if (!container) return
      const blocks = Array.from(container.querySelectorAll<HTMLElement>('.mermaid-diagram'))
      if (blocks.length === 0) return

      if (!mermaidRef.current) {
        const mod = await import('mermaid')
        mermaidRef.current = mod.default
      }
      if (cancelled || seq !== renderSeq.current) return

      const mermaid = mermaidRef.current
      const dark = document.documentElement.dataset.theme === 'dark'
      // securityLevel 'strict' makes mermaid sanitize its own SVG output.
      mermaid.initialize({ startOnLoad: false, theme: dark ? 'dark' : 'default', securityLevel: 'strict' })

      for (let i = 0; i < blocks.length; i++) {
        const el = blocks[i]
        const src = decodeURIComponent(el.getAttribute('data-mermaid-src') || '')
        const id = `mermaid-${seq}-${i}`
        try {
          const { svg } = await mermaid.render(id, src)
          if (cancelled || seq !== renderSeq.current) return
          el.innerHTML = svg
          el.classList.add('mermaid-rendered')
        } catch (err) {
          if (cancelled || seq !== renderSeq.current) return
          // Mermaid can leave an orphan measurement node behind on failure.
          document.getElementById(`d${id}`)?.remove()
          const msg = String((err as Error)?.message || err).replace(/</g, '&lt;')
          el.innerHTML = `<div class="mermaid-error">Diagram error: ${msg}</div>`
          el.classList.remove('mermaid-rendered')
        }
      }
    }

    run()
    return () => { cancelled = true }
  }, [sanitizedHtml, themeVersion, view])

  // Re-render diagrams when the app theme is toggled.
  useEffect(() => {
    const observer = new MutationObserver(() => setThemeVersion(v => v + 1))
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => observer.disconnect()
  }, [])

  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback((file: File) => {
    if (!file.name.match(/\.(md|markdown|mdx|txt)$/i)) return
    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result
      if (typeof text === 'string') setMarkdown(text)
    }
    reader.readAsText(file)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [handleFile])

  const copyMd = () => {
    navigator.clipboard.writeText(markdown)
    setCopiedMd(true)
    setTimeout(() => setCopiedMd(false), 2000)
  }
  const copyHtml = () => {
    navigator.clipboard.writeText(sanitizedHtml)
    setCopiedHtml(true)
    setTimeout(() => setCopiedHtml(false), 2000)
  }

  const editorPanel = (
    <div style={{ display: 'flex', flexDirection: 'column', flex: view === 'split' ? 'none' : 1, minHeight: 0, width: view === 'split' ? `${splitPercent}%` : undefined }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <label className="label" style={{ margin: 0 }}>Markdown</label>
          {fileName && (
            <span style={{ fontSize: 10, color: 'var(--text-muted)', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 4, padding: '2px 8px' }}>
              {fileName}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={() => fileInputRef.current?.click()} className="copy-btn">Open File</button>
          <button onClick={copyMd} className="copy-btn">{copiedMd ? '✓ Copied' : 'Copy MD'}</button>
        </div>
      </div>
      <textarea
        value={markdown}
        onChange={e => { setMarkdown(e.target.value); setFileName(null) }}
        onDrop={handleDrop}
        onDragOver={e => e.preventDefault()}
        className="tool-textarea"
        style={{ flex: 1, minHeight: 0, resize: 'none', fontFamily: 'var(--font-mono)', fontSize: 13, lineHeight: 1.7 }}
        spellCheck={false}
        placeholder="Type markdown or drop a .md file here…"
      />
      <input
        ref={fileInputRef}
        type="file"
        accept=".md,.markdown,.mdx,.txt"
        style={{ display: 'none' }}
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = '' }}
      />
    </div>
  )

  const previewPanel = (
    <div style={{ display: 'flex', flexDirection: 'column', flex: view === 'split' ? 1 : 1, minHeight: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexShrink: 0 }}>
        <label className="label" style={{ margin: 0 }}>Preview</label>
        <button onClick={copyHtml} className="copy-btn">{copiedHtml ? '✓ Copied' : 'Copy HTML'}</button>
      </div>
      {/* sanitizedHtml is DOMPurify-sanitized before being set — XSS-safe */}
      <div
        ref={previewRef}
        style={{
          flex: 1, minHeight: 0,
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 10,
          padding: '20px 28px',
          overflowY: 'auto',
          overflowX: 'hidden',
          fontFamily: 'var(--font-sans)',
          fontSize: 14,
          lineHeight: 1.8,
          color: 'var(--text)',
          wordBreak: 'break-word',
          overflowWrap: 'break-word',
        }}
        className="md-preview"
        dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
      />
    </div>
  )

  return (
    <ToolLayout title="Markdown Preview" description="Live Markdown editor with real-time rendered preview and Mermaid diagram support." fullWidth>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, flex: 1, minHeight: 0, overflow: 'hidden' }}>
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          {(['split', 'editor', 'preview'] as const).map(v => (
            <button key={v} onClick={() => setView(v)} className={view === v ? 'btn-toggle btn-toggle-active' : 'btn-toggle'}>
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>

        {view === 'split' ? (
          <div ref={containerRef} style={{ display: 'flex', gap: 0, flex: 1, minHeight: 0 }}>
            {editorPanel}
            {/* Drag handle */}
            <div
              onMouseDown={onMouseDown}
              style={{
                width: 8, cursor: 'col-resize', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                position: 'relative', zIndex: 2,
              }}
            >
              <div style={{
                width: 3, height: 40, borderRadius: 2,
                background: 'var(--border)',
                transition: 'background 0.15s',
              }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--accent, #7eb8c9)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'var(--border)')}
              />
            </div>
            {previewPanel}
          </div>
        ) : view === 'editor' ? editorPanel : previewPanel}
      </div>
    </ToolLayout>
  )
}
