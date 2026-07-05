import { useState, useEffect, useRef, useCallback } from 'react'
import ToolLayout from '../components/ToolLayout'
import CopyBtn from '../components/CopyBtn'

const FIRST = ['Alice','Bob','Carol','Dave','Eve','Frank','Grace','Henry','Iris','Jack','Kate','Liam','Mia','Noah','Olivia','Paul','Quinn','Rachel','Sam','Tara','Uma','Victor','Wendy','Xander','Yara','Zoe']
const LAST  = ['Smith','Jones','Williams','Brown','Davis','Miller','Wilson','Moore','Taylor','Anderson','Thomas','Jackson','White','Harris','Martin','Garcia','Martinez','Robinson','Clark','Rodriguez']
const DOMAINS = ['gmail.com','yahoo.com','outlook.com','proton.me','icloud.com','example.com','company.io']
const STREETS = ['Main St','Oak Ave','Elm St','Park Blvd','Cedar Ln','Maple Dr','Pine Rd','Willow Way']
const CITIES  = ['New York','London','Tokyo','Berlin','Paris','Sydney','Toronto','Amsterdam','Singapore','Dubai']
const COUNTRIES = ['USA','UK','Japan','Germany','France','Australia','Canada','Netherlands','Singapore','UAE']
const JOBS  = ['Engineer','Designer','Manager','Analyst','Developer','Consultant','Architect','Director','Lead','Specialist']
const DEPTS = ['Engineering','Design','Marketing','Sales','Finance','HR','Product','Operations','Legal']

function rand<T>(arr: T[]): T { return arr[Math.floor(Math.random()*arr.length)] }
function randInt(min: number, max: number) { return min+Math.floor(Math.random()*(max-min+1)) }
function uuidv4m() { return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,c=>{const r=Math.random()*16|0;return(c==='x'?r:r&3|8).toString(16)}) }

const FIELD_TYPES = ['First Name','Last Name','Full Name','Email','Phone','UUID','Age','Company','Job Title','Department','City','Country','Street Address','Zip Code','URL','IP Address','Boolean','Integer','Float','Date']

function generateField(type: string): string | number | boolean {
  const fn = rand(FIRST), ln = rand(LAST)
  switch(type) {
    case 'First Name':    return fn
    case 'Last Name':     return ln
    case 'Full Name':     return `${fn} ${ln}`
    case 'Email':         return `${fn.toLowerCase()}.${ln.toLowerCase()}${randInt(1,99)}@${rand(DOMAINS)}`
    case 'Phone':         return `+1 (${randInt(200,999)}) ${randInt(100,999)}-${randInt(1000,9999)}`
    case 'UUID':          return uuidv4m()
    case 'Age':           return randInt(18, 70)
    case 'Company':       return `${rand(LAST)} ${rand(['Inc','LLC','Corp','Ltd','Co'])}`
    case 'Job Title':     return `${rand(['Senior','Junior','Lead','Principal','Staff'])} ${rand(JOBS)}`
    case 'Department':    return rand(DEPTS)
    case 'City':          return rand(CITIES)
    case 'Country':       return rand(COUNTRIES)
    case 'Street Address':return `${randInt(1,9999)} ${rand(STREETS)}`
    case 'Zip Code':      return String(randInt(10000,99999))
    case 'URL':           return `https://${rand(LAST).toLowerCase()}.${rand(['com','io','dev','app','net'])}`
    case 'IP Address':    return `${randInt(1,254)}.${randInt(0,254)}.${randInt(0,254)}.${randInt(1,254)}`
    case 'Boolean':       return Math.random() > 0.5
    case 'Integer':       return randInt(0, 10000)
    case 'Float':         return parseFloat((Math.random()*1000).toFixed(2))
    case 'Date':          return new Date(Date.now()-randInt(0,1e10)).toISOString().slice(0,10)
    default: return ''
  }
}

interface Field { id: number; name: string; type: string }

export default function MockDataGeneratorPage() {
  const [fields, setFields] = useState<Field[]>([
    { id:1, name:'id', type:'UUID' }, { id:2, name:'name', type:'Full Name' },
    { id:3, name:'email', type:'Email' }, { id:4, name:'age', type:'Age' },
    { id:5, name:'city', type:'City' }, { id:6, name:'job', type:'Job Title' },
  ])
  const [count, setCount] = useState(10)
  const [format, setFormat] = useState('JSON')
  const [data, setData] = useState('')
  const nextId = useRef(7)

  const generate = useCallback(() => {
    const rows = Array.from({ length: count }, () => {
      const obj: Record<string, unknown> = {}
      fields.forEach(f => { obj[f.name || f.type.toLowerCase().replace(/\s/g,'_')] = generateField(f.type) })
      return obj
    })
    if (format === 'JSON') setData(JSON.stringify(rows, null, 2))
    else if (format === 'CSV') {
      const keys = fields.map(f => f.name || f.type)
      setData([keys.join(','), ...rows.map(r => keys.map(k => { const v = r[k]; return typeof v === 'string' && v.includes(',') ? `"${v}"` : String(v ?? '') }).join(','))].join('\n'))
    } else {
      const keys = fields.map(f => f.name || f.type)
      const widths = keys.map((k,i) => Math.max(k.length, ...rows.map(r => String(r[k]??'').length), 4))
      const row = (vals: unknown[]) => '| ' + vals.map((v,i) => String(v??'').padEnd(widths[i])).join(' | ') + ' |'
      const sep = '| ' + widths.map(w => '-'.repeat(w)).join(' | ') + ' |'
      setData([row(keys), sep, ...rows.map(r => row(keys.map(k => r[k])))].join('\n'))
    }
  }, [fields, count, format])

  useEffect(() => { generate() }, [fields, count, format])

  const addField = () => setFields(f => [...f, { id: nextId.current++, name:'', type: rand(FIELD_TYPES) }])
  const removeField = (id: number) => { if (fields.length > 1) setFields(f => f.filter(x => x.id !== id)) }
  const updateField = (id: number, key: keyof Field, val: string) => setFields(f => f.map(x => x.id===id ? {...x,[key]:val} : x))

  return (
    <ToolLayout title="Mock Data Generator" description="Generate fake names, emails, addresses and more">
      <div className="two-col">
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
              <div className="section-label">Fields</div>
              <button className="btn btn-ghost btn-sm" onClick={addField}>+ Add Field</button>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
              {fields.map(f => (
                <div key={f.id} style={{ display:'flex', gap:8, alignItems:'center' }}>
                  <input type="text" value={f.name} onChange={e => updateField(f.id,'name',e.target.value)}
                    placeholder="field name" style={{ width:110, fontSize:12 }} />
                  <select value={f.type} onChange={e => updateField(f.id,'type',e.target.value)} style={{ flex:1, fontSize:12 }}>
                    {FIELD_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <button onClick={() => removeField(f.id)} style={{ background:'none', border:'none', color:'var(--text-muted)', cursor:'pointer', fontSize:18, padding:'0 4px', lineHeight:1 }}>×</button>
                </div>
              ))}
            </div>
          </div>
          <div style={{ display:'flex', gap:10 }}>
            <div style={{ flex:1 }}>
              <label>Rows</label>
              <select value={count} onChange={e => setCount(Number(e.target.value))}>
                {[5,10,25,50,100].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div style={{ flex:1 }}>
              <label>Format</label>
              <select value={format} onChange={e => setFormat(e.target.value)}>
                {['JSON','CSV','Markdown'].map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
          </div>
          <button className="btn btn-primary" onClick={generate}>↻ Regenerate</button>
        </div>
        <div>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
            <div className="section-label">Output ({count} rows)</div>
            {data && <CopyBtn text={data} />}
          </div>
          <pre className="code-out large" style={{ fontSize:12, maxHeight:480, overflow:'auto' }}>{data}</pre>
        </div>
      </div>
    </ToolLayout>
  )
}
