/**
 * File validation helpers across DevToolbox.
 * Prevents tools from accepting unreadable binary blobs like .dmg, .mp4, .mp3 in text editors,
 * or non-images in image tools.
 */

export const BINARY_EXTENSIONS = new Set([
  'dmg', 'iso', 'pkg', 'deb', 'rpm', 'app', 'exe', 'msi', 'bin', 'dll', 'so', 'dylib',
  'zip', 'tar', 'gz', 'bz2', '7z', 'rar', 'xz', 'tgz', 'sitx', 'cab',
  'mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac', 'wma', 'opus', 'aiff', 'mid', 'midi',
  'mp4', 'mov', 'mkv', 'webm', 'avi', 'm4v', 'flv', 'wmv', '3gp', 'ts', 'mpg', 'mpeg',
  'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'odt', 'ods', 'odp', 'pages', 'numbers', 'key',
  'png', 'jpg', 'jpeg', 'webp', 'gif', 'avif', 'heic', 'heif', 'tiff', 'tif', 'bmp', 'ico', 'psd',
  'wasm', 'class', 'pyc', 'o', 'obj', 'db', 'sqlite', 'sqlite3',
])

export const TEXT_EXTENSIONS = new Set([
  'txt', 'text', 'md', 'markdown', 'mdx', 'json', 'csv', 'tsv', 'yaml', 'yml', 'toml',
  'xml', 'sql', 'html', 'htm', 'xhtml', 'css', 'scss', 'sass', 'less',
  'js', 'jsx', 'ts', 'tsx', 'mjs', 'cjs',
  'py', 'rs', 'go', 'java', 'c', 'cpp', 'cc', 'cxx', 'h', 'hpp', 'cs', 'rb', 'php',
  'swift', 'kt', 'kts', 'sh', 'bash', 'zsh', 'fish', 'env', 'log', 'svg', 'graphql',
  'gql', 'diff', 'patch', 'ini', 'conf', 'config', 'properties', 'proto', 'vue', 'svelte',
])

export const IMAGE_EXTENSIONS = new Set([
  'png', 'jpg', 'jpeg', 'webp', 'gif', 'avif', 'heic', 'heif', 'tiff', 'tif', 'bmp', 'svg', 'ico',
])

export const VIDEO_EXTENSIONS = new Set([
  'mp4', 'mov', 'mkv', 'webm', 'avi', 'm4v', 'flv', 'wmv', '3gp', 'ts',
])

export const AUDIO_EXTENSIONS = new Set([
  'mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac', 'wma', 'opus', 'aiff',
])

export const EXIF_EXTENSIONS = new Set([
  'jpg', 'jpeg', 'png', 'heic', 'heif', 'tiff', 'tif', 'webp', 'avif', 'dng', 'cr2', 'nef', 'arw',
])

export const JSON_EXTENSIONS = new Set(['json'])
export const CSV_EXTENSIONS = new Set(['csv', 'tsv', 'tab', 'txt'])
export const YAML_EXTENSIONS = new Set(['yaml', 'yml', 'json', 'txt'])
export const TOML_EXTENSIONS = new Set(['toml', 'json', 'txt'])
export const SQL_EXTENSIONS = new Set(['sql', 'txt'])
export const MARKDOWN_EXTENSIONS = new Set(['md', 'markdown', 'mdx', 'txt'])
export const HTML_EXTENSIONS = new Set(['html', 'htm', 'xhtml', 'txt'])
export const SVG_EXTENSIONS = new Set(['svg'])

export function getFileExt(fileOrPath: File | string): string {
  const name = typeof fileOrPath === 'string' ? fileOrPath : fileOrPath.name
  return (name.split('.').pop() || '').toLowerCase()
}

export function isTextFile(fileOrPath: File | string): boolean {
  const ext = getFileExt(fileOrPath)
  if (BINARY_EXTENSIONS.has(ext)) return false
  if (TEXT_EXTENSIONS.has(ext)) return true

  if (typeof fileOrPath !== 'string') {
    if (fileOrPath.type && fileOrPath.type.startsWith('text/')) return true
    if (fileOrPath.type && (fileOrPath.type.includes('json') || fileOrPath.type.includes('xml'))) return true
    if (fileOrPath.type && (fileOrPath.type.startsWith('image/') || fileOrPath.type.startsWith('video/') || fileOrPath.type.startsWith('audio/'))) {
      return false
    }
  }

  return !BINARY_EXTENSIONS.has(ext)
}

export function isImageFile(fileOrPath: File | string): boolean {
  const ext = getFileExt(fileOrPath)
  if (IMAGE_EXTENSIONS.has(ext)) return true
  if (typeof fileOrPath !== 'string' && fileOrPath.type) {
    return fileOrPath.type.startsWith('image/')
  }
  return false
}

export function isVideoFile(fileOrPath: File | string): boolean {
  const ext = getFileExt(fileOrPath)
  if (VIDEO_EXTENSIONS.has(ext)) return true
  if (typeof fileOrPath !== 'string' && fileOrPath.type) {
    return fileOrPath.type.startsWith('video/')
  }
  return false
}

export function isAudioFile(fileOrPath: File | string): boolean {
  const ext = getFileExt(fileOrPath)
  if (AUDIO_EXTENSIONS.has(ext)) return true
  if (typeof fileOrPath !== 'string' && fileOrPath.type) {
    return fileOrPath.type.startsWith('audio/')
  }
  return false
}

export function isMediaFile(fileOrPath: File | string): boolean {
  return isVideoFile(fileOrPath) || isAudioFile(fileOrPath) || isImageFile(fileOrPath)
}

export function isJsonFile(fileOrPath: File | string): boolean {
  const ext = getFileExt(fileOrPath)
  if (JSON_EXTENSIONS.has(ext)) return true
  if (typeof fileOrPath !== 'string' && fileOrPath.type) {
    return fileOrPath.type === 'application/json' || fileOrPath.type.endsWith('+json')
  }
  return false
}

export function isCsvFile(fileOrPath: File | string): boolean {
  const ext = getFileExt(fileOrPath)
  if (CSV_EXTENSIONS.has(ext)) return true
  if (typeof fileOrPath !== 'string' && fileOrPath.type) {
    return fileOrPath.type.includes('csv') || fileOrPath.type.includes('tab-separated')
  }
  return false
}

export function isMarkdownFile(fileOrPath: File | string): boolean {
  const ext = getFileExt(fileOrPath)
  if (MARKDOWN_EXTENSIONS.has(ext)) return true
  if (typeof fileOrPath !== 'string' && fileOrPath.type) {
    return fileOrPath.type.includes('markdown')
  }
  return false
}

export function isYamlFile(fileOrPath: File | string): boolean {
  const ext = getFileExt(fileOrPath)
  if (YAML_EXTENSIONS.has(ext)) return true
  if (typeof fileOrPath !== 'string' && fileOrPath.type) {
    return fileOrPath.type.includes('yaml')
  }
  return false
}

export function isTomlFile(fileOrPath: File | string): boolean {
  const ext = getFileExt(fileOrPath)
  return TOML_EXTENSIONS.has(ext)
}

export function isSqlFile(fileOrPath: File | string): boolean {
  const ext = getFileExt(fileOrPath)
  if (SQL_EXTENSIONS.has(ext)) return true
  if (typeof fileOrPath !== 'string' && fileOrPath.type) {
    return fileOrPath.type.includes('sql')
  }
  return false
}

export function isHtmlFile(fileOrPath: File | string): boolean {
  const ext = getFileExt(fileOrPath)
  if (HTML_EXTENSIONS.has(ext)) return true
  if (typeof fileOrPath !== 'string' && fileOrPath.type) {
    return fileOrPath.type.includes('html')
  }
  return false
}

export function isSvgFile(fileOrPath: File | string): boolean {
  const ext = getFileExt(fileOrPath)
  if (SVG_EXTENSIONS.has(ext)) return true
  if (typeof fileOrPath !== 'string' && fileOrPath.type) {
    return fileOrPath.type === 'image/svg+xml'
  }
  return false
}

export function isExifSupportedFile(fileOrPath: File | string): boolean {
  const ext = getFileExt(fileOrPath)
  if (EXIF_EXTENSIONS.has(ext)) return true
  if (typeof fileOrPath !== 'string' && fileOrPath.type) {
    return fileOrPath.type.startsWith('image/')
  }
  return false
}

export const ACCEPT_TEXT = '.txt,.text,.md,.markdown,.mdx,.json,.csv,.tsv,.yaml,.yml,.toml,.xml,.sql,.html,.css,.js,.jsx,.ts,.tsx,.py,.rs,.go,.java,.c,.cpp,.h,.sh,.log,text/*'
export const ACCEPT_IMAGE = 'image/*,.png,.jpg,.jpeg,.webp,.gif,.svg,.ico,.heic,.avif,.bmp,.tiff'
export const ACCEPT_VIDEO = 'video/*,.mp4,.mov,.mkv,.webm,.avi,.m4v,.flv,.wmv,.3gp,.ts'
export const ACCEPT_MEDIA = 'video/*,audio/*,image/*,.mp4,.mov,.mkv,.webm,.avi,.m4v,.mp3,.wav,.ogg,.m4a,.flac,.png,.jpg,.jpeg,.webp,.gif'
export const ACCEPT_JSON = '.json,application/json,text/plain'
export const ACCEPT_CSV = '.csv,.tsv,.txt,text/csv,text/tab-separated-values,text/plain'
export const ACCEPT_MARKDOWN = '.md,.markdown,.mdx,.txt,text/markdown,text/plain'
export const ACCEPT_YAML = '.yaml,.yml,.json,text/yaml,text/plain'
export const ACCEPT_TOML = '.toml,.json,text/plain'
export const ACCEPT_SQL = '.sql,.txt,text/plain'
export const ACCEPT_HTML = '.html,.htm,text/html,text/plain'
export const ACCEPT_SVG = '.svg,image/svg+xml'
export const ACCEPT_EXIF = 'image/*,.jpg,.jpeg,.png,.heic,.heif,.tiff,.tif,.webp,.avif,.dng,.cr2,.nef,.arw'
