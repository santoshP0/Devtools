// Downloads the scrcpy server jar and the adb sidecar for THIS machine's target
// triple into src-tauri/binaries so `tauri dev`/`tauri build` can bundle them.
// The device does the H.264 encoding; the app only needs adb + the server jar.
//
//   scrcpy-server -> Genymobile/scrcpy release (Apache-2.0), pinned version
//   adb           -> Google platform-tools (Apache-2.0), per-platform
import { mkdirSync, existsSync, createWriteStream, chmodSync, copyFileSync, readdirSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const SCRCPY_VERSION = '2.4'
const dir = 'src-tauri/binaries'
mkdirSync(dir, { recursive: true })

async function download(url, dest) {
  console.log(`downloading ${url}`)
  const res = await fetch(url)
  if (!res.ok) { console.error(`download failed: ${res.status} ${res.statusText}`); process.exit(1) }
  await pipeline(Readable.fromWeb(res.body), createWriteStream(dest))
}

// ── scrcpy server jar (single file, bundled as a resource) ──
const jar = join(dir, 'scrcpy-server.jar')
if (existsSync(jar)) {
  console.log(`scrcpy server already present: ${jar}`)
} else {
  await download(
    `https://github.com/Genymobile/scrcpy/releases/download/v${SCRCPY_VERSION}/scrcpy-server-v${SCRCPY_VERSION}`,
    jar,
  )
  console.log(`saved ${jar}`)
}

// ── adb (sidecar, per target triple) ──
const ADB = {
  'darwin-arm64': { os: 'darwin', triple: 'adb-aarch64-apple-darwin' },
  'darwin-x64':   { os: 'darwin', triple: 'adb-x86_64-apple-darwin' },
  'linux-x64':    { os: 'linux',  triple: 'adb-x86_64-unknown-linux-gnu' },
  'win32-x64':    { os: 'windows', triple: 'adb-x86_64-pc-windows-msvc.exe' },
}
const key = `${process.platform}-${process.arch}`
const cfg = ADB[key]
if (!cfg) {
  console.error(`No adb mapping for ${key}. Add it to scripts/fetch-scrcpy.mjs.`)
  process.exit(1)
}
const adbOut = join(dir, cfg.triple)
if (existsSync(adbOut)) {
  console.log(`adb already present: ${adbOut}`)
  process.exit(0)
}

const work = join(tmpdir(), `pt-${Date.now()}`)
mkdirSync(work, { recursive: true })
const zip = join(work, 'platform-tools.zip')
await download(`https://dl.google.com/android/repository/platform-tools-latest-${cfg.os}.zip`, zip)

if (process.platform === 'win32') {
  execFileSync('tar', ['-xf', zip, '-C', work]) // bsdtar handles zip on Win 10+
} else {
  execFileSync('unzip', ['-o', '-q', zip, '-d', work])
}

const binName = cfg.os === 'windows' ? 'adb.exe' : 'adb'
copyFileSync(join(work, 'platform-tools', binName), adbOut)
if (cfg.os !== 'windows') chmodSync(adbOut, 0o755)
console.log(`saved ${adbOut}`)

// Windows adb needs its two API DLLs next to it — copy them alongside so the
// bundler picks them up.
if (cfg.os === 'windows') {
  for (const f of readdirSync(join(work, 'platform-tools'))) {
    if (f.endsWith('.dll')) copyFileSync(join(work, 'platform-tools', f), join(dir, f))
  }
}
