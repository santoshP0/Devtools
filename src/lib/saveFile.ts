import { isTauri } from '@tauri-apps/api/core'

type Data = Blob | Uint8Array | ArrayBuffer | string

async function toBytes(data: Data): Promise<Uint8Array> {
  if (typeof data === 'string') return new TextEncoder().encode(data)
  if (data instanceof Uint8Array) return data
  if (data instanceof ArrayBuffer) return new Uint8Array(data)
  return new Uint8Array(await data.arrayBuffer()) // Blob
}

/**
 * Save data to disk. On desktop: a real native "Save As" dialog (pick the folder
 * + name), written via the save_bytes command. On web: the usual blob download.
 * Returns true if written, false if the user cancelled the dialog.
 */
export async function saveFile(defaultName: string, data: Data, mime = 'application/octet-stream'): Promise<boolean> {
  if (isTauri()) {
    const { save } = await import('@tauri-apps/plugin-dialog')
    const ext = defaultName.includes('.') ? defaultName.split('.').pop() : undefined
    const path = await save({
      defaultPath: defaultName,
      filters: ext ? [{ name: ext.toUpperCase(), extensions: [ext] }] : undefined,
    })
    if (!path) return false
    const { invoke } = await import('@tauri-apps/api/core')
    await invoke('save_bytes', { path, bytes: await toBytes(data) })
    return true
  }
  const blob = data instanceof Blob ? data : new Blob([(await toBytes(data)) as BlobPart], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = defaultName
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
  return true
}

/**
 * Save several files at once. On desktop: pick one folder, write them all.
 * On web: fall back to sequential downloads. Returns false if cancelled.
 */
export async function saveFilesToDir(files: { name: string; data: Data }[]): Promise<boolean> {
  if (isTauri()) {
    const { open } = await import('@tauri-apps/plugin-dialog')
    const dir = await open({ directory: true, multiple: false })
    if (typeof dir !== 'string') return false
    const { invoke } = await import('@tauri-apps/api/core')
    for (const f of files) await invoke('save_bytes', { path: `${dir}/${f.name}`, bytes: await toBytes(f.data) })
    return true
  }
  for (const f of files) {
    const blob = f.data instanceof Blob ? f.data : new Blob([(await toBytes(f.data)) as BlobPart])
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = f.name
    a.click()
    await new Promise(r => setTimeout(r, 120))
    URL.revokeObjectURL(url)
  }
  return true
}

/** Fetch a data:/blob: URL into a Blob — handy for canvas.toDataURL() outputs. */
export async function urlToBlob(url: string): Promise<Blob> {
  return (await fetch(url)).blob()
}
