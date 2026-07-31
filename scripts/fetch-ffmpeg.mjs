// Downloads a static ffmpeg for THIS machine's target triple into
// src-tauri/binaries so `tauri dev`/`tauri build` can bundle it as a sidecar.
// CI does the same per-platform (see .github/workflows/desktop-release.yml).
//
// Redistributable GPL builds only (NOT the nonfree ffmpeg-static builds):
//   macOS      -> martin-riedl.de   (GPL v3)
//   Win/Linux  -> BtbN/FFmpeg-Builds (GPL)
import { mkdirSync, existsSync, createWriteStream, chmodSync, copyFileSync, rmSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

// process key -> { url, archive: 'zip'|'tarxz', inner: extracted path, triple }
const MAP = {
  'darwin-arm64': { url: 'https://ffmpeg.martin-riedl.de/redirect/latest/macos/arm64/release/ffmpeg.zip', archive: 'zip',   inner: 'ffmpeg', triple: 'ffmpeg-aarch64-apple-darwin' },
  'darwin-x64':   { url: 'https://ffmpeg.martin-riedl.de/redirect/latest/macos/amd64/release/ffmpeg.zip', archive: 'zip',   inner: 'ffmpeg', triple: 'ffmpeg-x86_64-apple-darwin' },
  'linux-x64':    { url: 'https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-linux64-gpl.tar.xz', archive: 'tarxz', inner: 'ffmpeg-master-latest-linux64-gpl/bin/ffmpeg', triple: 'ffmpeg-x86_64-unknown-linux-gnu' },
  'win32-x64':    { url: 'https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl.zip', archive: 'zip', inner: 'ffmpeg-master-latest-win64-gpl/bin/ffmpeg.exe', triple: 'ffmpeg-x86_64-pc-windows-msvc.exe' },
}

const key = `${process.platform}-${process.arch}`
const cfg = MAP[key]
if (!cfg) {
  console.error(`No static ffmpeg mapping for ${key}. Add it to scripts/fetch-ffmpeg.mjs.`)
  process.exit(1)
}
const dir = 'src-tauri/binaries'
const out = `${dir}/${cfg.triple}`
mkdirSync(dir, { recursive: true })
if (existsSync(out)) {
  console.log(`ffmpeg already present: ${out}`)
  process.exit(0)
}

const work = join(tmpdir(), `ff-${Date.now()}`)
mkdirSync(work, { recursive: true })
const archivePath = join(work, cfg.archive === 'zip' ? 'ff.zip' : 'ff.tar.xz')

console.log(`downloading ${cfg.url}`)
const res = await fetch(cfg.url)
if (!res.ok) { console.error(`download failed: ${res.status} ${res.statusText}`); process.exit(1) }
await pipeline(Readable.fromWeb(res.body), createWriteStream(archivePath))

// extract with system tools, no shell (unzip/tar exist on macOS & Linux; tar
// handles both .tar.xz and .zip via bsdtar on Windows 10+)
if (cfg.archive === 'zip' && process.platform !== 'win32') {
  execFileSync('unzip', ['-o', '-q', archivePath, '-d', work])
} else {
  execFileSync('tar', ['-xf', archivePath, '-C', work])
}

copyFileSync(join(work, cfg.inner), out)
if (process.platform !== 'win32') chmodSync(out, 0o755)
rmSync(work, { recursive: true, force: true })
console.log(`saved ${out}`)
