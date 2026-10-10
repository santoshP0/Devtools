import { isTauri } from '@tauri-apps/api/core'
import {
  TEXT_EXTENSIONS,
  IMAGE_EXTENSIONS,
  VIDEO_EXTENSIONS,
  EXIF_EXTENSIONS,
  CSV_EXTENSIONS,
  JSON_EXTENSIONS,
  YAML_EXTENSIONS,
  TOML_EXTENSIONS,
  MARKDOWN_EXTENSIONS,
  SQL_EXTENSIONS,
  HTML_EXTENSIONS,
  SVG_EXTENSIONS,
} from './fileValidation'

export {
  TEXT_EXTENSIONS,
  IMAGE_EXTENSIONS,
  VIDEO_EXTENSIONS,
  EXIF_EXTENSIONS,
  CSV_EXTENSIONS,
  JSON_EXTENSIONS,
  YAML_EXTENSIONS,
  TOML_EXTENSIONS,
  MARKDOWN_EXTENSIONS,
  SQL_EXTENSIONS,
  HTML_EXTENSIONS,
  SVG_EXTENSIONS,
}

export interface PickFileOptions {
  title?: string
  filterName?: string
  extensions?: string[] | Set<string>
}

export interface PickedResult {
  path: string
  name: string
  text: string
  buffer: ArrayBuffer
  file: File
}

/**
 * Opens native OS file picker (via @tauri-apps/plugin-dialog) with strictly enforced
 * extension filters. In macOS / Windows, unsupported files (e.g. .dmg, .mp4, .mp3 in text tools)
 * are completely disabled/greyed out in the file dialog.
 *
 * Returns null if user cancelled or if not running in Tauri (allowing web fallback).
 */
export async function pickNativeFile(options: PickFileOptions = {}): Promise<PickedResult | null> {
  if (!isTauri()) return null

  try {
    const { open } = await import('@tauri-apps/plugin-dialog')
    const exts = options.extensions
      ? Array.isArray(options.extensions)
        ? options.extensions
        : Array.from(options.extensions)
      : Array.from(TEXT_EXTENSIONS)

    const selected = await open({
      title: options.title,
      multiple: false,
      filters: [{
        name: options.filterName || 'Supported Files',
        extensions: exts,
      }],
    })

    if (!selected || typeof selected !== 'string') return null

    const name = selected.split(/[/\\]/).pop() || 'file'
    const { invoke } = await import('@tauri-apps/api/core')
    const buf = await invoke<ArrayBuffer>('read_file', { path: selected })
    const text = buf ? new TextDecoder('utf-8').decode(buf) : ''
    const file = new File(buf ? [buf as BlobPart] : [], name)

    return { path: selected, name, text, buffer: buf, file }
  } catch (err) {
    console.error('pickNativeFile failed:', err)
    return null
  }
}
