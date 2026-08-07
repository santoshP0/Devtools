# DevToolbox 🧰

> A fast, privacy-first collection of **63 developer tools that run entirely in your browser** — plus a **desktop app** with 2 exclusive FFmpeg-powered tools. No sign-up, no uploads, no tracking. Everything is processed on your own machine.

**[⬇ Download the desktop app](https://github.com/santoshP0/Devtools/releases/latest)** · macOS · Windows · Linux

---

## ✨ Highlights

- ⚡ **Instant** — Vite-powered SPA, sub-second navigation, lazy-loaded editors
- 🔒 **Private** — 100% client-side; your data never leaves your device
- 📦 **Offline-first** — Installable PWA with full service-worker caching
- 🌗 **Dark / Light** — Persisted theme, synced to the desktop titlebar
- 🔍 **Command Palette** — `⌘K` / `Ctrl+K` fuzzy search across every tool
- 🎚️ **Quick switcher** — Hover the edge tab to scrub through all tools
- 🖥️ **Desktop app** — Native window with FFmpeg-grade media tools and a CORS-free REST client

---

## 🖥️ Web vs. Desktop — what's different?

Everything on the website also works in the desktop app. The desktop app adds native capabilities the browser sandbox can't provide:

| | Web (browser) | Desktop app |
|---|:---:|:---:|
| 63 core tools | ✅ | ✅ |
| Offline / PWA install | ✅ | ✅ (native window) |
| **Media Compressor** — FFmpeg-grade image & video compression | — | ✅ **exclusive** |
| **Video → GIF** — trim a clip, export an optimized GIF | — | ✅ **exclusive** |
| **Screen Mirror** — mirror & control an Android device over USB | — | ✅ **exclusive** |
| **REST Client** — send requests to *any* endpoint | CORS-limited | ✅ **no CORS** (native networking) |
| **Image Converter** — HEIC/HEIF (iPhone) input | ✅ | ✅ |

The two FFmpeg-powered tools (**Media Compressor**, **Video → GIF**) require [FFmpeg](https://ffmpeg.org/) on your `PATH` — e.g. `brew install ffmpeg` on macOS. They are hidden from the website and only appear inside the desktop app.

> All desktop media processing is done locally through a hardened Rust bridge: options are strictly bounded and every FFmpeg argument is constructed in Rust, so there is no command-injection surface.

**Screen Mirror** uses [scrcpy](https://github.com/Genymobile/scrcpy)'s device server and Android `adb` (both Apache-2.0), bundled with the desktop app. The phone hardware-encodes its screen to H.264 and streams it over USB; the app remuxes and plays it, and sends touch/keyboard input back — all driven from Rust with the same bounded-argument discipline (the target device must be an authorized, connected `adb` device). Enable **USB debugging** on the phone and connect it over USB.

---

## 🚀 Getting started

### Prerequisites
- [Node.js](https://nodejs.org) ≥ 18
- For the desktop app: [Rust](https://rustup.rs/) toolchain (Tauri v2)

### Web app

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # production build → dist/
```

### Desktop app (Tauri)

```bash
npm run tauri dev      # run the native app in dev
npm run tauri build    # build installers for the current OS
```

Installers for all platforms are also published automatically on every tagged release — see **[Releases](https://github.com/santoshP0/Devtools/releases)**.

---

## 🧩 Tools reference

### 📊 Data (12)
| Tool | Description |
|---|---|
| JSON Formatter | Format, validate, and minify JSON (Monaco, precise error locations) |
| Base64 | Encode / decode Base64 strings and files |
| JWT Decoder | Decode and inspect JWT tokens |
| URL Encoder | Encode and decode URL components |
| YAML ↔ JSON | Convert between YAML and JSON — great for K8s & CI/CD |
| JSON → TypeScript | Generate TypeScript interfaces from any JSON object |
| CSV ↔ JSON | Convert between CSV and JSON formats |
| CSV Viewer | Open large CSV files with virtual scrolling & sortable columns |
| SQL Formatter | Beautify and indent SQL queries instantly |
| JSON ↔ XML | Convert between JSON and XML formats |
| TOML ↔ JSON | Convert between TOML config files and JSON |
| JSON Path Tester | Query JSON data using JSONPath expressions |

### 📝 Text (8)
| Tool | Description |
|---|---|
| Regex Tester | Test regular expressions with live match highlighting |
| Diff Checker | Compare two texts side-by-side (Monaco diff, word wrap) |
| Markdown Preview | Live Markdown editor with rendered preview & Mermaid diagrams |
| Text Case | Convert between camelCase, snake_case, PascalCase, and more |
| HTML Entities | Encode and decode HTML entities |
| Line Sorter | Sort, deduplicate, and shuffle lines of text |
| Word Counter | Count words, characters, and reading time |
| Slugify | Convert text to URL-friendly slugs |

### 🔧 Utils (10)
| Tool | Description |
|---|---|
| Unix Timestamp | Convert between Unix timestamps and human-readable dates |
| JavaScript Sandbox | Lightweight JS playground with live console output |
| Notes | Persistent multi-note scratchpad (localStorage) |
| Curl Builder | Build and export curl commands from a visual form |
| Number Base | Convert between decimal, hex, binary, and octal |
| HTTP Status Codes | Searchable reference for all HTTP 1xx–5xx status codes |
| Semver Checker | Parse npm semantic version ranges and check compatibility |
| Timezone Converter | Compare the current time across multiple timezones |
| Pomodoro Timer | Timed work / break intervals to stay focused |
| Text ↔ Binary/Hex | Encode text to binary, hex, octal, or decimal bytes |

### 🎨 Design (9)
| Tool | Description |
|---|---|
| Color Converter | Convert between HEX, RGB, HSL, and OKLCH |
| Gradient Builder | Visual CSS gradient editor with live preview |
| Color Contrast | WCAG AA/AAA contrast ratio checker |
| Color Palette | Generate complementary, triadic, and analogous palettes |
| Box Shadow Builder | Visual multi-layer CSS box-shadow generator |
| Glassmorphism | Design modern glassmorphism UI elements |
| CSS Unit Converter | Convert px, em, rem, vw, vh, pt — all synced live |
| Color Blind Simulator | Simulate images under different color-vision deficiencies |
| Dark/Light Converter | Convert images between dark and light mode |

### 🖼️ Media (8 · 2 desktop-exclusive)
| Tool | Description |
|---|---|
| Image Compressor | Compress images in-browser, no upload needed |
| Image Converter | Convert PNG / JPEG / WebP — and decode **HEIC/HEIF** from iPhone |
| EXIF Viewer | Extract camera, GPS, and timestamp metadata from JPEGs |
| BlurHash Generator | Generate and decode BlurHash placeholder strings |
| Image → Base64 | Convert images to Base64 data URIs |
| Base64 → Image | Decode Base64 strings back to images |
| **Media Compressor** 🖥️ | FFmpeg-grade image & video compression — **desktop only** |
| **Video → GIF** 🖥️ | Trim a video clip and export an optimized GIF — **desktop only** |
| **Screen Mirror** 🖥️ | Mirror and control an Android device over USB — **desktop only** |

### 🔐 Security (3)
| Tool | Description |
|---|---|
| Hash Generator | Generate SHA-1, SHA-256, SHA-512 cryptographic hashes |
| Password Generator | Generate strong, secure random passwords (Web Crypto) |
| JWT Generator | Sign and generate JWT tokens (HS256, RS256, etc.) |

### 🖥️ Frontend (7)
| Tool | Description |
|---|---|
| SVG Preview | Preview SVG files, remove bloat, and export optimized code |
| Responsive Tester | Preview any URL at common device breakpoints |
| Flexbox Playground | Visually explore CSS flexbox properties |
| Grid Playground | Build CSS Grid layouts visually |
| Favicon Generator | Create favicons from text or emoji in all required sizes |
| Keyframe Builder | Visually build CSS `@keyframes` animations |
| HTML Preview | Live HTML + CSS + JS editor with sandboxed preview |

### 🎲 Generator (4)
| Tool | Description |
|---|---|
| QR & Barcode Generator | Generate QR codes, PDF417, Data Matrix, and 1D barcodes |
| UUID Generator | Generate random UUID v4 strings |
| Meta Tag Generator | Generate SEO, Open Graph, and Twitter Card meta tags |
| Lorem Ipsum | Generate placeholder lorem ipsum text |

### ⚙️ Backend (3)
| Tool | Description |
|---|---|
| Log Prettifier | Colorize and parse JSON logs and stack traces |
| NoSQL Viewer | Explore JSON documents like a NoSQL database viewer |
| Cron Parser | Parse cron expressions and preview next run times |

### 🔌 API (1)
| Tool | Description |
|---|---|
| REST Client | Send requests, inspect responses — **CORS-free in the desktop app** |

---

## 🛠️ Tech stack

- **React 18** + **TypeScript** + **Vite 5** + **React Router 6**
- **Monaco Editor** for the code/diff tools, **Motion** for animations
- **Tauri v2** (Rust) for the desktop app; native FFmpeg + `reqwest` bridges
- **vite-plugin-pwa** for offline / installable PWA

## 📱 PWA / Offline

DevToolbox is a fully installable Progressive Web App. After the first visit all assets are cached, the app works completely offline, and updates apply automatically in the background. Install via your browser's **Install App** / **Add to Home Screen** prompt.

## 🔒 Privacy

- **No backend** — all processing happens on your device
- **No data transmission** — your code, passwords, images, and keys never leave your machine
- The only outbound requests are ones **you** make in the REST Client, or fetching the latest release list for the download button

## 📄 License

Released under the [MIT License](LICENSE) — free to use, modify, and distribute.
