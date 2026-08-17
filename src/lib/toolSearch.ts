import type { Tool } from './tools'

/**
 * Ranked tool search shared by the home grid and the command palette.
 *
 * Two things the plain `includes()` filter got wrong:
 *  • no relevance — typing "md" matched Hash Generator (via "md5") and buried
 *    Markdown Preview, because results came out in declaration order.
 *  • no concept knowledge — typing a file extension like "png" found only tools
 *    that happen to spell "png", not the image tools you actually wanted.
 *
 * So each token is scored (exact name beats keyword beats description) and
 * expanded through ALIASES, with alias hits scored lower than direct ones.
 */
const ALIASES: Record<string, string[]> = {
  // images
  png: ['img', 'image'], jpg: ['img', 'image'], jpeg: ['img', 'image'], webp: ['img', 'image'],
  gif: ['img', 'image'], bmp: ['img', 'image'], heic: ['img', 'image'], heif: ['img', 'image'],
  tiff: ['img', 'image'], avif: ['img', 'image'], ico: ['img', 'icon'], svg: ['img', 'image', 'svg'],
  image: ['img'], picture: ['img', 'image'], photo: ['img', 'image'], screenshot: ['img', 'image'],
  // documents / data
  md: ['markdown'], markdown: ['md'], readme: ['markdown'],
  csv: ['csv', 'table'], tsv: ['csv'], xlsx: ['csv', 'table'], excel: ['csv', 'table'], spreadsheet: ['csv', 'table'],
  yml: ['yaml'], yaml: ['yml'], toml: ['toml'], xml: ['xml'], json: ['json'],
  log: ['log'], txt: ['text'], sql: ['sql', 'database'], db: ['database', 'sql'],
  // media
  mp4: ['video'], mov: ['video'], mkv: ['video'], webm: ['video'], avi: ['video'],
  video: ['video', 'ffmpeg'], audio: ['audio', 'media'], mp3: ['audio'], wav: ['audio'],
  // concepts
  color: ['color', 'hex', 'rgb'], hex: ['color'], password: ['password', 'random'],
  hash: ['hash', 'sha', 'md5'], jwt: ['jwt', 'token'], regex: ['regex', 'pattern'],
  time: ['time', 'date'], date: ['date', 'time'], api: ['api', 'http', 'rest'],
  http: ['api', 'rest'], curl: ['http', 'api'], css: ['css'], encode: ['encode'], decode: ['decode'],
}

function scoreToken(t: Tool, token: string, weight: number): number {
  const name = t.name.toLowerCase()
  if (name === token) return 1000 * weight
  if (name.startsWith(token)) return 500 * weight
  // a word inside the name starting with the token ("mark" → "Markdown Preview")
  if (name.split(/[\s→&/-]+/).some(w => w.startsWith(token))) return 400 * weight
  if (name.includes(token)) return 250 * weight

  const kws = t.keywords ?? []
  if (kws.some(k => k === token)) return 220 * weight
  if (kws.some(k => k.startsWith(token))) return 120 * weight

  const cat = t.category.toLowerCase()
  if (cat === token || cat.startsWith(token)) return 90 * weight

  if (kws.some(k => k.includes(token))) return 50 * weight
  if (t.description.toLowerCase().includes(token)) return 35 * weight
  return 0
}

/** Score one tool against the whole query. 0 means "no match". */
function scoreTool(t: Tool, tokens: string[]): number {
  let total = 0
  for (const token of tokens) {
    // direct match, else the best alias match (worth less than a direct hit)
    let best = scoreToken(t, token, 1)
    if (best === 0) {
      // 0.3 keeps the strongest alias hit (a name match, 500) below the weakest
      // direct keyword hit (220) — "png" must rank Image Converter above a tool
      // merely named "Image → Base64".
      for (const alias of ALIASES[token] ?? []) {
        best = Math.max(best, scoreToken(t, alias, 0.3))
      }
    }
    if (best === 0) return 0 // every token must match something
    total += best
  }
  return total
}

/** Tools matching `query`, most relevant first. Empty query → original order. */
export function searchTools(tools: Tool[], query: string): Tool[] {
  const tokens = query.toLowerCase().split(/\s+/).filter(Boolean)
  if (tokens.length === 0) return tools
  return tools
    .map((t, i) => ({ t, i, s: scoreTool(t, tokens) }))
    .filter(x => x.s > 0)
    .sort((a, b) => b.s - a.s || a.i - b.i) // stable: ties keep declaration order
    .map(x => x.t)
}
