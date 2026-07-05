# DevToolbox 🧰

> **Elite Developer Utilities — Offline First**
>
> A fast, privacy-focused collection of **66 developer tools** that run entirely in your browser. No sign-up, no data uploads, no internet required after the first load.

---

## ✨ Features

- ⚡ **Instant** — Vite-powered SPA with sub-second navigation
- 🔒 **Private** — Everything runs client-side; your data never leaves your machine
- 📦 **Offline-first** — PWA with full service-worker caching (installable on desktop & mobile)
- 🌗 **Dark / Light mode** — Persisted theme toggle
- 🔍 **Command Palette** — `⌘K` / `Ctrl+K` fuzzy search across all tools
- 🗂️ **Category filters** — Browse by Data, Text, Security, Design, Media, and more
- 📱 **Responsive** — Works across all screen sizes



## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org) ≥ 18 or [Bun](https://bun.sh) ≥ 1.0

### Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd Devtools

# Install dependencies (using Bun)
bun install

# Or with npm
npm install
```

### Development

```bash
# Start the dev server (http://localhost:5173)
bun run dev

# Or with npm
npm run dev
```



---

## 🧩 Tools Reference

### 📊 Data
| Tool | Description |
|---|---|
| JSON Formatter | Format, validate, and minify JSON |
| Base64 | Encode / decode Base64 strings and files |
| JWT Decoder | Decode and inspect JWT tokens |
| URL Encoder | Encode and decode URL components |
| YAML ↔ JSON | Convert between YAML and JSON — great for K8s & CI/CD |
| JSON → TypeScript | Generate TypeScript interfaces from any JSON object |
| CSV ↔ JSON | Convert between CSV and JSON formats |
| CSV Viewer | Open large CSV files with virtual scrolling & sortable columns |
| SQL Formatter | Beautify and indent SQL queries instantly |
| JSON ↔ XML | Convert between JSON and XML formats |

### 📝 Text
| Tool | Description |
|---|---|
| Regex Tester | Test regular expressions with live match highlighting |
| Diff Checker | Compare two texts and highlight differences |
| Markdown Preview | Live Markdown editor with rendered preview & Mermaid diagrams |
| Text Case | Convert text between camelCase, snake_case, PascalCase, and more |
| HTML Entities | Encode and decode HTML entities |
| Line Sorter | Sort, deduplicate, and shuffle lines of text |
| Word Counter | Count words, characters, and reading time |
| Slugify | Convert text to URL-friendly slugs |

### 🔐 Security
| Tool | Description |
|---|---|
| Hash Generator | Generate SHA-1, SHA-256, SHA-512 cryptographic hashes |
| Password Generator | Generate strong, secure random passwords |
| JWT Generator | Sign and generate JWT tokens (HS256, RS256, etc.) |

### 🎨 Design
| Tool | Description |
|---|---|
| Color Converter | Convert between HEX, RGB, HSL, and OKLCH |
| Gradient Builder | Visual CSS gradient editor with live preview |
| Color Contrast | WCAG AA/AAA contrast ratio checker |
| Color Palette | Generate complementary, triadic, and analogous palettes |
| Box Shadow Builder | Visual multi-layer CSS box-shadow generator |
| Glassmorphism Builder | Design modern glassmorphism UI elements |
| CSS Unit Converter | Convert px, em, rem, vw, vh, pt — all synced live |
| Color Blind Simulator | Simulate images under different color vision deficiencies |
| Dark/Light Converter | Convert images between dark and light mode |

### 🖼️ Media
| Tool | Description |
|---|---|
| Image Compressor | Compress images in-browser, no upload needed |
| Image Converter | Convert between PNG, JPEG, and WebP |
| EXIF Viewer | Extract camera, GPS, and timestamp metadata from JPEGs |
| BlurHash Generator | Generate and decode BlurHash placeholder strings |
| Image → Base64 | Convert images to Base64 data URIs |
| Base64 → Image | Decode Base64 strings back to images |

### 🔧 Utils
| Tool | Description |
|---|---|
| Unix Timestamp | Convert between Unix timestamps and human-readable dates |
| JavaScript Sandbox | Lightweight JS playground with live console output |
| Notes | Persistent multi-note scratchpad (localStorage) |
| Curl Builder | Build and export curl commands from a visual form |
| Number Base | Convert between decimal, hex, binary, and octal |
| HTTP Status Codes | Searchable reference for all HTTP 1xx–5xx status codes |
| Semver Checker | Parse npm semantic version ranges and check compatibility |

### 🖥️ Frontend
| Tool | Description |
|---|---|
| SVG Preview | Preview SVG files, remove bloat, and export optimised code |
| Responsive Tester | Preview any URL at common device breakpoints |
| Flexbox Playground | Visually explore CSS flexbox properties |
| Grid Playground | Build CSS Grid layouts visually |
| Favicon Generator | Create favicons from text or emoji in all required sizes |
| Keyframe Builder | Visually build CSS `@keyframes` animations |

### ⚙️ Backend
| Tool | Description |
|---|---|
| Log Prettifier | Colorize and parse JSON logs and stack traces |
| NoSQL Viewer | Explore JSON documents like a NoSQL database viewer |
| Cron Parser | Parse cron expressions and preview next run times |

### 🔌 API
| Tool | Description |
|---|---|
| REST Client | Advanced REST client — send requests, manage collections |

### 🎲 Generator
| Tool | Description |
|---|---|
| QR & Barcode Generator | Generate QR codes, PDF417, Data Matrix, and 1D barcodes |
| UUID Generator | Generate random UUID v4 strings |
| Mock Data Generator | Generate fake names, emails, addresses, and more |
| Meta Tag Generator | Generate SEO, Open Graph, and Twitter Card meta tags |
| Lorem Ipsum | Generate placeholder lorem ipsum text |

---


## 📱 PWA / Offline Support

DevToolbox is a fully installable Progressive Web App. After the first visit:

- All assets are cached by the service worker
- The app works **completely offline**
- Updates are applied automatically in the background

To install: click the browser's **Install App** / **Add to Home Screen** prompt.

---

## 🔒 Privacy

- **Zero telemetry** — no analytics, no tracking
- **No backend** — all processing happens in your browser
- **No data transmission** — your code, passwords, images, and keys never leave your device

---

## 📄 License

Released under the [MIT License](LICENSE) — free to use, modify, and distribute.
