// Regenerate public/sitemap.xml from the tool list.
// Run: npm run sitemap   (also runs automatically before build)
import { readFileSync, writeFileSync } from 'node:fs'

const SITE = process.env.SITE_URL || 'https://devtools-9fsp.onrender.com'

// One tool per line; skip desktop-only tools (they only render a download stub on web)
const src = readFileSync(new URL('../src/lib/tools.ts', import.meta.url), 'utf8')
const slugs = src.split('\n')
  .filter(line => line.includes('slug:') && !line.includes('desktopOnly'))
  .map(line => line.match(/slug:\s*'([^']+)'/)?.[1])
  .filter(Boolean)
const today = new Date().toISOString().slice(0, 10)

const urls = ['', ...slugs].map(slug => {
  const loc = slug ? `${SITE}/${slug}` : SITE + '/'
  return `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>${slug ? '0.8' : '1.0'}</priority>\n  </url>`
}).join('\n')

writeFileSync(
  new URL('../public/sitemap.xml', import.meta.url),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`
)

console.log(`sitemap.xml: ${slugs.length + 1} urls`)
