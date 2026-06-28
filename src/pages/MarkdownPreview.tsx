import { useState, useEffect, useCallback, useRef } from 'react'
import ToolLayout from '../components/ToolLayout'
import { marked } from 'marked'
import DOMPurify from 'dompurify'

const SAMPLE = `# Hello, Markdown!

Write your **markdown** here and see a live *preview* on the right.

## Features

- **Bold**, *italic*, ~~strikethrough~~, \`inline code\`
- [Links](https://example.com) and > blockquotes
- Tables, task lists, code blocks

## Example

\`\`\`js
console.log("Hello, world!");
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
    // marked output is sanitized via DOMPurify before rendering — XSS-safe
    const raw = marked(markdown) as string
    setSanitizedHtml(DOMPurify.sanitize(raw))
  }, [markdown])

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
    <ToolLayout title="Markdown Preview" description="Live Markdown editor with real-time rendered preview." fullWidth>
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
