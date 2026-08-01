export interface Tool {
  name: string
  slug: string
  icon: string  // Lucide icon name
  description: string
  category: string
  keywords?: string[]
  desktopOnly?: boolean  // hidden from the web grid/search; only shown inside the desktop app
}

const IN_APP = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window

const ALL_TOOLS: Tool[] = [
  // ── Top picks (shown first in "All" view) — most universally useful tools across categories ──
  { name: 'JSON Formatter',    slug: 'json-formatter',    icon: 'Braces',          description: 'Format, validate and minify JSON data',                     category: 'Data', keywords: ['prettify', 'beautify', 'lint', 'parse', 'minify'] },
  { name: 'Regex Tester',      slug: 'regex-tester',      icon: 'Regex',           description: 'Test regular expressions with live match highlighting',     category: 'Text', keywords: ['regexp', 'pattern', 'match', 'replace', 'regex101'] },
  { name: 'Base64',            slug: 'base64',            icon: 'Binary',          description: 'Encode and decode Base64 strings and files',                category: 'Data', keywords: ['b64', 'encode', 'decode', 'binary'] },
  { name: 'Diff Checker',      slug: 'diff-checker',      icon: 'FileDiff',        description: 'Compare two texts and highlight differences',               category: 'Text', keywords: ['compare', 'merge', 'patch', 'changes'] },
  { name: 'Unix Timestamp',    slug: 'unix-timestamp',    icon: 'Clock',           description: 'Convert between Unix timestamps and human-readable dates', category: 'Utils', keywords: ['epoch', 'time', 'date', 'datetime', 'utc', 'iso'] },
  { name: 'JWT Decoder',       slug: 'jwt-decoder',       icon: 'KeyRound',        description: 'Decode and inspect JWT tokens',                            category: 'Data', keywords: ['token', 'auth', 'claims', 'payload', 'bearer'] },
  { name: 'Color Converter',   slug: 'color-converter',   icon: 'Palette',         description: 'Convert between HEX, RGB, HSL, and OKLCH formats',        category: 'Design', keywords: ['hex', 'rgb', 'hsl', 'oklch', 'color', 'colour', 'picker'] },
  { name: 'URL Encoder',       slug: 'url-encoder',       icon: 'Link',            description: 'Encode and decode URL components',                          category: 'Data', keywords: ['uri', 'percent', 'encode', 'decode', 'query', 'param'] },
  { name: 'Image Compressor',  slug: 'image-compressor',  icon: 'FileDown',        description: 'Compress images in your browser, no upload needed',       category: 'Media', keywords: ['img', 'compress', 'resize', 'optimize', 'shrink', 'png', 'jpg', 'webp', 'photo'] },
  { name: 'Media Compressor',  slug: 'media-compressor',  icon: 'Film',            description: 'FFmpeg-grade image & video compression (desktop app)',    category: 'Media', keywords: ['ffmpeg', 'video', 'mp4', 'webm', 'h264', 'h265', 'compress', 'shrink', 'desktop'], desktopOnly: true },
  { name: 'JavaScript Sandbox',slug: 'js-sandbox',        icon: 'SquareTerminal',  description: 'A lightweight playground to run and test JS snippets in browser', category: 'Utils', keywords: ['javascript', 'console', 'repl', 'playground', 'run', 'execute', 'node'] },
  { name: 'Hash Generator',    slug: 'hash-generator',    icon: 'FingerprintPattern', description: 'Generate SHA-1, SHA-256, SHA-512 hashes',                category: 'Security', keywords: ['sha', 'md5', 'checksum', 'digest', 'crypto'] },
  { name: 'Markdown Preview',  slug: 'markdown-preview',  icon: 'BookOpen',        description: 'Live Markdown editor with rendered preview & Mermaid diagrams', category: 'Text', keywords: ['md', 'readme', 'preview', 'editor', 'mermaid', 'github', 'mdx', 'markup'] },
  { name: 'SVG Preview',       slug: 'svg-preview',       icon: 'Shapes',          description: 'Preview SVG files, remove bloat and export optimized code', category: 'Frontend', keywords: ['vector', 'icon', 'optimize', 'svgo', 'xml'] },
  { name: 'YAML ↔ JSON',       slug: 'yaml-json',         icon: 'YamlJson',        description: 'Convert between YAML and JSON — great for KBs and CI/CD', category: 'Data', keywords: ['yml', 'config', 'k8s', 'kubernetes', 'docker', 'ci'] },
  { name: 'Password Generator',slug: 'password-generator',icon: 'Lock',            description: 'Generate strong, secure passwords',                         category: 'Security', keywords: ['pw', 'pass', 'random', 'secure', 'strong'] },
  { name: 'QR & Barcode Generator', slug: 'qr-generator',      icon: 'QrCode',     description: 'Generate QR codes, PDF417, Data Matrix, and 1D barcodes',   category: 'Generator', keywords: ['qr', 'barcode', 'scan', 'code128', 'ean', 'upc'] },
  { name: 'Notes',             slug: 'notes',             icon: 'StickyNote',      description: 'Write multiple notes saved in your browser, persist with localStorage', category: 'Utils', keywords: ['notepad', 'memo', 'scratch', 'text', 'todo', 'write'] },
  { name: 'Gradient Builder',  slug: 'gradient-builder',  icon: 'Rainbow',         description: 'Visual CSS gradient editor with live preview and copy',    category: 'Design', keywords: ['css', 'linear', 'radial', 'conic', 'background', 'color'] },
  { name: 'Text Case',         slug: 'text-case',         icon: 'CaseSensitive',   description: 'Convert text between camelCase, snake_case, and more',     category: 'Text', keywords: ['camel', 'snake', 'pascal', 'kebab', 'upper', 'lower', 'title', 'capitalize'] },
  { name: 'Curl Builder',      slug: 'curl-builder',      icon: 'Terminal',        description: 'Build and export curl commands from a visual form',         category: 'Utils', keywords: ['http', 'request', 'api', 'command', 'terminal', 'wget'] },

  // ── Remaining Data tools ──
  { name: 'JSON → TypeScript', slug: 'json-typescript',   icon: 'FileType',        description: 'Generate TypeScript interfaces from any JSON object',      category: 'Data', keywords: ['ts', 'type', 'interface', 'schema', 'codegen'] },
  { name: 'CSV ↔ JSON',        slug: 'csv-json',          icon: 'ArrowLeftRight',  description: 'Convert between CSV and JSON formats',                     category: 'Data', keywords: ['spreadsheet', 'excel', 'table', 'tsv'] },
  { name: 'CSV Viewer',        slug: 'csv-viewer',        icon: 'Table',           description: 'Open large CSV files instantly with virtual scrolling and sortable columns', category: 'Data', keywords: ['spreadsheet', 'excel', 'table', 'tsv', 'data'] },
  { name: 'SQL Formatter',     slug: 'sql-formatter',     icon: 'Database',        description: 'Beautify and indent SQL queries instantly',                 category: 'Data', keywords: ['query', 'database', 'db', 'mysql', 'postgres', 'prettify'] },
  { name: 'JSON ↔ XML',        slug: 'json-xml',          icon: 'Repeat',          description: 'Convert between JSON and XML formats',                     category: 'Data', keywords: ['convert', 'transform', 'soap', 'api'] },

  // ── Remaining Text tools ──
  { name: 'HTML Entities',     slug: 'html-entities',     icon: 'Code',            description: 'Encode and decode HTML entities',                        category: 'Text', keywords: ['escape', 'unescape', 'amp', 'entity', 'special'] },
  { name: 'Line Sorter',       slug: 'line-sorter',       icon: 'ArrowDownAZ',     description: 'Sort, deduplicate and shuffle lines of text instantly',    category: 'Text', keywords: ['sort', 'dedup', 'unique', 'shuffle', 'alphabetical', 'reverse'] },
  { name: 'Word Counter',      slug: 'word-counter',      icon: 'Hash',            description: 'Count words, characters and reading time',                 category: 'Text', keywords: ['char', 'length', 'stats', 'wc'] },
  { name: 'Slugify',           slug: 'slugify',           icon: 'TextCursorInput', description: 'Convert text to URL-friendly slugs',                       category: 'Text', keywords: ['url', 'seo', 'permalink', 'slug', 'dash'] },

  // ── Remaining Utils ──
  { name: 'Number Base',       slug: 'base-converter',    icon: 'Sigma',           description: 'Convert numbers between decimal, hex, binary, and octal',  category: 'Utils', keywords: ['hex', 'bin', 'oct', 'decimal', 'convert', 'radix', 'binary', 'hexadecimal'] },
  { name: 'HTTP Status Codes', slug: 'http-status-codes', icon: 'CircleAlert',     description: 'Searchable reference for all HTTP 1xx–5xx status codes',   category: 'Utils', keywords: ['200', '301', '403', '404', '500', 'error', 'status', 'response'] },
  { name: 'Semver Checker',    slug: 'semver-checker',    icon: 'GitBranch',       description: 'Parse npm semantic version ranges and check compatibility', category: 'Utils', keywords: ['version', 'npm', 'package', 'range', 'compatible'] },

  // ── Remaining Frontend ──
  { name: 'Responsive Tester', slug: 'responsive-tester', icon: 'Smartphone',      description: 'Preview any URL at common device breakpoints',             category: 'Frontend', keywords: ['mobile', 'tablet', 'desktop', 'breakpoint', 'viewport', 'screen'] },
  { name: 'Flexbox Playground',slug: 'flexbox-playground',icon: 'AlignHorizontalDistributeCenter', description: 'Visually explore CSS flexbox properties with live preview', category: 'Frontend', keywords: ['css', 'flex', 'layout', 'align', 'justify', 'gap'] },
  { name: 'Grid Playground',   slug: 'grid-playground',   icon: 'LayoutGrid',      description: 'Build CSS Grid layouts visually with live preview',        category: 'Frontend', keywords: ['css', 'layout', 'columns', 'rows', 'template'] },
  { name: 'Favicon Generator', slug: 'favicon-generator', icon: 'Globe',           description: 'Create favicons from text or emoji in all required sizes', category: 'Frontend', keywords: ['icon', 'ico', 'apple-touch', 'pwa', 'tab'] },
  { name: 'Keyframe Builder',  slug: 'keyframe-builder',  icon: 'Clapperboard',    description: 'Visually build CSS @keyframes animations and export code', category: 'Frontend', keywords: ['css', 'animation', 'transition', 'motion', 'animate'] },

  // ── Remaining Design ──
  { name: 'Color Contrast',    slug: 'color-contrast',    icon: 'Contrast',        description: 'Check WCAG AA/AAA contrast ratio between two colors',      category: 'Design', keywords: ['wcag', 'a11y', 'accessibility', 'ratio', 'contrast'] },
  { name: 'Color Palette',     slug: 'color-palette',     icon: 'Pipette',         description: 'Generate complementary, triadic, and analogous palettes',  category: 'Design', keywords: ['swatch', 'scheme', 'harmony', 'colors', 'theme'] },
  { name: 'Box Shadow Builder',slug: 'box-shadow-builder',icon: 'Square',          description: 'Visual multi-layer CSS box-shadow generator',              category: 'Design', keywords: ['css', 'shadow', 'elevation', 'drop', 'layer'] },
  { name: 'Glassmorphism',     slug: 'glassmorphism-builder',icon: 'Gem',          description: 'Visually design modern glassmorphism UI elements',         category: 'Design', keywords: ['glass', 'blur', 'frost', 'translucent', 'backdrop', 'ui'] },
  { name: 'CSS Unit Converter',slug: 'css-unit-converter', icon: 'Ruler',          description: 'Convert px, em, rem, vw, vh, pt — all synced live',       category: 'Design', keywords: ['pixel', 'em', 'rem', 'viewport', 'pt', 'unit'] },
  { name: 'Color Blind Simulator', slug: 'color-blind-simulator', icon: 'Eye',     description: 'Simulate how images look under different color vision deficiencies', category: 'Design', keywords: ['a11y', 'accessibility', 'daltonism', 'protanopia', 'deuteranopia', 'vision'] },
  { name: 'Dark/Light Converter', slug: 'dark-light-converter', icon: 'SunMoon',   description: 'Convert images between dark and light mode — invert screenshots, logos, UI designs', category: 'Design', keywords: ['dark', 'light', 'theme', 'invert', 'mode', 'night', 'screenshot', 'logo'] },

  // ── Remaining Security ──
  { name: 'JWT Generator',    slug: 'jwt-generator',     icon: 'ShieldCheck',     description: 'Generate signed JWT tokens and decode existing ones',     category: 'Security', keywords: ['token', 'auth', 'sign', 'hs256', 'bearer'] },

  // ── Remaining Media ──
  { name: 'Image Converter',   slug: 'image-converter',   icon: 'ImageDown',       description: 'Convert images between PNG, JPEG and WebP with quality and resize controls', category: 'Media', keywords: ['img', 'png', 'jpg', 'jpeg', 'webp', 'format', 'convert', 'photo', 'heic', 'heif', 'iphone'] },
  { name: 'Video → GIF',       slug: 'video-to-gif',      icon: 'ImagePlay',       description: 'Trim a video clip and export an optimized GIF (desktop app)', category: 'Media', keywords: ['gif', 'video', 'mp4', 'mov', 'animate', 'convert', 'ffmpeg', 'clip', 'desktop'], desktopOnly: true },
  { name: 'Video Editor',      slug: 'video-editor',      icon: 'Clapperboard',    description: 'Cut, split, join and layer clips with text, boxes and blur (desktop app)', category: 'Media', keywords: ['video', 'edit', 'editor', 'cut', 'split', 'trim', 'join', 'timeline', 'layers', 'blur', 'text', 'overlay', 'ffmpeg', 'mp4', 'desktop'], desktopOnly: true },
  { name: 'EXIF Viewer',       slug: 'exif-viewer',       icon: 'Camera',          description: 'Extract camera, GPS and timestamp metadata from JPEG images — 100% offline', category: 'Media', keywords: ['metadata', 'photo', 'camera', 'gps', 'location', 'jpg', 'image'] },
  { name: 'BlurHash Generator', slug: 'blurhash-generator', icon: 'Cloudy',        description: 'Generate and decode BlurHash placeholder strings from images', category: 'Media', keywords: ['blur', 'placeholder', 'lazy', 'loading', 'preview', 'image'] },
  { name: 'Image → Base64',    slug: 'image-to-base64',   icon: 'Image',           description: 'Convert images to Base64 data URIs for use in CSS or HTML', category: 'Media', keywords: ['img', 'b64', 'data-uri', 'encode', 'inline'] },
  { name: 'Base64 → Image',    slug: 'base64-to-image',   icon: 'ImageUp',         description: 'Decode a Base64 string or Data URI back into an image',    category: 'Media', keywords: ['img', 'b64', 'data-uri', 'decode', 'preview'] },

  // ── Remaining Generator ──
  { name: 'UUID Generator',    slug: 'uuid-generator',    icon: 'BadgeInfo',       description: 'Generate random UUID v4 strings',                           category: 'Generator', keywords: ['guid', 'id', 'unique', 'random'] },
  { name: 'Mock Data Generator',slug:'mock-data-generator',icon: 'Dices',           description: 'Generate fake names, emails, addresses and more',           category: 'Generator', keywords: ['fake', 'dummy', 'seed', 'faker', 'sample', 'test'] },
  { name: 'Meta Tag Generator',slug: 'meta-tag-generator', icon: 'Tags',           description: 'Generate SEO, Open Graph and Twitter Card meta tags',      category: 'Generator', keywords: ['seo', 'og', 'opengraph', 'twitter', 'social', 'head', 'html'] },
  { name: 'Lorem Ipsum',       slug: 'lorem-ipsum',       icon: 'Pilcrow',         description: 'Generate placeholder lorem ipsum text',                     category: 'Generator', keywords: ['placeholder', 'dummy', 'text', 'filler', 'lipsum'] },

  // ── New Tools ──
  { name: 'Timezone Converter', slug: 'timezone-converter', icon: 'Globe',     description: 'Compare current time across multiple timezones simultaneously', category: 'Utils',    keywords: ['time', 'tz', 'world clock', 'utc', 'gmt', 'dst'] },
  { name: 'Pomodoro Timer',     slug: 'pomodoro',           icon: 'Timer',      description: 'Stay focused with timed work and break intervals',              category: 'Utils',    keywords: ['focus', 'timer', 'productivity', 'break', '25 minutes', 'technique'] },
  { name: 'HTML Preview',       slug: 'html-preview',       icon: 'CodeXml',      description: 'Live HTML + CSS + JS editor with sandboxed preview',           category: 'Frontend', keywords: ['html', 'css', 'javascript', 'playground', 'codepen', 'sandbox', 'live'] },
  { name: 'TOML ↔ JSON',        slug: 'toml-json',          icon: 'FileCode',   description: 'Convert between TOML config files and JSON',                   category: 'Data',     keywords: ['toml', 'cargo', 'rust', 'config', 'ini', 'pyproject'] },
  { name: 'JSON Path Tester',   slug: 'json-path',          icon: 'ListFilter',     description: 'Query JSON data using JSONPath expressions',                   category: 'Data',     keywords: ['jsonpath', 'query', 'jq', 'filter', 'xpath', 'select'] },
  { name: 'Text ↔ Binary/Hex',  slug: 'text-binary',        icon: 'Binary',     description: 'Encode text to binary, hex, octal or decimal byte values',    category: 'Utils',    keywords: ['binary', 'hex', 'octal', 'decimal', 'encode', 'decode', 'bytes', 'ascii'] },

  // ── Backend ──
  { name: 'Log Prettifier',    slug: 'log-prettifier',    icon: 'Scroll',          description: 'Colorize and parse JSON logs and stack traces',            category: 'Backend', keywords: ['log', 'debug', 'trace', 'error', 'stacktrace', 'console'] },
  { name: 'NoSQL Viewer',      slug: 'nosql-viewer',      icon: 'DatabaseZap',     description: 'Explore JSON documents like a NoSQL database viewer',      category: 'Backend', keywords: ['mongo', 'mongodb', 'document', 'db', 'database', 'json'] },
  { name: 'Cron Parser',       slug: 'cron-parser',       icon: 'AlarmClock',      description: 'Parse cron expressions and preview next run times',        category: 'Backend', keywords: ['schedule', 'job', 'timer', 'crontab', 'recurring'] },

  // ── API (last) ──
  { name: 'REST Client',       slug: 'rest-client',       icon: 'Plug',            description: 'Advanced REST client — send requests, manage collections, view responses', category: 'API', keywords: ['api', 'http', 'fetch', 'request', 'postman', 'get', 'post', 'put', 'delete', 'endpoint'] },
]

// Desktop-only tools are hidden from the web grid/search; shown inside the app
export const tools: Tool[] = ALL_TOOLS.filter(t => IN_APP || !t.desktopOnly)

// Category order: derived from tool array order
export const categories = ['All', ...new Set(tools.map(t => t.category))]
