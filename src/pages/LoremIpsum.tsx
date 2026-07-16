import { useState } from 'react'
import ToolLayout from '../components/ToolLayout'
import { useClipboardCopy } from '../hooks/useClipboardCopy'

const WORDS = 'lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua ut enim ad minim veniam quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur excepteur sint occaecat cupidatat non proident sunt in culpa qui officia deserunt mollit anim id est laborum'.split(' ')

function rand(max: number) { return Math.floor(Math.random() * max) }

function sentence(minW = 6, maxW = 14): string {
  const len = minW + rand(maxW - minW)
  const words = Array.from({ length: len }, () => WORDS[rand(WORDS.length)])
  return words[0][0].toUpperCase() + words[0].slice(1) + ' ' + words.slice(1).join(' ') + '.'
}

function paragraph(minS = 3, maxS = 6): string {
  const count = minS + rand(maxS - minS)
  return Array.from({ length: count }, () => sentence()).join(' ')
}

type Mode = 'paragraphs' | 'sentences' | 'words'

export default function LoremIpsum() {
  const [mode, setMode] = useState<Mode>('paragraphs')
  const [count, setCount] = useState(3)
  const [output, setOutput] = useState('')
  const { copied, copy } = useClipboardCopy()

  const generate = () => {
    const n = Math.min(50, Math.max(1, count || 3))
    if (mode === 'paragraphs') {
      setOutput(Array.from({ length: n }, () => paragraph()).join('\n\n'))
    } else if (mode === 'sentences') {
      setOutput(Array.from({ length: n }, () => sentence()).join(' '))
    } else {
      setOutput(Array.from({ length: n }, () => WORDS[rand(WORDS.length)]).join(' '))
    }
  }

  return (
    <ToolLayout title="Lorem Ipsum Generator" description="Generate placeholder lorem ipsum text.">
      <div className="flex flex-col gap-4 flex-1">
        <div className="tool-panel flex flex-wrap gap-4 items-end">
          <div>
            <label className="label">Type</label>
            <div className="flex gap-2">
              {(['paragraphs', 'sentences', 'words'] as Mode[]).map(m => (
                <button key={m} onClick={() => setMode(m)} className={mode === m ? 'btn-toggle btn-toggle-active' : 'btn-toggle'}>
                  {m.charAt(0).toUpperCase() + m.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="label">Count</label>
            <input
              type="number"
              value={Number.isNaN(count) ? '' : count}
              onChange={e => setCount(e.target.valueAsNumber)}
              onBlur={() => setCount(c => Math.max(1, Math.min(50, c || 3)))}
              min={1} max={50}
              className="tool-input w-24"
            />
          </div>
          <button onClick={generate} className="btn-primary">Generate</button>
        </div>

        <div className="flex flex-col flex-1">
          <div className="flex justify-between items-center mb-1.5">
            <label className="label mb-0">Output</label>
            {output && <button onClick={() => copy(output)} className="copy-btn">{copied ? '✓ Copied' : 'Copy'}</button>}
          </div>
          <textarea
            value={output}
            readOnly
            placeholder="Click Generate to create lorem ipsum text…"
            className="tool-textarea flex-1 bg-slate-50"
          />
        </div>
      </div>
    </ToolLayout>
  )
}
