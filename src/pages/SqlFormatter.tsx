import { useState, useEffect } from 'react'
import ToolLayout from '../components/ToolLayout'
import CopyBtn from '../components/CopyBtn'

const SQL_KEYWORDS = ['SELECT','FROM','WHERE','AND','OR','NOT','IN','BETWEEN','LIKE','IS','NULL','JOIN','LEFT','RIGHT','INNER','OUTER','FULL','CROSS','ON','AS','ORDER','BY','GROUP','HAVING','LIMIT','OFFSET','INSERT','INTO','VALUES','UPDATE','SET','DELETE','CREATE','TABLE','DROP','ALTER','ADD','COLUMN','PRIMARY','KEY','FOREIGN','REFERENCES','UNIQUE','INDEX','VIEW','CASE','WHEN','THEN','ELSE','END','UNION','ALL','DISTINCT','TOP','EXISTS','WITH']

function formatSQL(sql: string) {
  let s = sql.replace(/\s+/g, ' ').trim()
  const BREAKS_BEFORE = ['SELECT','FROM','WHERE','AND','OR','JOIN','LEFT JOIN','RIGHT JOIN','INNER JOIN','OUTER JOIN','ON','ORDER BY','GROUP BY','HAVING','LIMIT','OFFSET','UNION','INSERT INTO','VALUES','UPDATE','SET','DELETE FROM']
  BREAKS_BEFORE.forEach(kw => {
    const re = new RegExp(`\\b${kw}\\b`, 'gi')
    s = s.replace(re, `\n${kw}`)
  })
  SQL_KEYWORDS.forEach(kw => {
    const re = new RegExp(`\\b${kw}\\b`, 'gi')
    s = s.replace(re, kw)
  })
  const lines = s.split('\n').map(l => l.trim()).filter(Boolean)
  return lines.map(line => {
    if (/^(SELECT|FROM|WHERE|ORDER BY|GROUP BY|HAVING|LIMIT|OFFSET|UNION|INSERT|UPDATE|DELETE|SET|VALUES)/.test(line)) return line
    if (/^(AND|OR|ON)/.test(line)) return '  ' + line
    if (/^(LEFT|RIGHT|INNER|OUTER|FULL|CROSS|JOIN)/.test(line)) return line
    return '  ' + line
  }).join('\n')
}

export default function SqlFormatterPage() {
  const SAMPLE = `SELECT u.id, u.name, u.email, p.title, p.created_at FROM users u INNER JOIN posts p ON p.user_id = u.id WHERE u.active = 1 AND u.created_at > '2024-01-01' AND (p.status = 'published' OR p.status = 'featured') ORDER BY p.created_at DESC LIMIT 20 OFFSET 0`
  const [input, setInput] = useState(SAMPLE)
  const [output, setOutput] = useState('')

  useEffect(() => {
    try { setOutput(formatSQL(input)) } catch { setOutput(input) }
  }, [input])

  return (
    <ToolLayout title="SQL Formatter" description="Beautify and indent SQL queries instantly">
      <div className="two-col">
        <div>
          <div className="section-label">SQL Input</div>
          <textarea value={input} onChange={e => setInput(e.target.value)} style={{ minHeight:300, fontSize:13 }} spellCheck={false} />
        </div>
        <div>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
            <div className="section-label">Formatted SQL</div>
            {output && <CopyBtn text={output} />}
          </div>
          <pre className="code-out" style={{ minHeight:300, color:'oklch(0.80 0.14 75)' }}>{output}</pre>
        </div>
      </div>
    </ToolLayout>
  )
}
