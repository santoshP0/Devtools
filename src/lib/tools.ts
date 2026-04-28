export interface Tool {
  name: string
  slug: string
  icon: string
  description: string
  category: string
}

export const tools: Tool[] = [
  // ── Data (10) ──
  { name: 'JSON Formatter',    slug: 'json-formatter',    icon: '{ }', description: 'Format, validate and minify JSON data',                     category: 'Data'      },
  { name: 'Base64',            slug: 'base64',            icon: 'B64', description: 'Encode and decode Base64 strings and files',                category: 'Data'      },
  { name: 'URL Encoder',       slug: 'url-encoder',       icon: '⊕',  description: 'Encode and decode URL components',                          category: 'Data'      },
  { name: 'JWT Decoder',       slug: 'jwt-decoder',       icon: 'JWT', description: 'Decode and inspect JWT tokens',                            category: 'Data'      },
  { name: 'YAML ↔ JSON',       slug: 'yaml-json',         icon: 'YML', description: 'Convert between YAML and JSON — great for KBs and CI/CD', category: 'Data'      },
  { name: 'JSON → TypeScript', slug: 'json-typescript',   icon: 'TS',  description: 'Generate TypeScript interfaces from any JSON object',      category: 'Data'      },
  { name: 'SQL Formatter',     slug: 'sql-formatter',     icon: 'SQL', description: 'Beautify and indent SQL queries instantly',                 category: 'Data'      },
  { name: 'CSV ↔ JSON',        slug: 'csv-json',          icon: 'CSV', description: 'Convert between CSV and JSON formats',                     category: 'Data'      },
  { name: 'CSV Viewer',        slug: 'csv-viewer',        icon: '⊞',   description: 'Render CSV as a live sortable and searchable table',        category: 'Data'      },
  { name: 'JSON ↔ XML',        slug: 'json-xml',          icon: '⇄',   description: 'Convert between JSON and XML formats',                     category: 'Data'      },
  // ── Security (2) ──
  { name: 'Hash Generator',    slug: 'hash-generator',    icon: '##',  description: 'Generate SHA-1, SHA-256, SHA-512 hashes',                   category: 'Security'  },
  { name: 'Password Generator',slug: 'password-generator',icon: '***', description: 'Generate strong, secure passwords',                         category: 'Security'  },
  // ── Generator (5) ──
  { name: 'UUID Generator',    slug: 'uuid-generator',    icon: 'UID', description: 'Generate random UUID v4 strings',                           category: 'Generator' },
  { name: 'QR Generator',      slug: 'qr-generator',      icon: '▦',   description: 'Generate QR codes for any text or URL',                     category: 'Generator' },
  { name: 'Mock Data Generator',slug:'mock-data-generator',icon: '⊛',  description: 'Generate fake names, emails, addresses and more',           category: 'Generator' },
  { name: 'Lorem Ipsum',       slug: 'lorem-ipsum',       icon: '¶',   description: 'Generate placeholder lorem ipsum text',                    category: 'Generator' },
  { name: 'Meta Tag Generator',slug: 'meta-tag-generator', icon: '</>','description': 'Generate SEO, Open Graph and Twitter Card meta tags',     category: 'Generator' },
  // ── Text (8) ──
  { name: 'Regex Tester',      slug: 'regex-tester',      icon: '.*',  description: 'Test regular expressions with live match highlighting',     category: 'Text'      },
  { name: 'Diff Checker',      slug: 'diff-checker',      icon: '±',   description: 'Compare two texts and highlight differences',               category: 'Text'      },
  { name: 'Markdown Preview',  slug: 'markdown-preview',  icon: 'MD',  description: 'Live Markdown editor with rendered preview',               category: 'Text'      },
  { name: 'Text Case',         slug: 'text-case',         icon: 'Tt',  description: 'Convert text between camelCase, snake_case, and more',     category: 'Text'      },
  { name: 'Word Counter',      slug: 'word-counter',      icon: 'Wc',  description: 'Count words, characters and reading time',                 category: 'Text'      },
  { name: 'HTML Entities',     slug: 'html-entities',     icon: '&amp;', description: 'Encode and decode HTML entities',                        category: 'Text'      },
  { name: 'Slugify',           slug: 'slugify',           icon: '—',   description: 'Convert text to URL-friendly slugs',                       category: 'Text'      },
  { name: 'Line Sorter',       slug: 'line-sorter',       icon: '↕',   description: 'Sort, deduplicate and shuffle lines of text instantly',    category: 'Text'      },
  // ── Utils (5) ──
  { name: 'Unix Timestamp',    slug: 'unix-timestamp',    icon: '⏱',   description: 'Convert between Unix timestamps and human-readable dates', category: 'Utils'     },
  { name: 'Curl Builder',      slug: 'curl-builder',      icon: '$',   description: 'Build and export curl commands from a visual form',         category: 'Utils'     },
  { name: 'HTTP Status Codes', slug: 'http-status-codes', icon: '404', description: 'Searchable reference for all HTTP 1xx–5xx status codes',   category: 'Utils'     },
  { name: 'Semver Checker',    slug: 'semver-checker',    icon: '~^',  description: 'Parse npm semantic version ranges and check compatibility', category: 'Utils'     },
  { name: 'Number Base',       slug: 'base-converter',    icon: '01',  description: 'Convert numbers between decimal, hex, binary, and octal',  category: 'Utils'     },
  // ── Design (6) ──
  { name: 'Color Converter',   slug: 'color-converter',   icon: '◐',   description: 'Convert between HEX, RGB, HSL, and OKLCH formats',        category: 'Design'    },
  { name: 'Color Contrast',    slug: 'color-contrast',    icon: '◑',   description: 'Check WCAG AA/AAA contrast ratio between two colors',      category: 'Design'    },
  { name: 'CSS Unit Converter',slug: 'css-unit-converter', icon: 'px', description: 'Convert px, em, rem, vw, vh, pt — all synced live',       category: 'Design'    },
  { name: 'Gradient Builder',  slug: 'gradient-builder',  icon: '▣',   description: 'Visual CSS gradient editor with live preview and copy',    category: 'Design'    },
  { name: 'Box Shadow Builder',slug: 'box-shadow-builder', icon: '▢',  description: 'Visual multi-layer CSS box-shadow generator',              category: 'Design'    },
  { name: 'Color Palette',     slug: 'color-palette',     icon: '✦',   description: 'Generate complementary, triadic, and analogous palettes',  category: 'Design'    },
  // ── Media (2) ──
  { name: 'Image Compressor',  slug: 'image-compressor',  icon: '⊟',   description: 'Compress images in your browser, no upload needed',       category: 'Media'     },
  { name: 'Image → Base64',    slug: 'image-to-base64',   icon: 'IMG', description: 'Convert images to Base64 data URIs for use in CSS or HTML', category: 'Media'   },
  { name: 'Base64 → Image',    slug: 'base64-to-image',   icon: 'B64', description: 'Decode a Base64 string or Data URI back into an image', category: 'Media'   },
  // ── API & Network (1) ──
  { name: 'REST Client',       slug: 'rest-client',       icon: '⚡',   description: 'Advanced REST client — send requests, manage collections, view responses', category: 'API' },
  // ── Frontend (6) ──
  { name: 'Flexbox Playground',slug: 'flexbox-playground',icon: '⊞',  description: 'Visually explore CSS flexbox properties with live preview', category: 'Frontend'  },
  { name: 'Grid Playground',   slug: 'grid-playground',   icon: '⊟',  description: 'Build CSS Grid layouts visually with live preview',        category: 'Frontend'  },
  { name: 'SVG Preview',       slug: 'svg-preview',       icon: 'SVG', description: 'Preview SVG files, remove bloat and export optimized code', category: 'Frontend' },
  { name: 'Favicon Generator', slug: 'favicon-generator', icon: '★',   description: 'Create favicons from text or emoji in all required sizes', category: 'Frontend'  },
  { name: 'Responsive Tester', slug: 'responsive-tester', icon: '📱',  description: 'Preview any URL at common device breakpoints',             category: 'Frontend'  },
  // ── Backend (3) ──
  { name: 'Log Prettifier',    slug: 'log-prettifier',    icon: '▤',   description: 'Colorize and parse JSON logs and stack traces',            category: 'Backend'   },
  { name: 'NoSQL Viewer',      slug: 'nosql-viewer',      icon: '{}',  description: 'Explore JSON documents like a NoSQL database viewer',      category: 'Backend'   },
  { name: 'Cron Parser',       slug: 'cron-parser',       icon: '⏲',   description: 'Parse cron expressions and preview next run times',        category: 'Backend'   },
]

export const categories = [...new Set(tools.map(t => t.category))]
