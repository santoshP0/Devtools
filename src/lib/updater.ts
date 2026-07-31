// Desktop auto-update via the Tauri updater plugin. All no-ops in the browser
// (dynamic imports keep the Tauri APIs out of the web bundle).

export const inDesktopApp = '__TAURI_INTERNALS__' in window

export interface AvailableUpdate {
  version: string
  currentVersion: string
  notes?: string
  /** download + install, then relaunch. onProgress gets 0..1. */
  install: (onProgress?: (fraction: number) => void) => Promise<void>
}

/** Returns update info if a newer version is published, else null. */
export async function checkForUpdate(): Promise<AvailableUpdate | null> {
  if (!inDesktopApp) return null
  try {
    const { check } = await import('@tauri-apps/plugin-updater')
    const update = await check()
    if (!update) return null
    return {
      version: update.version,
      currentVersion: update.currentVersion,
      notes: update.body,
      install: async (onProgress) => {
        let total = 0
        let got = 0
        await update.downloadAndInstall(e => {
          if (e.event === 'Started') total = e.data.contentLength ?? 0
          else if (e.event === 'Progress') { got += e.data.chunkLength; if (total) onProgress?.(got / total) }
          else if (e.event === 'Finished') onProgress?.(1)
        })
        const { relaunch } = await import('@tauri-apps/plugin-process')
        await relaunch()
      },
    }
  } catch {
    // offline, no endpoint yet, or not in a window — just skip
    return null
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
