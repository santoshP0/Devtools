import { useState } from 'react'
import ToolLayout from '../components/ToolLayout'

function csvToJson(csv: string): string {
  const lines = csv.trim().split('\n')
  if (lines.length < 2) throw new Error('Need at least a header row and one data row')
  const headers = parseRow(lines[0])
  const rows = lines.slice(1).map(line => {
    const vals = parseRow(line)
    const obj: Record<string, string> = {}
    headers.forEach((h, i) => { obj[h] = vals[i] ?? '' })
    return obj
  })
  return JSON.stringify(rows, null, 2)
}

function parseRow(line: string): string[] {
  const result: string[] = []
  let cur = '', inQuote = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuote && line[i + 1] === '"') { cur += '"'; i++ }
      else inQuote = !inQuote
    } else if (ch === ',' && !inQuote) {
      result.push(cur.trim()); cur = ''
    } else {
      cur += ch
    }
  }
  result.push(cur.trim())
  return result
}

function jsonToCsv(json: string): string {
  const arr = JSON.parse(json)
  if (!Array.isArray(arr) || arr.length === 0) throw new Error('JSON must be a non-empty array of objects')
  const headers = Object.keys(arr[0])
  const escape = (v: unknown) => {
    const s = String(v ?? '')
    return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s
  }
  return [
    headers.join(','),
    ...arr.map(row => headers.map(h => escape(row[h])).join(','))
  ].join('\n')
}

const SAMPLE_CSV = `name,age,city
Alice,30,New York
Bob,25,London
Carol,35,Tokyo`

export default function CsvJson() {
  const [csv, setCsv] = useState(SAMPLE_CSV)
  const [json, setJson] = useState('')
  const [error, setError] = useState('')

  const toJson = () => {
    setError('')
    try { setJson(csvToJson(csv)) } catch (e) { setError((e as Error).message) }
  }

  const toCsv = () => {
    setError('')
    try { setCsv(jsonToCsv(json)) } catch (e) { setError((e as Error).message) }
  }

  const copy = (text: string) => navigator.clipboard.writeText(text)

  return (
    <ToolLayout title="CSV ↔ JSON Converter" description="Convert between CSV and JSON formats.">
      <div className="flex flex-col gap-4 flex-1">
        {error && (
          <div className="border border-red-200 rounded-xl p-3 bg-red-50 text-red-400 text-sm">✗ {error}</div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1">
          <div className="flex flex-col">
            <div className="flex justify-between items-center mb-1.5">
              <label className="label mb-0">CSV</label>
              <button onClick={() => copy(csv)} className="copy-btn">Copy</button>
            </div>
            <textarea value={csv} onChange={e => setCsv(e.target.value)} className="tool-textarea flex-1" spellCheck={false} placeholder="name,age&#10;Alice,30" />
          </div>
          <div className="flex flex-col">
            <div className="flex justify-between items-center mb-1.5">
              <label className="label mb-0">JSON</label>
              <button onClick={() => copy(json)} className="copy-btn">Copy</button>
            </div>
            <textarea value={json} onChange={e => setJson(e.target.value)} className="tool-textarea flex-1" spellCheck={false} placeholder='[{"name":"Alice","age":"30"}]' />
          </div>
        </div>

        <div className="flex gap-3 justify-center">
          <button onClick={toJson} className="btn-primary">CSV → JSON</button>
          <button onClick={toCsv} className="btn-primary">JSON → CSV</button>
        </div>
      </div>
    </ToolLayout>
  )
}
