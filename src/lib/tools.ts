export interface Tool {
  name: string
  slug: string
  icon: string
  description: string
  category: string
}

export const tools: Tool[] = [
  // ── Tier 1: Daily use ──
  { name: 'JSON Formatter',    slug: 'json-formatter',    icon: '{ }', description: 'Format, validate and minify JSON data',                     category: 'Data'      },
  { name: 'Base64',            slug: 'base64',            icon: 'B64', description: 'Encode and decode Base64 strings and files',                category: 'Data'      },
  { name: 'URL Encoder',       slug: 'url-encoder',       icon: '⊕',  description: 'Encode and decode URL components',                          category: 'Data'      },
  { name: 'Hash Generator',    slug: 'hash-generator',    icon: '##',  description: 'Generate SHA-1, SHA-256, SHA-512 hashes',                   category: 'Security'  },
  { name: 'Password Generator',slug: 'password-generator',icon: '***', description: 'Generate strong, secure passwords',                         category: 'Security'  },
  { name: 'UUID Generator',    slug: 'uuid-generator',    icon: 'UID', description: 'Generate random UUID v4 strings',                           category: 'Generator' },
  { name: 'QR Generator',      slug: 'qr-generator',      icon: '▦',   description: 'Generate QR codes for any text or URL',                     category: 'Generator' },
  { name: 'Regex Tester',      slug: 'regex-tester',      icon: '.*',  description: 'Test regular expressions with live match highlighting',     category: 'Text'      },
  { name: 'Diff Checker',      slug: 'diff-checker',      icon: '±',   description: 'Compare two texts and highlight differences',               category: 'Text'      },
  { name: 'Unix Timestamp',    slug: 'unix-timestamp',    icon: '⏱',   description: 'Convert between Unix timestamps and human-readable dates', category: 'Utils'     },
  // ── Tier 2: Frequently needed ──
  { name: 'JWT Decoder',       slug: 'jwt-decoder',       icon: 'JWT', description: 'Decode and inspect JWT tokens',                            category: 'Data'      },
  { name: 'CSV ↔ JSON',        slug: 'csv-json',          icon: 'CSV', description: 'Convert between CSV and JSON formats',                     category: 'Data'      },
  { name: 'JSON ↔ XML',        slug: 'json-xml',          icon: '⇄',   description: 'Convert between JSON and XML formats',                     category: 'Data'      },
  { name: 'Markdown Preview',  slug: 'markdown-preview',  icon: 'MD',  description: 'Live Markdown editor with rendered preview',               category: 'Text'      },
  { name: 'Color Converter',   slug: 'color-converter',   icon: '◐',   description: 'Convert between HEX, RGB, HSL, and OKLCH formats',        category: 'Design'    },
  // ── Tier 3: Situationally essential ──
  { name: 'Text Case',         slug: 'text-case',         icon: 'Tt',  description: 'Convert text between camelCase, snake_case, and more',     category: 'Text'      },
  { name: 'Word Counter',      slug: 'word-counter',      icon: 'Wc',  description: 'Count words, characters and reading time',                 category: 'Text'      },
  { name: 'HTML Entities',     slug: 'html-entities',     icon: '&amp;', description: 'Encode and decode HTML entities',                        category: 'Text'      },
  { name: 'Slugify',           slug: 'slugify',           icon: '—',   description: 'Convert text to URL-friendly slugs',                       category: 'Text'      },
  { name: 'Color Palette',     slug: 'color-palette',     icon: '✦',   description: 'Generate complementary, triadic, and analogous palettes',  category: 'Design'    },
  { name: 'Image Compressor',  slug: 'image-compressor',  icon: '⊟',   description: 'Compress images in your browser, no upload needed',       category: 'Media'     },
  { name: 'Number Base',       slug: 'base-converter',    icon: '01',  description: 'Convert numbers between decimal, hex, binary, and octal',  category: 'Utils'     },
  { name: 'Cron Parser',       slug: 'cron-parser',       icon: '⏲',   description: 'Parse cron expressions and preview next run times',        category: 'Utils'     },
  // ── Tier 4: Handy ──
  { name: 'Lorem Ipsum',       slug: 'lorem-ipsum',       icon: '¶',   description: 'Generate placeholder lorem ipsum text',                    category: 'Generator' },
]

export const categories = [...new Set(tools.map(t => t.category))]
