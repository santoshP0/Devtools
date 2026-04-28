import { useState } from 'react'
import ToolLayout from '../components/ToolLayout'

export default function JsSandbox() {
  const [code, setCode] = useState('// Quick scratchpad for JS\nconst list = [1, 2, 3];\nconst squared = list.map(x => x * x);\nconsole.log("Input:", list);\nconsole.log("Result:", squared);')
  const [logs, setLogs] = useState<string[]>([])
  const [error, setError] = useState('')

  const runCode = () => {
    setError('')
    const output: string[] = []
    
    // Custom console to capture logs
    const mockConsole = {
      log: (...args: any[]) => output.push(args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' ')),
      error: (...args: any[]) => output.push('❌ ' + args.join(' ')),
      warn: (...args: any[]) => output.push('⚠ ' + args.join(' '))
    }

    try {
      // Use Function constructor for basic sandboxing (not truly secure, but good for a scratchpad)
      const fn = new Function('console', code)
      fn(mockConsole)
      setLogs(output)
    } catch (e: any) {
      setError(e.message)
      setLogs(output)
    }
  }

  return (
    <ToolLayout title="JavaScript Sandbox" description="A lightweight playground to run and test JavaScript snippets in the browser.">
      <div className="two-col">
        <div className="flex flex-col gap-4">
          <div className="flex justify-between items-center mb-1">
            <label className="label">Script Editor</label>
            <button onClick={runCode} className="btn-primary px-6">Run (Ctrl+Enter)</button>
          </div>
          <textarea
            value={code}
            onChange={e => setCode(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) runCode() }}
            className="tool-textarea flex-1 min-h-[500px]"
            spellCheck={false}
          />
        </div>

        <div className="flex flex-col gap-4">
          <label className="label">Console Output</label>
          <div className="tool-panel flex-1 min-h-[500px] bg-black/30 border-slate-800 flex flex-col font-mono text-xs">
            <div className="flex-1 overflow-y-auto p-4 space-y-1 custom-scrollbar">
              {logs.map((log, i) => (
                <div key={i} className="text-slate-300 border-b border-white/5 pb-1">
                  <span className="text-slate-600 mr-2">[{new Date().toLocaleTimeString([], { hour12: false })}]</span>
                  {log}
                </div>
              ))}
              {logs.length === 0 && !error && <div className="text-slate-600 italic">Console is empty...</div>}
              {error && <div className="text-red-400 bg-red-950/20 p-2 rounded border border-red-900/30">Error: {error}</div>}
            </div>
            <div className="p-3 border-t border-white/5 flex justify-between items-center">
              <span className="text-[10px] text-slate-500 uppercase font-bold tracking-tighter">Live Output</span>
              <button onClick={() => setLogs([])} className="text-[10px] text-slate-600 hover:text-slate-400 uppercase font-bold">Clear</button>
            </div>
          </div>
        </div>
      </div>
    </ToolLayout>
  )
}
