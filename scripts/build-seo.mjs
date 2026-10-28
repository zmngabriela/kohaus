import { readFile, writeFile } from 'node:fs/promises'
import { loadEnv } from 'vite'
import { canonicalUrl, LANGUAGES, SITE_URL } from '../src/lib/seo.js'
const env = {...loadEnv('production',process.cwd(),''),...process.env}
const origin = env.VITE_SITE_URL || SITE_URL
const production = env.VITE_APP_ENV === 'production'
const xml = value => value.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;')
const routes = ['home','about','contact','captacion','off-market','legal','privacy','cookies'].map(view=>({view}))
for (const operation of ['comprar','alquilar']) routes.push({view:'catalogo',operation,destination:'todos'})
if (production) {
 // Read only public identifiers and destinations. Never include private addresses or media tokens.
 const url = new URL('/rest/v1/public_properties',env.VITE_SUPABASE_URL)
 url.searchParams.set('select','id,destination,operation,off_market,status')
 const response = await fetch(url,{headers:{apikey:env.VITE_SUPABASE_PUBLISHABLE_KEY},signal:AbortSignal.timeout(15000)})
 if (!response.ok) throw new Error('Cannot generate the public sitemap: property API unavailable.')
 const properties = await response.json()
 for (const p of properties) {
  if (!p.off_market) routes.push({view:'anuncio',propertyId:p.id})
  if (!p.off_market && p.destination) routes.push({view:'catalogo',operation:p.operation,destination:p.destination})
 }
}
const urls = [...new Set(routes.flatMap(route=>LANGUAGES.map(language=>canonicalUrl({...route,language},origin))))]
await writeFile('dist/sitemap.xml',`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${production?urls.map(url=>`\n<url><loc>${xml(url)}</loc></url>`).join(''):''}\n</urlset>\n`)
const robots = production ? `${await readFile('public/robots.txt','utf8')}\nSitemap: ${new URL('/sitemap.xml',origin).href}\n` : 'User-agent: *\nDisallow: /\n'
await writeFile('dist/robots.txt',robots)
if (!production) await writeFile('dist/_headers',`${await readFile('dist/_headers','utf8')}\n/*\n  X-Robots-Tag: noindex, nofollow\n`)
console.log(`SEO: ${production ? urls.length : 0} sitemap URLs; ${production ? 'production' : 'preview blocked from indexing'}.`)
