export interface Tool {
  name: string
  slug: string
  icon: string
  description: string
  category: string
}

export const tools: Tool[] = [
  { name: 'JSON Formatter', slug: 'json-formatter', icon: '{ }', description: 'Format, validate and minify JSON data', category: 'Data' },
  { name: 'JSON ↔ XML', slug: 'json-xml', icon: '⇄', description: 'Convert between JSON and XML formats', category: 'Data' },
  { name: 'Base64', slug: 'base64', icon: 'B64', description: 'Encode and decode Base64 strings and files', category: 'Data' },
  { name: 'URL Encoder', slug: 'url-encoder', icon: '🔗', description: 'Encode and decode URL components', category: 'Data' },
  { name: 'JWT Decoder', slug: 'jwt-decoder', icon: '🔑', description: 'Decode and inspect JWT tokens', category: 'Data' },
  { name: 'Hash Generator', slug: 'hash-generator', icon: '##', description: 'Generate SHA-1, SHA-256, SHA-512 hashes', category: 'Security' },
  { name: 'Password Generator', slug: 'password-generator', icon: '🔐', description: 'Generate strong, secure passwords', category: 'Security' },
  { name: 'Image Compressor', slug: 'image-compressor', icon: '🖼', description: 'Compress images in your browser, no upload needed', category: 'Media' },
  { name: 'QR Generator', slug: 'qr-generator', icon: '▦', description: 'Generate QR codes for any text or URL', category: 'Generator' },
  { name: 'UUID Generator', slug: 'uuid-generator', icon: '🆔', description: 'Generate random UUID v4 strings', category: 'Generator' },
  { name: 'Word Counter', slug: 'word-counter', icon: 'Aa', description: 'Count words, characters and reading time', category: 'Text' },
  { name: 'Text Case', slug: 'text-case', icon: 'Tt', description: 'Convert text between camelCase, snake_case, and more', category: 'Text' },
  { name: 'Markdown Preview', slug: 'markdown-preview', icon: 'MD', description: 'Live Markdown editor with rendered preview', category: 'Text' },
  { name: 'Regex Tester', slug: 'regex-tester', icon: '.*', description: 'Test regular expressions with live match highlighting', category: 'Text' },
  { name: 'Diff Checker', slug: 'diff-checker', icon: '±', description: 'Compare two texts and highlight differences', category: 'Text' },
  { name: 'Color Converter', slug: 'color-converter', icon: '🎨', description: 'Convert between HEX, RGB, and HSL color formats', category: 'Design' },
]

export const categories = [...new Set(tools.map(t => t.category))]
