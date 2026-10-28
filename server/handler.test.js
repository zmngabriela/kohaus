import { expect,it,vi } from 'vitest'
import { createPageHandler } from './handler'
const securityHeaders={'Content-Security-Policy':"default-src 'self'",'X-Frame-Options':'DENY'}
const renderer={requestRoute:()=>({view:'about'}),publicViews:['about','home','anuncio'],serverConfig:{production:false},securityHeaders,renderPage:()=>({html:'<h1>About KOHAUS</h1>',title:'About',language:'en',head:'<meta name="description" content="About">',state:'{"route":{}}'})}
const context=()=>({request:new Request('https://dev.test/?view=about'),next:vi.fn().mockResolvedValue(new Response('<html lang="es"><head><title>KOHAUS</title></head><body><div id="root"></div></body></html>')),waitUntil:vi.fn()})
it('delivers visible HTML, bootstrap data and security headers without JavaScript',async()=>{
 const response=await createPageHandler(renderer)(context())
 expect(response.status).toBe(200)
 expect(response.headers.get('Content-Security-Policy')).toBe("default-src 'self'")
 expect(response.headers.get('X-Robots-Tag')).toContain('noindex')
 expect(await response.text()).toContain('<div id="root"><h1>About KOHAUS</h1></div>')
})
it('leaves dashboard content client-side and disables indexing',async()=>{
 const renderPage=vi.fn()
 const response=await createPageHandler({...renderer,renderPage,requestRoute:()=>({view:'dashboard'})})(context())
 expect(renderPage).not.toHaveBeenCalled()
 expect(response.headers.get('Cache-Control')).toBe('no-store')
 expect(response.headers.get('X-Robots-Tag')).toContain('noindex')
})
it('returns a retryable 503 instead of publishing empty results',async()=>{
 const response=await createPageHandler({...renderer,renderPage:()=>{throw Error('failure')}})(context())
 expect(response.status).toBe(503)
 expect(response.headers.get('Retry-After')).toBe('60')
})
