import { useState, useEffect } from 'react'
import ToolLayout from '../components/ToolLayout'
import { marked } from 'marked'
import DOMPurify from 'dompurify'

const SAMPLE = `# Hello, Markdown!

**Bold text**, *italic*, ~~strikethrough~~, and \`inline code\`.

## Code Block
\`\`\`js
const greet = name => \`Hello, \${name}!\`
\`\`\`

## List
- Item one
- Item two
  - Nested item

## Table
| Tool | Category |
|------|----------|
| JSON Formatter | Data |
| QR Generator | Generator |

> This is a blockquote.

[DevToolbox](https://devtoolbox.example.com)
`

export default function MarkdownPreview() {
  const [markdown, setMarkdown] = useState(SAMPLE)
  const [sanitizedHtml, setSanitizedHtml] = useState('')
  const [view, setView] = useState<'split' | 'editor' | 'preview'>('split')

  useEffect(() => {
    // marked output is sanitized via DOMPurify before rendering
    const raw = marked(markdown) as string
    setSanitizedHtml(DOMPurify.sanitize(raw))
  }, [markdown])

  const copyHtml = () => navigator.clipboard.writeText(sanitizedHtml)
  const copyMd = () => navigator.clipboard.writeText(markdown)

  const editorPanel = (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex justify-between items-center mb-1.5">
        <label className="label mb-0">Markdown</label>
        <button onClick={copyMd} className="copy-btn">Copy MD</button>
      </div>
      <textarea
        value={markdown}
        onChange={e => setMarkdown(e.target.value)}
        className="tool-textarea flex-1"
        spellCheck={false}
      />
    </div>
  )

  const previewPanel = (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex justify-between items-center mb-1.5">
        <label className="label mb-0">Preview</label>
        <button onClick={copyHtml} className="copy-btn">Copy HTML</button>
      </div>
      {/* sanitizedHtml is DOMPurify-sanitized before being set */}
      <div
        className="flex-1 bg-white border border-slate-200 rounded-xl p-5 overflow-auto prose prose-sm max-w-none min-h-[320px]"
        dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
      />
    </div>
  )

  return (
    <ToolLayout title="Markdown Preview" description="Live Markdown editor with real-time rendered preview.">
      <div className="flex flex-col gap-4 flex-1">
        <div className="flex gap-2">
          {(['split', 'editor', 'preview'] as const).map(v => (
            <button key={v} onClick={() => setView(v)} className={view === v ? 'btn-toggle btn-toggle-active' : 'btn-toggle'}>
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>

        {view === 'split' ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1">
            {editorPanel}
            {previewPanel}
          </div>
        ) : view === 'editor' ? editorPanel : previewPanel}
      </div>
    </ToolLayout>
  )
}
