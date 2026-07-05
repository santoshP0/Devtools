import { useState } from 'react'
import ToolLayout from '../components/ToolLayout'
import { useClipboardCopy } from '../hooks/useClipboardCopy'

function encodeEntities(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/\//g, '&#x2F;')
}

const NAMED: Record<string, string> = {
  '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"',
  '&apos;': "'", '&nbsp;': '\u00A0', '&copy;': '©', '&reg;': '®',
  '&trade;': '™', '&mdash;': '—', '&ndash;': '–', '&hellip;': '…',
  '&laquo;': '«', '&raquo;': '»', '&euro;': '€', '&pound;': '£',
  '&yen;': '¥', '&cent;': '¢', '&deg;': '°', '&frac12;': '½',
  '&frac14;': '¼', '&frac34;': '¾',
}

function decodeEntities(str: string): string {
  return str
    .replace(/&[a-zA-Z]+;/g, e => NAMED[e] ?? e)
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
}

export default function HtmlEntities() {
  const [input, setInput] = useState('')
  const [output, setOutput] = useState('')
  const [mode, setMode] = useState<'encode' | 'decode'>('encode')
  const { copied, copy } = useClipboardCopy()

  const convert = () => {
    setOutput(mode === 'encode' ? encodeEntities(input) : decodeEntities(input))
  }

  const swap = () => {
    setInput(output)
    setOutput('')
    setMode(m => m === 'encode' ? 'decode' : 'encode')
  }

  return (
    <ToolLayout title="HTML Entity Encoder" description="Encode and decode HTML entities.">
      <div className="flex flex-col gap-4 flex-1">
        <div className="flex gap-2 items-center flex-wrap">
          <div className="flex gap-2">
            <button onClick={() => setMode('encode')} className={mode === 'encode' ? 'btn-toggle btn-toggle-active' : 'btn-toggle'}>Encode</button>
            <button onClick={() => setMode('decode')} className={mode === 'decode' ? 'btn-toggle btn-toggle-active' : 'btn-toggle'}>Decode</button>
          </div>
          <button onClick={convert} className="btn-primary">Convert</button>
          <button onClick={swap} className="btn-secondary">⇄ Swap</button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1">
          <div className="flex flex-col">
            <label className="label">{mode === 'encode' ? 'Plain Text / HTML' : 'HTML Entities'}</label>
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder={mode === 'encode' ? '<div class="hello">World & Co.</div>' : '&lt;div class=&quot;hello&quot;&gt;'}
              className="tool-textarea flex-1"
              spellCheck={false}
            />
          </div>
          <div className="flex flex-col">
            <div className="flex justify-between items-center mb-1.5">
              <label className="label mb-0">{mode === 'encode' ? 'HTML Entities' : 'Plain Text / HTML'}</label>
              {output && <button onClick={() => copy(output)} className="copy-btn">{copied ? '✓ Copied' : 'Copy'}</button>}
            </div>
            <textarea
              value={output}
              readOnly
              className="tool-textarea flex-1 bg-slate-50"
              spellCheck={false}
            />
          </div>
        </div>
      </div>
    </ToolLayout>
  )
}
