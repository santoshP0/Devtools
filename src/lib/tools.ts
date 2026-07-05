export interface Tool {
  name: string
  slug: string
  icon: string
  description: string
  category: string
  keywords?: string[]
}

export const tools: Tool[] = [
  // ── High Utility (Top Picked) ──
  { name: 'REST Client',       slug: 'rest-client',       icon: '🔌',   description: 'Advanced REST client — send requests, manage collections, view responses', category: 'API', keywords: ['api', 'http', 'fetch', 'request', 'postman', 'get', 'post', 'put', 'delete', 'endpoint'] },
  { name: 'JSON Formatter',    slug: 'json-formatter',    icon: '{ }', description: 'Format, validate and minify JSON data',                     category: 'Data', keywords: ['prettify', 'beautify', 'lint', 'parse', 'minify'] },
  { name: 'Base64',            slug: 'base64',            icon: 'B64', description: 'Encode and decode Base64 strings and files',                category: 'Data', keywords: ['b64', 'encode', 'decode', 'binary'] },
  { name: 'JWT Decoder',       slug: 'jwt-decoder',       icon: 'JWT', description: 'Decode and inspect JWT tokens',                            category: 'Data', keywords: ['token', 'auth', 'claims', 'payload', 'bearer'] },
  { name: 'Regex Tester',      slug: 'regex-tester',      icon: '.*',  description: 'Test regular expressions with live match highlighting',     category: 'Text', keywords: ['regexp', 'pattern', 'match', 'replace', 'regex101'] },
  { name: 'Unix Timestamp',    slug: 'unix-timestamp',    icon: '⏱',   description: 'Convert between Unix timestamps and human-readable dates', category: 'Utils', keywords: ['epoch', 'time', 'date', 'datetime', 'utc', 'iso'] },
  { name: 'URL Encoder',       slug: 'url-encoder',       icon: '🔗',  description: 'Encode and decode URL components',                          category: 'Data', keywords: ['uri', 'percent', 'encode', 'decode', 'query', 'param'] },
  { name: 'Diff Checker',      slug: 'diff-checker',      icon: '📄',   description: 'Compare two texts and highlight differences',               category: 'Text', keywords: ['compare', 'merge', 'patch', 'changes'] },
  { name: 'SVG Preview',       slug: 'svg-preview',       icon: 'SVG', description: 'Preview SVG files, remove bloat and export optimized code', category: 'Frontend', keywords: ['vector', 'icon', 'optimize', 'svgo', 'xml'] },
  { name: 'Responsive Tester', slug: 'responsive-tester', icon: '📱',  description: 'Preview any URL at common device breakpoints',             category: 'Frontend', keywords: ['mobile', 'tablet', 'desktop', 'breakpoint', 'viewport', 'screen'] },
  { name: 'YAML ↔ JSON',       slug: 'yaml-json',         icon: 'YML', description: 'Convert between YAML and JSON — great for KBs and CI/CD', category: 'Data', keywords: ['yml', 'config', 'k8s', 'kubernetes', 'docker', 'ci'] },
  { name: 'JavaScript Sandbox',slug: 'js-sandbox',        icon: 'JS',  description: 'A lightweight playground to run and test JS snippets in browser', category: 'Utils', keywords: ['javascript', 'console', 'repl', 'playground', 'run', 'execute', 'node'] },

  // ── Data ──
  { name: 'JSON → TypeScript', slug: 'json-typescript',   icon: 'TS',  description: 'Generate TypeScript interfaces from any JSON object',      category: 'Data', keywords: ['ts', 'type', 'interface', 'schema', 'codegen'] },
  { name: 'SQL Formatter',     slug: 'sql-formatter',     icon: 'SQL', description: 'Beautify and indent SQL queries instantly',                 category: 'Data', keywords: ['query', 'database', 'db', 'mysql', 'postgres', 'prettify'] },
  { name: 'CSV ↔ JSON',        slug: 'csv-json',          icon: 'CSV', description: 'Convert between CSV and JSON formats',                     category: 'Data', keywords: ['spreadsheet', 'excel', 'table', 'tsv'] },
  { name: 'CSV Viewer',        slug: 'csv-viewer',        icon: '📊',  description: 'Open large CSV files instantly with virtual scrolling and sortable columns', category: 'Data', keywords: ['spreadsheet', 'excel', 'table', 'tsv', 'data'] },
  { name: 'JSON ↔ XML',        slug: 'json-xml',          icon: '🔀',   description: 'Convert between JSON and XML formats',                     category: 'Data', keywords: ['convert', 'transform', 'soap', 'api'] },

  // ── Text ──
  { name: 'Markdown Preview',  slug: 'markdown-preview',  icon: 'MD',  description: 'Live Markdown editor with rendered preview & Mermaid diagrams', category: 'Text', keywords: ['md', 'readme', 'preview', 'editor', 'mermaid', 'github', 'mdx', 'markup'] },
  { name: 'Text Case',         slug: 'text-case',         icon: 'Tt',  description: 'Convert text between camelCase, snake_case, and more',     category: 'Text', keywords: ['camel', 'snake', 'pascal', 'kebab', 'upper', 'lower', 'title', 'capitalize'] },
  { name: 'Word Counter',      slug: 'word-counter',      icon: 'Wc',  description: 'Count words, characters and reading time',                 category: 'Text', keywords: ['char', 'length', 'stats', 'wc'] },
  { name: 'HTML Entities',     slug: 'html-entities',     icon: '&amp;', description: 'Encode and decode HTML entities',                        category: 'Text', keywords: ['escape', 'unescape', 'amp', 'entity', 'special'] },
  { name: 'Slugify',           slug: 'slugify',           icon: '🔤',   description: 'Convert text to URL-friendly slugs',                       category: 'Text', keywords: ['url', 'seo', 'permalink', 'slug', 'dash'] },
  { name: 'Line Sorter',       slug: 'line-sorter',       icon: '📋',   description: 'Sort, deduplicate and shuffle lines of text instantly',    category: 'Text', keywords: ['sort', 'dedup', 'unique', 'shuffle', 'alphabetical', 'reverse'] },

  // ── Frontend ──
  { name: 'Flexbox Playground',slug: 'flexbox-playground',icon: '⊞',  description: 'Visually explore CSS flexbox properties with live preview', category: 'Frontend', keywords: ['css', 'flex', 'layout', 'align', 'justify', 'gap'] },
  { name: 'Grid Playground',   slug: 'grid-playground',   icon: '🔲',  description: 'Build CSS Grid layouts visually with live preview',        category: 'Frontend', keywords: ['css', 'layout', 'columns', 'rows', 'template'] },
  { name: 'Favicon Generator', slug: 'favicon-generator', icon: '⭐',   description: 'Create favicons from text or emoji in all required sizes', category: 'Frontend', keywords: ['icon', 'ico', 'apple-touch', 'pwa', 'tab'] },
  { name: 'Keyframe Builder',  slug: 'keyframe-builder',  icon: '🎬',   description: 'Visually build CSS @keyframes animations and export code', category: 'Frontend', keywords: ['css', 'animation', 'transition', 'motion', 'animate'] },

  // ── Utils ──
  { name: 'Notes',             slug: 'notes',             icon: '📝',  description: 'Write multiple notes saved in your browser, persist with localStorage', category: 'Utils', keywords: ['notepad', 'memo', 'scratch', 'text', 'todo', 'write'] },
  { name: 'Curl Builder',      slug: 'curl-builder',      icon: '💻',   description: 'Build and export curl commands from a visual form',         category: 'Utils', keywords: ['http', 'request', 'api', 'command', 'terminal', 'wget'] },
  { name: 'HTTP Status Codes', slug: 'http-status-codes', icon: '404', description: 'Searchable reference for all HTTP 1xx–5xx status codes',   category: 'Utils', keywords: ['200', '301', '403', '404', '500', 'error', 'status', 'response'] },
  { name: 'Semver Checker',    slug: 'semver-checker',    icon: '~^',  description: 'Parse npm semantic version ranges and check compatibility', category: 'Utils', keywords: ['version', 'npm', 'package', 'range', 'compatible'] },
  { name: 'Number Base',       slug: 'base-converter',    icon: '01',  description: 'Convert numbers between decimal, hex, binary, and octal',  category: 'Utils', keywords: ['hex', 'bin', 'oct', 'decimal', 'convert', 'radix', 'binary', 'hexadecimal'] },

  // ── Design ──
  { name: 'Color Converter',   slug: 'color-converter',   icon: '🎨',   description: 'Convert between HEX, RGB, HSL, and OKLCH formats',        category: 'Design', keywords: ['hex', 'rgb', 'hsl', 'oklch', 'color', 'colour', 'picker'] },
  { name: 'Color Contrast',    slug: 'color-contrast',    icon: '⚖️',   description: 'Check WCAG AA/AAA contrast ratio between two colors',      category: 'Design', keywords: ['wcag', 'a11y', 'accessibility', 'ratio', 'contrast'] },
  { name: 'CSS Unit Converter',slug: 'css-unit-converter', icon: 'px', description: 'Convert px, em, rem, vw, vh, pt — all synced live',       category: 'Design', keywords: ['pixel', 'em', 'rem', 'viewport', 'pt', 'unit'] },
  { name: 'Gradient Builder',  slug: 'gradient-builder',  icon: '🌈',   description: 'Visual CSS gradient editor with live preview and copy',    category: 'Design', keywords: ['css', 'linear', 'radial', 'conic', 'background', 'color'] },
  { name: 'Box Shadow Builder',slug: 'box-shadow-builder', icon: '🔳',  description: 'Visual multi-layer CSS box-shadow generator',              category: 'Design', keywords: ['css', 'shadow', 'elevation', 'drop', 'layer'] },
  { name: 'Color Palette',     slug: 'color-palette',     icon: '🎯',   description: 'Generate complementary, triadic, and analogous palettes',  category: 'Design', keywords: ['swatch', 'scheme', 'harmony', 'colors', 'theme'] },
  { name: 'Glassmorphism',     slug: 'glassmorphism-builder',icon: '💎', description: 'Visually design modern glassmorphism UI elements',         category: 'Design', keywords: ['glass', 'blur', 'frost', 'translucent', 'backdrop', 'ui'] },

  // ── Security ──
  { name: 'Hash Generator',    slug: 'hash-generator',    icon: '🔐',  description: 'Generate SHA-1, SHA-256, SHA-512 hashes',                   category: 'Security', keywords: ['sha', 'md5', 'checksum', 'digest', 'crypto'] },
  { name: 'Password Generator',slug: 'password-generator',icon: '🔒', description: 'Generate strong, secure passwords',                         category: 'Security', keywords: ['pw', 'pass', 'random', 'secure', 'strong'] },
  { name: 'JWT Generator',    slug: 'jwt-generator',     icon: '🔑',  description: 'Generate signed JWT tokens and decode existing ones',     category: 'Security', keywords: ['token', 'auth', 'sign', 'hs256', 'bearer'] },

  // ── Media ──
  { name: 'Image Compressor',  slug: 'image-compressor',  icon: '📦',   description: 'Compress images in your browser, no upload needed',       category: 'Media', keywords: ['img', 'compress', 'resize', 'optimize', 'shrink', 'png', 'jpg', 'webp', 'photo'] },
  { name: 'Image → Base64',    slug: 'image-to-base64',   icon: 'IMG', description: 'Convert images to Base64 data URIs for use in CSS or HTML', category: 'Media', keywords: ['img', 'b64', 'data-uri', 'encode', 'inline'] },
  { name: 'Base64 → Image',    slug: 'base64-to-image',   icon: 'B64', description: 'Decode a Base64 string or Data URI back into an image',    category: 'Media', keywords: ['img', 'b64', 'data-uri', 'decode', 'preview'] },
  { name: 'EXIF Viewer',       slug: 'exif-viewer',       icon: '🔍',  description: 'Extract camera, GPS and timestamp metadata from JPEG images — 100% offline', category: 'Media', keywords: ['metadata', 'photo', 'camera', 'gps', 'location', 'jpg', 'image'] },
  { name: 'Image Converter',   slug: 'image-converter',   icon: '🖼',   description: 'Convert images between PNG, JPEG and WebP with quality and resize controls', category: 'Media', keywords: ['img', 'png', 'jpg', 'jpeg', 'webp', 'format', 'convert', 'photo'] },
  { name: 'BlurHash Generator', slug: 'blurhash-generator', icon: '🌫', description: 'Generate and decode BlurHash placeholder strings from images', category: 'Media', keywords: ['blur', 'placeholder', 'lazy', 'loading', 'preview', 'image'] },
  { name: 'Color Blind Simulator', slug: 'color-blind-simulator', icon: '👁', description: 'Simulate how images look under different color vision deficiencies', category: 'Design', keywords: ['a11y', 'accessibility', 'daltonism', 'protanopia', 'deuteranopia', 'vision'] },
  { name: 'Dark/Light Converter', slug: 'dark-light-converter', icon: '🌗', description: 'Convert images between dark and light mode — invert screenshots, logos, UI designs', category: 'Design', keywords: ['dark', 'light', 'theme', 'invert', 'mode', 'night', 'screenshot', 'logo'] },

  // ── Generator ──
  { name: 'UUID Generator',    slug: 'uuid-generator',    icon: 'UID', description: 'Generate random UUID v4 strings',                           category: 'Generator', keywords: ['guid', 'id', 'unique', 'random'] },
  { name: 'QR & Barcode Generator', slug: 'qr-generator',      icon: '▦',   description: 'Generate QR codes, PDF417, Data Matrix, and 1D barcodes',   category: 'Generator', keywords: ['qr', 'barcode', 'scan', 'code128', 'ean', 'upc'] },
  { name: 'Mock Data Generator',slug:'mock-data-generator',icon: '🎲',  description: 'Generate fake names, emails, addresses and more',           category: 'Generator', keywords: ['fake', 'dummy', 'seed', 'faker', 'sample', 'test'] },
  { name: 'Lorem Ipsum',       slug: 'lorem-ipsum',       icon: '¶',   description: 'Generate placeholder lorem ipsum text',                     category: 'Generator', keywords: ['placeholder', 'dummy', 'text', 'filler', 'lipsum'] },
  { name: 'Meta Tag Generator',slug: 'meta-tag-generator', icon: '</>', description: 'Generate SEO, Open Graph and Twitter Card meta tags',      category: 'Generator', keywords: ['seo', 'og', 'opengraph', 'twitter', 'social', 'head', 'html'] },

  // ── Backend ──
  { name: 'Log Prettifier',    slug: 'log-prettifier',    icon: '📜',   description: 'Colorize and parse JSON logs and stack traces',            category: 'Backend', keywords: ['log', 'debug', 'trace', 'error', 'stacktrace', 'console'] },
  { name: 'NoSQL Viewer',      slug: 'nosql-viewer',      icon: '🗃',  description: 'Explore JSON documents like a NoSQL database viewer',      category: 'Backend', keywords: ['mongo', 'mongodb', 'document', 'db', 'database', 'json'] },
  { name: 'Cron Parser',       slug: 'cron-parser',       icon: '⏰',   description: 'Parse cron expressions and preview next run times',        category: 'Backend', keywords: ['schedule', 'job', 'timer', 'crontab', 'recurring'] },
]

export const categories = ['All', ...new Set(tools.map(t => t.category))]
