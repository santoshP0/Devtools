// Shared Monaco configuration — import this before using any monaco-react component.
// Custom build: editor features + JSON language service + JS syntax highlighting.
// No TypeScript worker (intellisense) — keeps the chunk ~3MB smaller; add
// vs/language/typescript if completion is ever worth the weight.
import 'monaco-editor/esm/vs/editor/editor.all.js'
import 'monaco-editor/esm/vs/basic-languages/javascript/javascript.contribution.js'
import 'monaco-editor/esm/vs/language/json/monaco.contribution.js'
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api.js'
import { loader } from '@monaco-editor/react'
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker.js?worker'
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker.js?worker'

// Bundle Monaco locally (offline PWA — no CDN)
self.MonacoEnvironment = {
  getWorker: (_: unknown, label: string) =>
    label === 'json' ? new jsonWorker() : new editorWorker(),
}
loader.config({ monaco })

export { monaco }

export const EDITOR_DEFAULTS = {
  minimap: { enabled: false },
  fontSize: 13,
  scrollBeyondLastLine: false,
  automaticLayout: true,
  padding: { top: 10, bottom: 10 },
  tabSize: 2,
  wordWrap: 'on',
  diffWordWrap: 'on',
} as const
