import { messages, validateInput, validateResult } from './core.js'
export function createHandler({createClient, env, fetcher = fetch}) {
 return async request => {
 const origin=request.headers.get('origin') || ''
 const allowed=(env('AI_ALLOWED_ORIGINS') || '').split(',').map(s=>s.trim())
 const headers={'Content-Type':'application/json','Cache-Control':'no-store','Vary':'Origin',...(allowed.includes(origin)?{'Access-Control-Allow-Origin':origin}:{})}
 const reply=(status,data)=>new Response(JSON.stringify(data),{status,headers})
 if (!allowed.includes(origin)) return reply(403,{error:'origin_denied'})
 if(request.method==='OPTIONS') return new Response(null,{status:204,headers:{...headers,'Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info','Access-Control-Allow-Methods':'POST'}})
 if(request.method!=='POST') return reply(405,{error:'method_not_allowed'})
 const key=env('GROQ_API_KEY')
 if(!key) return reply(503,{error:'not_configured'})
 const authorization=request.headers.get('authorization') || ''
 if(!authorization.startsWith('Bearer ')) return reply(401,{error:'unauthorized'})
 const db=createClient(env('SUPABASE_URL'),env('SUPABASE_ANON_KEY'),{global:{headers:{Authorization:authorization}},auth:{persistSession:false}})
 const {data:{user},error:authError}=await db.auth.getUser(authorization.slice(7))
 if(authError || !user) return reply(401,{error:'unauthorized'})
 const {data:member,error:memberError}=await db.from('dashboard_users').select('role').eq('user_id',user.id).maybeSingle()
 if(memberError || !['admin','editor'].includes(member?.role)) return reply(403,{error:'forbidden'})
 let input
 try {
  const reader=request.body?.getReader();if(!reader)throw Error()
  const decoder=new TextDecoder();let body='',size=0
  while(true){const {value,done}=await reader.read();if(done)break;size+=value.length;if(size>20000){await reader.cancel();return reply(413,{error:'too_large'})}body+=decoder.decode(value,{stream:true})}
  input=validateInput(JSON.parse(body+decoder.decode()))
 } catch {return reply(400,{error:'invalid_input'})}
 const {data:permitted,error:limitError}=await db.rpc('consume_property_ai_quota')
 if(limitError) return reply(503,{error:'not_configured'})
 if(!permitted) return reply(429,{error:'rate_limited'})
 try {
  const response=await fetcher('https://api.groq.com/openai/v1/chat/completions',{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify({model:env('GROQ_MODEL') || 'llama-3.3-70b-versatile',messages:messages(input),response_format:{type:'json_object'},temperature:0.2,max_completion_tokens:5000}),signal:AbortSignal.timeout(45000)})
  if(!response.ok)return reply(response.status===429?429:502,{error:response.status===429?'rate_limited':'provider_unavailable'})
  const data=await response.json()
  if(data.choices?.[0]?.finish_reason!=='stop')throw Error()
  const result=validateResult(JSON.parse(data.choices[0].message.content),input.action)
  return reply(200,result)
 } catch {return reply(502,{error:'provider_unavailable'})}
 }
}
