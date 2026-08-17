// Desktop auto-update via the Tauri updater plugin. All no-ops in the browser
// (dynamic imports keep the Tauri APIs out of the web bundle).

export const inDesktopApp = '__TAURI_INTERNALS__' in window

const REPO = 'santoshP0/Devtools'
export const RELEASES_URL = `https://github.com/${REPO}/releases/latest`

export interface AvailableUpdate {
  version: string
  currentVersion: string
  notes?: string
  /**
   * Download + install. onProgress gets 0..1. Pass relaunchAfter=false to stage
   * the update without restarting, so a background auto-update never interrupts
   * whatever the user is in the middle of. Undefined when the release ships
   * without updater artifacts — then the user downloads manually.
   */
  install?: (onProgress?: (fraction: number) => void, relaunchAfter?: boolean) => Promise<void>
}

/** Restart into the version that was just installed. */
export async function relaunchApp(): Promise<void> {
  const { relaunch } = await import('@tauri-apps/plugin-process')
  await relaunch()
}

/** true when a > b, comparing dotted numeric versions (1.10.0 > 1.9.0). */
function isNewer(a: string, b: string): boolean {
  const pa = a.replace(/^v/, '').split('.').map(Number)
  const pb = b.replace(/^v/, '').split('.').map(Number)
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const x = pa[i] ?? 0, y = pb[i] ?? 0
    if (x !== y) return x > y
  }
  return false
}

/**
 * Ask GitHub what the newest published release is.
 *
 * The updater plugin only works when the release carries a signed `latest.json`
 * (createUpdaterArtifacts). While that's off, `check()` 404s and the app would
 * claim it's up to date even with a newer version out — so fall back to the
 * Releases API and at least tell the user, with a manual download link.
 */
async function checkGitHub(): Promise<AvailableUpdate | null> {
  const current = await appVersion()
  const res = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`, {
    headers: { Accept: 'application/vnd.github+json' },
  })
  if (!res.ok) return null
  const rel = await res.json() as { tag_name?: string; body?: string; draft?: boolean; prerelease?: boolean }
  if (!rel.tag_name || rel.draft || rel.prerelease) return null
  const latest = rel.tag_name.replace(/^v/, '')
  if (!isNewer(latest, current)) return null
  return { version: latest, currentVersion: current, notes: rel.body }
}

/** Returns update info if a newer version is published, else null. */
export async function checkForUpdate(): Promise<AvailableUpdate | null> {
  if (!inDesktopApp) return null
  try {
    const { check } = await import('@tauri-apps/plugin-updater')
    const update = await check()
    if (!update) return await checkGitHub() // no manifest → ask GitHub directly
    return {
      version: update.version,
      currentVersion: update.currentVersion,
      notes: update.body,
      install: async (onProgress, relaunchAfter = true) => {
        let total = 0
        let got = 0
        await update.downloadAndInstall(e => {
          if (e.event === 'Started') total = e.data.contentLength ?? 0
          else if (e.event === 'Progress') { got += e.data.chunkLength; if (total) onProgress?.(got / total) }
          else if (e.event === 'Finished') onProgress?.(1)
        })
        if (relaunchAfter) await relaunchApp()
      },
    }
  } catch {
    // The plugin throws when the endpoint 404s (no signed manifest published),
    // which is not the same as "up to date" — check GitHub before giving up.
    try {
      return await checkGitHub()
    } catch {
      return null // genuinely offline
    }
  }
}

/** Current app version. Uses the Tauri API in-app, package.json on the web. */
export async function appVersion(): Promise<string> {
  if (inDesktopApp) {
    try {
      const { getVersion } = await import('@tauri-apps/api/app')
      return await getVersion()
    } catch {
      /* fall through */
    }
  }
  const pkg = await import('../../package.json')
  return (pkg as { version: string }).version
}
