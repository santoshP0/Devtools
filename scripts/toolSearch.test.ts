/**
 * Ranking check for searchTools — run with `npm run test:search`.
 *
 * No framework on purpose: this locks the handful of rankings that actually
 * broke before (typing "md" surfaced Hash Generator, not Markdown Preview) so
 * editing a tool's keywords can't silently regress them again.
 */
import assert from 'node:assert/strict'
import { tools } from '../src/lib/tools'
import { searchTools } from '../src/lib/toolSearch'

const top = (q: string, n = 1) => searchTools(tools, q).slice(0, n).map(t => t.name)
const ranks = (q: string, name: string) => searchTools(tools, q).findIndex(t => t.name === name)

// the original bug: "md" must lead with Markdown Preview, not Hash Generator ("md5")
assert.deepEqual(top('md'), ['Markdown Preview'])
assert.deepEqual(top('markdown'), ['Markdown Preview'])

// a file extension finds the tools that handle that kind of file
assert.deepEqual(top('png'), ['Image Compressor'])
assert.ok(ranks('png', 'Image Converter') <= 1, 'Image Converter must rank top-2 for "png"')
assert.ok(ranks('heic', 'Image Converter') === 0, 'HEIC is Image Converter territory')
assert.ok(ranks('xlsx', 'CSV Viewer') >= 0, 'spreadsheet aliases reach the CSV tools')

// a direct keyword hit always beats an alias hit on another tool's name
assert.ok(
  ranks('png', 'Image Converter') < ranks('png', 'Image → Base64'),
  'direct keyword match must outrank an alias name match',
)

// exact names win outright
assert.deepEqual(top('qr'), ['QR & Barcode Generator'])
assert.deepEqual(top('yaml'), ['YAML ↔ JSON'])
assert.deepEqual(top('sql'), ['SQL Formatter'])

// every token must match something → nonsense returns nothing
assert.equal(searchTools(tools, 'zzzz').length, 0)
assert.equal(searchTools(tools, 'json zzzz').length, 0)

// multi-word queries narrow rather than widen
assert.deepEqual(top('json format'), ['JSON Formatter'])

// empty query leaves the list untouched
assert.equal(searchTools(tools, '').length, tools.length)

console.log('toolSearch: all ranking checks passed')
