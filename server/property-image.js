import { loadPublicRows } from './public-data.js'

// Resolve the current cover on each request; never cache an expiring signed URL in OG tags.
export function createPropertyImageHandler(config, loadRows = loadPublicRows) {
 return async ({ request }) => {
  if (!['GET', 'HEAD'].includes(request.method)) return new Response(null, {status:405, headers:{Allow:'GET, HEAD'}})
  const id = new URL(request.url).searchParams.get('id')
  if (!id || id.length > 200) return new Response(null, {status:400})
  try {
   const rows = await loadRows(config)
   const property = rows.find(row => row.id === id && !row.off_market && ['active','closed'].includes(row.status))
   const image = property?.photos?.[0]?.url
   const url = image ? new URL(image) : null
   if (!url || url.protocol !== 'https:' || url.username || url.password) return new Response(null, {status:404})
   return new Response(null, {status:302, headers:{Location:url.href, 'Cache-Control':'no-store', 'X-Content-Type-Options':'nosniff'}})
  } catch {
   return new Response(null, {status:503, headers:{'Retry-After':'60'}})
  }
 }
}
