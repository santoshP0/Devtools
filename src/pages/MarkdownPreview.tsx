import { useState, useEffect, useRef } from 'react'
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
  const [html, setHtml] = useState('')
  const [view, setView] = useState<'split' | 'editor' | 'preview'>('split')
  const previewRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const result = DOMPurify.sanitize(marked(markdown) as string)
    setHtml(result)
  }, [markdown])

  const copyHtml = () => navigator.clipboard.writeText(html)
  const copyMd = () => navigator.clipboard.writeText(markdown)

  const editorPanel = (
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-center mb-1">
        <label className="label">Markdown</label>
        <button onClick={copyMd} className="copy-btn">Copy MD</button>
      </div>
      <textarea
        value={markdown}
        onChange={e => setMarkdown(e.target.value)}
        className="tool-textarea flex-1 min-h-[400px]"
        spellCheck={false}
      />
    </div>
  )

  const previewPanel = (
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-center mb-1">
        <label className="label">Preview</label>
        <button onClick={copyHtml} className="copy-btn">Copy HTML</button>
      </div>
      <div
        ref={previewRef}
        className="flex-1 min-h-[400px] bg-white border border-slate-200 rounded-lg p-4 overflow-auto prose prose-sm max-w-none"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  )

  return (
    <ToolLayout title="Markdown Preview" description="Live Markdown editor with real-time rendered preview.">
      <div className="space-y-3">
        <div className="flex gap-2">
          {(['split', 'editor', 'preview'] as const).map(v => (
            <button key={v} onClick={() => setView(v)} className={view === v ? 'btn-primary' : 'btn-secondary'}>
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>

        {view === 'split' ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {editorPanel}
            {previewPanel}
          </div>
        ) : view === 'editor' ? editorPanel : previewPanel}
      </div>
    </ToolLayout>
  )
}
