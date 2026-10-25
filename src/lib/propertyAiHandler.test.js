import {it,expect,vi} from 'vitest'
import {createHandler} from '../../supabase/functions/property-ai/handler.js'
const input={action:'generate',language:'pt',property:{type:'piso',destination:'barcelona',surface:'80'}}
function setup(role='admin',quota=true){
 const fetcher=vi.fn().mockResolvedValue(Response.json({choices:[{finish_reason:'stop',message:{content:JSON.stringify({description:'Apartamento de 80 m².'})}}]}))
 const db={auth:{getUser:vi.fn().mockResolvedValue({data:{user:{id:'test'}}})},from:()=>({select:()=>({eq:()=>({maybeSingle:async()=>({data:{role}})})})}),rpc:vi.fn().mockResolvedValue({data:quota})}
 const handler=createHandler({createClient:()=>db,fetcher,env:n=>({GROQ_API_KEY:'test',AI_ALLOWED_ORIGINS:'http://localhost:5173',SUPABASE_URL:'https://example.supabase.co',SUPABASE_ANON_KEY:'test'})[n]})
 const request=()=>new Request('https://example.supabase.co/functions/v1/property-ai',{method:'POST',headers:{origin:'http://localhost:5173',authorization:'Bearer test'},body:JSON.stringify(input)})
 return {handler,request,fetcher,db}
}
it.each(['viewer',undefined])('rejects unauthorized role %s before contacting Groq',async role=>{
 const s=setup(role===undefined?'unknown':role)
 expect((await s.handler(s.request())).status).toBe(403);expect(s.fetcher).not.toHaveBeenCalled()
})
it('rejects invalid user and exhausted quota without sending property data',async()=>{
 const s=setup('admin',false)
 expect((await s.handler(s.request())).status).toBe(429);expect(s.fetcher).not.toHaveBeenCalled()
 s.db.auth.getUser.mockResolvedValue({data:{user:null},error:{}})
 expect((await s.handler(s.request())).status).toBe(401)
})
it('returns checked suggestions without a database write',async()=>{
 const s=setup();const response=await s.handler(s.request())
 expect(response.status).toBe(200);expect(await response.json()).toEqual({description:'Apartamento de 80 m².'})
 expect(s.db.rpc).toHaveBeenCalledWith('consume_property_ai_quota')
 expect(s.fetcher).toHaveBeenCalledTimes(1)
 expect(JSON.parse(s.fetcher.mock.calls[0][1].body).model).toBe('openai/gpt-oss-120b')
})
it('hides provider error bodies and rejects malformed results',async()=>{
 const s=setup();s.fetcher.mockResolvedValueOnce(new Response('PRIVATE PROVIDER ERROR',{status:500}))
 const response=await s.handler(s.request());expect(response.status).toBe(502);expect(await response.text()).not.toContain('PRIVATE')
 s.fetcher.mockResolvedValueOnce(Response.json({choices:[{finish_reason:'stop',message:{content:'{}'}}]}))
 expect((await s.handler(s.request())).status).toBe(502)
})
it('distinguishes Groq authentication and deprecated model errors without exposing provider details',async()=>{
 const s=setup()
 s.fetcher.mockResolvedValueOnce(new Response('private key detail',{status:401}))
 const authResponse=await s.handler(s.request())
 expect(authResponse.status).toBe(502);expect(await authResponse.json()).toEqual({error:'provider_auth_failed'})
 s.fetcher.mockResolvedValueOnce(new Response('private model detail',{status:400}))
 const modelResponse=await s.handler(s.request())
 expect(modelResponse.status).toBe(502);expect(await modelResponse.json()).toEqual({error:'model_or_request_rejected'})
})
it('reports missing configuration and quota migration failures explicitly',async()=>{
 const s=setup()
 const missingConfig=createHandler({createClient:()=>s.db,fetcher:s.fetcher,env:n=>n==='GROQ_API_KEY'?undefined:({AI_ALLOWED_ORIGINS:'http://localhost:5173',SUPABASE_URL:'https://example.supabase.co',SUPABASE_ANON_KEY:'test'})[n]})
 expect(await (await missingConfig(s.request())).json()).toEqual({error:'not_configured'})
 s.db.rpc.mockResolvedValueOnce({data:null,error:{message:'migration missing'}})
 const response=await s.handler(s.request())
 expect(response.status).toBe(503);expect(await response.json()).toEqual({error:'quota_unavailable'})
 expect(s.fetcher).not.toHaveBeenCalled()
})
