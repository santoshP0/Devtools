import { useState, useMemo } from 'react'
import ToolLayout from '../components/ToolLayout'

export default function CsvViewerPage() {
  const SAMPLE = `name,age,city,role,salary\nAlice Smith,30,New York,Engineer,95000\nBob Jones,25,London,Designer,78000\nCarol White,32,Tokyo,Manager,112000\nDave Brown,28,Berlin,Engineer,88000\nEve Davis,35,Paris,Director,135000`
  const [csv, setCsv] = useState(SAMPLE)
  const [sortCol, setSortCol] = useState<number | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const PAGE_SIZE = 20

  const { headers, rows } = useMemo(() => {
    try {
      const lines = csv.trim().split('\n').filter(Boolean)
      if (lines.length < 1) return { headers: [], rows: [] as string[][] }
      const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g,''))
      const rows: string[][] = lines.slice(1).map(line => {
        const vals: string[] = []; let cur = ''; let inQ = false
        for (const c of line) {
          if (c === '"') inQ = !inQ
          else if (c === ',' && !inQ) { vals.push(cur.trim()); cur = '' }
          else cur += c
        }
        vals.push(cur.trim())
        return vals.map(v => v.replace(/^"|"$/g,''))
      })
      return { headers, rows }
    } catch { return { headers: [], rows: [] as string[][] } }
  }, [csv])

  const filtered = useMemo(() => {
    let r = rows
    if (search) r = r.filter(row => row.some(cell => cell.toLowerCase().includes(search.toLowerCase())))
    if (sortCol !== null) {
      r = [...r].sort((a, b) => {
        const av = a[sortCol] || ''; const bv = b[sortCol] || ''
        const an = parseFloat(av); const bn = parseFloat(bv)
        const cmp = !isNaN(an) && !isNaN(bn) ? an - bn : av.localeCompare(bv)
        return sortDir === 'asc' ? cmp : -cmp
      })
    }
    return r
  }, [rows, search, sortCol, sortDir])

  const paged = filtered.slice(page * PAGE_SIZE, (page+1) * PAGE_SIZE)
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)

  const handleSort = (i: number) => {
    if (sortCol === i) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortCol(i); setSortDir('asc') }
    setPage(0)
  }

  return (
    <ToolLayout title="CSV Viewer" description="Render CSV as a live sortable and searchable table">
      <div className="one-col">
        <div>
          <div className="section-label">CSV Data</div>
          <textarea value={csv} onChange={e => { setCsv(e.target.value); setPage(0) }} style={{ minHeight:100, fontSize:13 }} spellCheck={false} />
        </div>
        {headers.length > 0 && (
          <>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:10 }}>
              <input type="text" value={search} onChange={e => { setSearch(e.target.value); setPage(0) }}
                placeholder="Search rows…" style={{ width:220 }} />
              <span style={{ fontSize:13, color:'var(--text-muted)' }}>
                {filtered.length} rows · {headers.length} columns
              </span>
            </div>
            <div style={{ overflowX:'auto', borderRadius:12, border:'1px solid var(--border)' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', fontFamily:'var(--font-mono)', fontSize:13 }}>
                <thead>
                  <tr style={{ background:'var(--bg)' }}>
                    {headers.map((h, i) => (
                      <th key={i} onClick={() => handleSort(i)} style={{
                        padding:'11px 16px', textAlign:'left', fontWeight:600, fontSize:11,
                        textTransform:'uppercase', letterSpacing:'0.07em', color:'var(--text-dim)',
                        borderBottom:'1px solid var(--border)', cursor:'pointer', userSelect:'none', whiteSpace:'nowrap',
                      }}>
                        {h} {sortCol===i ? (sortDir==='asc'?'↑':'↓') : ''}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paged.map((row, ri) => (
                    <tr key={ri} style={{ borderBottom:'1px solid var(--border)', transition:'background 0.1s' }}
                      onMouseEnter={e => (e.currentTarget.style.background='var(--surface2)')}
                      onMouseLeave={e => (e.currentTarget.style.background='transparent')}>
                      {headers.map((_, ci) => (
                        <td key={ci} style={{ padding:'10px 16px', color: ci===0 ? 'var(--text)' : 'var(--text-dim)', maxWidth:260, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                          {row[ci] ?? ''}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div style={{ display:'flex', gap:8, justifyContent:'center' }}>
                <button className="btn btn-ghost btn-sm" disabled={page===0} onClick={() => setPage(p => p-1)}>← Prev</button>
                <span style={{ fontSize:13, color:'var(--text-dim)', display:'flex', alignItems:'center' }}>Page {page+1} of {totalPages}</span>
                <button className="btn btn-ghost btn-sm" disabled={page>=totalPages-1} onClick={() => setPage(p => p+1)}>Next →</button>
              </div>
            )}
          </>
        )}
      </div>
    </ToolLayout>
  )
}
