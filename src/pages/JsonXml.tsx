import { useState } from 'react'
import ToolLayout from '../components/ToolLayout'
import { XMLParser, XMLBuilder } from 'fast-xml-parser'
import { useNativeDrop } from '../hooks/useNativeDrop'
import { useOpenedFile } from '../lib/openWith'

export default function JsonXml() {
  const [json, setJson] = useState('')
  const [xml, setXml] = useState('')
  const [error, setError] = useState('')

  // Desktop: drop a file from Finder, or "Open with DevToolbox" — .xml lands in
  // the XML box, else JSON.
  const loadFile = async (file: File) => {
    const text = await file.text()
    if (/\.(xml|svg|rss|atom)$/i.test(file.name)) setXml(text); else setJson(text)
  }
  useNativeDrop(items => { if (items[0]) loadFile(items[0].file) })
  useOpenedFile('/json-xml', loadFile)

  const jsonToXml = () => {
    setError('')
    try {
      const obj = JSON.parse(json)
      const builder = new XMLBuilder({ format: true, indentBy: '  ' })
      // Arrays can't be XML tag names — wrap in <root><item> structure
      const toSerialize = Array.isArray(obj) ? { root: { item: obj } } : { root: obj }
      setXml(builder.build(toSerialize))
    } catch (e) {
      setError('JSON → XML: ' + (e as Error).message)
    }
  }

  const xmlToJson = () => {
    setError('')
    try {
      const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' })
      const result = parser.parse(xml)
      const keys = Object.keys(result)
      // Unwrap single root element
      let inner: unknown = keys.length === 1 ? result[keys[0]] : result
      // Unwrap { item: [...] } back to plain array (round-trip of JSON arrays)
      if (inner && typeof inner === 'object' && !Array.isArray(inner)) {
        const innerKeys = Object.keys(inner as object)
        if (innerKeys.length === 1 && Array.isArray((inner as Record<string, unknown>)[innerKeys[0]])) {
          inner = (inner as Record<string, unknown>)[innerKeys[0]]
        }
      }
      setJson(JSON.stringify(inner, null, 2))
    } catch (e) {
      setError('XML → JSON: ' + (e as Error).message)
    }
  }

  const copy = (text: string) => navigator.clipboard.writeText(text)

  return (
    <ToolLayout title="JSON ↔ XML Converter" description="Convert between JSON and XML formats instantly.">
      <div className="flex flex-col gap-4 flex-1">
        {error && (
          <div className="border border-red-200 rounded-xl p-3 bg-red-50 text-red-400 text-sm">
            ✗ {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1">
          <div className="flex flex-col">
            <div className="flex justify-between items-center mb-1.5">
              <label className="label mb-0">JSON</label>
              <button onClick={() => copy(json)} className="copy-btn">Copy</button>
            </div>
            <textarea
              value={json}
              onChange={e => setJson(e.target.value)}
              placeholder={'{\n  "name": "example",\n  "value": 42\n}'}
              className="tool-textarea flex-1"
              spellCheck={false}
            />
          </div>
          <div className="flex flex-col">
            <div className="flex justify-between items-center mb-1.5">
              <label className="label mb-0">XML</label>
              <button onClick={() => copy(xml)} className="copy-btn">Copy</button>
            </div>
            <textarea
              value={xml}
              onChange={e => setXml(e.target.value)}
              placeholder={'<root>\n  <name>example</name>\n  <value>42</value>\n</root>'}
              className="tool-textarea flex-1"
              spellCheck={false}
            />
          </div>
        </div>

        <div className="flex gap-3 justify-center">
          <button onClick={jsonToXml} className="btn-primary">JSON → XML</button>
          <button onClick={xmlToJson} className="btn-primary">XML → JSON</button>
        </div>
      </div>
    </ToolLayout>
  )
}
