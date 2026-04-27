import { useState } from 'react'
import ToolLayout from '../components/ToolLayout'
import { XMLParser, XMLBuilder } from 'fast-xml-parser'

export default function JsonXml() {
  const [json, setJson] = useState('')
  const [xml, setXml] = useState('')
  const [error, setError] = useState('')

  const jsonToXml = () => {
    setError('')
    try {
      const obj = JSON.parse(json)
      const builder = new XMLBuilder({ format: true, indentBy: '  ' })
      setXml(builder.build(obj))
    } catch (e) {
      setError('JSON → XML: ' + (e as Error).message)
    }
  }

  const xmlToJson = () => {
    setError('')
    try {
      const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' })
      const result = parser.parse(xml)
      setJson(JSON.stringify(result, null, 2))
    } catch (e) {
      setError('XML → JSON: ' + (e as Error).message)
    }
  }

  const copy = (text: string) => navigator.clipboard.writeText(text)

  return (
    <ToolLayout title="JSON ↔ XML Converter" description="Convert between JSON and XML formats instantly.">
      <div className="space-y-4">
        {error && (
          <div className="border border-red-200 rounded-lg p-3 bg-red-50 text-red-700 text-sm">
            ✗ {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="label">JSON</label>
              <button onClick={() => copy(json)} className="copy-btn">Copy</button>
            </div>
            <textarea
              value={json}
              onChange={e => setJson(e.target.value)}
              placeholder={'{\n  "name": "example",\n  "value": 42\n}'}
              className="tool-textarea h-72"
              spellCheck={false}
            />
          </div>
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="label">XML</label>
              <button onClick={() => copy(xml)} className="copy-btn">Copy</button>
            </div>
            <textarea
              value={xml}
              onChange={e => setXml(e.target.value)}
              placeholder={'<root>\n  <name>example</name>\n  <value>42</value>\n</root>'}
              className="tool-textarea h-72"
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
