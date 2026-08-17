import { useState, useMemo } from 'react'
import ToolLayout from '../components/ToolLayout'
import CopyBtn from '../components/CopyBtn'
import { useNativeDrop } from '../hooks/useNativeDrop'

const SAMPLE_SPEC = `openapi: 3.0.0
info:
  title: Sample API
  version: 1.0.0
  description: A simple example API
servers:
  - url: https://api.example.com/v1
paths:
  /users:
    get:
      summary: List all users
      tags: [Users]
      parameters:
        - name: limit
          in: query
          schema: { type: integer, default: 20 }
      responses:
        '200':
          description: A list of users
    post:
      summary: Create a user
      tags: [Users]
      requestBody:
        content:
          application/json:
            schema:
              type: object
              properties:
                name: { type: string }
                email: { type: string }
      responses:
        '201':
          description: User created
  /users/{id}:
    get:
      summary: Get a user
      tags: [Users]
      parameters:
        - name: id
          in: path
          required: true
          schema: { type: integer }
      responses:
        '200': { description: A user object }
        '404': { description: Not found }
    delete:
      summary: Delete a user
      tags: [Users]
      parameters:
        - name: id
          in: path
          required: true
          schema: { type: integer }
      responses:
        '204': { description: Deleted }`

const METHOD_COLORS: Record<string, string> = {
  get:'var(--cat-gen)', post:'var(--cat-txt)', put:'oklch(0.75 0.16 200)',
  patch:'var(--purple)', delete:'var(--cat-sec)', head:'var(--text-dim)', options:'var(--cat-utl)'
}
const METHOD_BG: Record<string, string> = {
  get:'var(--cat-gen-bg)', post:'var(--cat-txt-bg)', put:'oklch(0.16 0.06 200)',
  patch:'var(--purple-bg)', delete:'var(--cat-sec-bg)', head:'var(--surface2)', options:'var(--cat-utl-bg)'
}

declare const window: Window & { jsyaml?: { load: (s: string) => unknown } }

interface PathItem { method: string; path: string; summary?: string; description?: string; tags?: string[]; parameters?: unknown[]; requestBody?: unknown; responses?: Record<string, { description: string }> }

export default function OpenApiViewerPage() {
  const [spec, setSpec] = useState(SAMPLE_SPEC)
  const [activeTag, setActiveTag] = useState('All')

  // Desktop: drop an OpenAPI file (json/yaml) from Finder.
  useNativeDrop(async items => { if (items[0]) setSpec(await items[0].file.text()) })
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const parsed = useMemo(() => {
    try {
      const obj = window.jsyaml ? window.jsyaml.load(spec) as Record<string, unknown> : JSON.parse(spec)
      return obj
    } catch { return null }
  }, [spec])

  const endpoints: PathItem[] = useMemo(() => {
    if (!parsed) return []
    const paths = parsed.paths as Record<string, Record<string, unknown>> | undefined
    if (!paths) return []
    const list: PathItem[] = []
    Object.entries(paths).forEach(([path, methods]) => {
      Object.entries(methods).forEach(([method, op]) => {
        if (!['get','post','put','patch','delete','head','options'].includes(method)) return
        const o = op as Record<string, unknown>
        list.push({ method, path, summary: o.summary as string, description: o.description as string, tags: o.tags as string[], parameters: o.parameters as unknown[], requestBody: o.requestBody, responses: o.responses as Record<string, { description: string }> })
      })
    })
    return list
  }, [parsed])

  const tags = useMemo(() => ['All', ...new Set(endpoints.flatMap(e => e.tags || ['Default']))], [endpoints])
  const filtered = activeTag === 'All' ? endpoints : endpoints.filter(e => (e.tags || ['Default']).includes(activeTag))
  const info = parsed ? (parsed.info as Record<string, string> | undefined) : undefined
  const servers = parsed ? (parsed.servers as Array<{url: string}> | undefined) : undefined

  const toggleExpand = (key: string) => setExpanded(s => { const n = new Set(s); n.has(key) ? n.delete(key) : n.add(key); return n })

  return (
    <ToolLayout title="OpenAPI Viewer" description="Visualize OpenAPI / Swagger specs with expandable endpoint docs">
      <div className="two-col" style={{ alignItems:'flex-start' }}>
        <div>
          <div className="section-label">Paste OpenAPI Spec (YAML or JSON)</div>
          <textarea value={spec} onChange={e => setSpec(e.target.value)} style={{ minHeight:400, fontSize:12 }} spellCheck={false} />
          {!parsed && spec.trim() && <div className="error-msg" style={{ marginTop:8 }}>⚠ Could not parse spec</div>}
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          {info && (
            <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:12, padding:'16px 18px' }}>
              <div style={{ fontWeight:700, fontSize:16 }}>{info.title}</div>
              <div style={{ fontSize:12, color:'var(--text-muted)', marginBottom:6 }}>v{info.version}</div>
              {info.description && <div style={{ fontSize:13, color:'var(--text-dim)' }}>{info.description}</div>}
              {servers && servers[0] && <div style={{ marginTop:8, fontFamily:'var(--font-mono)', fontSize:12, color:'var(--accent)' }}>{servers[0].url}</div>}
            </div>
          )}
          {tags.length > 1 && (
            <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
              {tags.map(t => (
                <button key={t} className={`seg-btn ${activeTag === t ? 'active' : ''}`} onClick={() => setActiveTag(t)} style={{ padding:'5px 12px', fontSize:12 }}>{t}</button>
              ))}
            </div>
          )}
          <div style={{ fontSize:12, color:'var(--text-muted)' }}>{filtered.length} endpoint{filtered.length !== 1 ? 's' : ''}</div>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {filtered.map(ep => {
              const key = `${ep.method}${ep.path}`
              const open = expanded.has(key)
              return (
                <div key={key} style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:10, overflow:'hidden' }}>
                  <div onClick={() => toggleExpand(key)} style={{ display:'flex', gap:10, alignItems:'center', padding:'11px 14px', cursor:'pointer' }}>
                    <span style={{ fontFamily:'var(--font-mono)', fontWeight:700, fontSize:11, padding:'3px 8px', borderRadius:6, background: METHOD_BG[ep.method] || 'var(--surface2)', color: METHOD_COLORS[ep.method] || 'var(--text-dim)', minWidth:52, textAlign:'center', textTransform:'uppercase' }}>{ep.method}</span>
                    <span style={{ fontFamily:'var(--font-mono)', fontSize:13, flex:1 }}>{ep.path}</span>
                    {ep.summary && <span style={{ fontSize:12, color:'var(--text-muted)', flex:1 }}>{ep.summary}</span>}
                    <span style={{ color:'var(--text-muted)', fontSize:12 }}>{open ? '▲' : '▼'}</span>
                  </div>
                  {open && (
                    <div style={{ padding:'12px 14px', borderTop:'1px solid var(--border)', background:'var(--bg)' }}>
                      {ep.description && <div style={{ fontSize:13, color:'var(--text-dim)', marginBottom:10 }}>{ep.description}</div>}
                      {ep.parameters && ep.parameters.length > 0 && (
                        <div style={{ marginBottom:10 }}>
                          <div className="section-label">Parameters</div>
                          {(ep.parameters as Array<Record<string, unknown>>).map((p, i) => (
                            <div key={i} style={{ fontFamily:'var(--font-mono)', fontSize:12, color:'var(--text-dim)', marginBottom:4 }}>
                              <span style={{ color:'var(--accent)' }}>{String(p.name)}</span>
                              <span style={{ color:'var(--text-muted)' }}> ({String(p.in)})</span>
                              {!!p.required && <span style={{ color:'var(--cat-sec)', marginLeft:6 }}>required</span>}
                            </div>
                          ))}
                        </div>
                      )}
                      {ep.responses && (
                        <div>
                          <div className="section-label">Responses</div>
                          {Object.entries(ep.responses).map(([code, r]) => (
                            <div key={code} style={{ fontFamily:'var(--font-mono)', fontSize:12, color:'var(--text-dim)', marginBottom:3 }}>
                              <span style={{ color: code.startsWith('2') ? 'var(--cat-gen)' : code.startsWith('4') ? 'var(--cat-sec)' : 'var(--cat-txt)' }}>{code}</span>
                              <span style={{ color:'var(--text-muted)' }}> — {r.description}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </ToolLayout>
  )
}
