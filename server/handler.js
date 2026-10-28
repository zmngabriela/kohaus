import { loadPublicRows } from './public-data.js'

export function createPageHandler({renderPage,requestRoute,publicViews,serverConfig,securityHeaders}) {
 return async function onRequest(context) {
  const {request,next,waitUntil} = context
  const route = requestRoute(request.url,request.headers.get('Accept-Language') || '')
  if (!['GET','HEAD'].includes(request.method)) return new Response(null,{status:405,headers:{...securityHeaders,Allow:'GET, HEAD'}})
  if (!publicViews.includes(route.view)) {
   const shell = await next()
   const response = new Response(request.method==='HEAD'?null:shell.body, {status:shell.status,headers:{...Object.fromEntries(shell.headers),...securityHeaders,'Cache-Control':'no-store','X-Robots-Tag':'noindex, nofollow'}})
   return response
  }
  const headers = {...securityHeaders,'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','Vary':'Accept-Language'}
  if (!serverConfig.production) headers['X-Robots-Tag']='noindex, nofollow'
  try {
   let rows=[]
   if (['home','catalogo','off-market','anuncio'].includes(route.view)) {
    const cache = globalThis.caches?.default
    const cacheKey = new Request(new URL('/__public-catalog-ssr-v1',request.url))
    const cached = cache && await cache.match(cacheKey)
    if (cached) rows = await cached.json()
    else {
     rows = await loadPublicRows(serverConfig)
     if (cache) waitUntil(cache.put(cacheKey,Response.json(rows,{headers:{'Cache-Control':'public, max-age=60'}})))
    }
   }
   if (route.view === 'anuncio' && !rows.some(row=>row.id===route.propertyId && !row.off_market)) {
    return new Response('<!doctype html><html><head><meta name="robots" content="noindex"><title>KOHAUS · 404</title></head><body><h1>404</h1><a href="/">KOHAUS Real Estate</a></body></html>',{status:404,headers:{...headers,'X-Robots-Tag':'noindex'}})
   }
   const shell = await next()
   const page = renderPage(route,rows)
   const template = await shell.text()
   const html = template.replace(/<html[^>]*>/,`<html lang="${page.language}">`).replace(/<title>[^<]*<\/title>/,()=>`<title>${page.title}</title>`).replace('</head>',()=>`${page.head}</head>`).replace('<div id="root"></div>',()=>`<div id="root">${page.html}</div><script id="kohaus-initial-page" type="application/json">${page.state}</script>`)
   return new Response(request.method==='HEAD'?null:html,{headers})
  } catch {
   // Do not present a temporary upstream outage as an empty catalog to search engines.
   return new Response('<!doctype html><html><head><title>KOHAUS</title></head><body><p>KOHAUS · Temporarily unavailable. Please try again shortly.</p><a href="mailto:hola@thekohaus.com">hola@thekohaus.com</a></body></html>',{status:503,headers:{...headers,'Retry-After':'60','X-Robots-Tag':'noindex'}})
  }
 }
}
