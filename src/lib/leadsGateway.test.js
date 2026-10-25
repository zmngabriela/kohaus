import { expect, it, vi, afterEach } from 'vitest'
import { onRequest, validateLead } from '../../functions/api/leads'
afterEach(()=>vi.unstubAllGlobals())
const lead={name:'Test',surname:'User',email:'test@example.test',phone:'123',city:'Barcelona',operation:'comprar',source:'contact',legal_accepted:true,language:'pt'}
it('whitelists input and requires consent',()=>{
 expect(validateLead({...lead,status:'admin',role:'admin'})).not.toHaveProperty('role')
 expect(validateLead({...lead,status:'admin'}).status).toBe('nuevo')
 expect(()=>validateLead({...lead,legal_accepted:false})).toThrow()
 expect(()=>validateLead({...lead,comments:'x'.repeat(10001)})).toThrow()
})
it('fails closed without bindings and rejects cross-origin requests',async()=>{
 const request=new Request('https://site.test/api/leads',{method:'POST',headers:{Origin:'https://evil.test'}})
 expect((await onRequest({request,env:{}})).status).toBe(403)
 const same=new Request('https://site.test/api/leads',{method:'POST',headers:{Origin:'https://site.test'}})
 expect((await onRequest({request:same,env:{}})).status).toBe(503)
})
it('blocks requests over the per-IP limit before inserting any record',async()=>{
 const fetchMock=vi.fn();vi.stubGlobal('fetch',fetchMock)
 const request=new Request('https://site.test/api/leads',{method:'POST',headers:{Origin:'https://site.test','Content-Type':'application/json','CF-Connecting-IP':'192.0.2.1'},body:JSON.stringify({lead,token:'test'})})
 const env={TURNSTILE_SECRET_KEY:'test',SUPABASE_SECRET_KEY:'test',SUPABASE_URL:'https://project.supabase.co',RATE_LIMIT_SALT:'test',ALLOWED_HOSTS:'site.test',RATE_LIMITS:{prepare:()=>({bind:()=>({first:async()=>({count:6})})})}}
 expect((await onRequest({request,env,waitUntil:()=>{}})).status).toBe(429)
 expect(fetchMock).not.toHaveBeenCalled()
})

function context() {
 return {
  request:new Request('https://site.test/api/leads',{method:'POST',headers:{Origin:'https://site.test','Content-Type':'application/json','CF-Connecting-IP':'192.0.2.1'},body:JSON.stringify({lead:{...lead,role:'admin'},token:'test'})}),
  env:{TURNSTILE_SECRET_KEY:'test',SUPABASE_SECRET_KEY:'test',SUPABASE_URL:'https://project.supabase.co',RATE_LIMIT_SALT:'test',ALLOWED_HOSTS:'site.test',RATE_LIMITS:{prepare:()=>({bind:()=>({first:async()=>({count:1}),run:async()=>({success:true})})})}},
  waitUntil:()=>{},
 }
}
it.each([
 {success:false,hostname:'site.test',action:'lead'},
 {success:true,hostname:'evil.test',action:'lead'},
 {success:true,hostname:'site.test',action:'login'},
])('never writes when token verification does not match: %j',async verified=>{
 const fetchMock=vi.fn().mockResolvedValue(Response.json(verified));vi.stubGlobal('fetch',fetchMock)
 expect((await onRequest(context())).status).toBe(403)
 expect(fetchMock).toHaveBeenCalledTimes(1)
})
it('writes only validated fields after server-side verification',async()=>{
 const fetchMock=vi.fn().mockResolvedValueOnce(Response.json({success:true,hostname:'site.test',action:'lead'})).mockResolvedValueOnce(new Response(null,{status:201}));vi.stubGlobal('fetch',fetchMock)
 expect((await onRequest(context())).status).toBe(200)
 const [url,options]=fetchMock.mock.calls[1]
 expect(url).toBe('https://project.supabase.co/rest/v1/owner_leads')
 expect(JSON.parse(options.body)).toMatchObject({status:'nuevo',legal_accepted:true})
 expect(JSON.parse(options.body)).not.toHaveProperty('role')
})
