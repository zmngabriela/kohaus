const response = (status, error) => Response.json(error ? { error } : { ok:true }, { status, headers: { 'Cache-Control':'no-store', 'X-Content-Type-Options':'nosniff', 'Referrer-Policy':'no-referrer' } })
export function validateLead(input) {
 const bounds = {name:150,surname:150,email:254,phone:40,city:200,operation:40,source:100,address:500,comments:10000}
 const result = {}
 for (const [key,max] of Object.entries(bounds)) {
  const value = input?.[key] ?? ''
  if (typeof value !== 'string' || value.length>max || value.includes(String.fromCharCode(0))) throw new Error('Invalid input')
  result[key] = value.trim()
 }
 if (['name','surname','email','phone','city','operation','source'].some(key=>!result[key]) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result.email) || input.legal_accepted!==true || !['pt','es','en'].includes(input.language)) throw new Error('Invalid input')
 return {...result,id:crypto.randomUUID(),language:input.language,legal_accepted:true,newsletter_accepted:input.newsletter_accepted===true,status:'nuevo'}
}
export async function onRequest({ request, env, waitUntil }) {
 if (request.method!=='POST') return response(405,'method_not_allowed')
 const url = new URL(request.url)
 if (request.headers.get('Origin')!==url.origin) return response(403,'invalid_origin')
 if (!env.TURNSTILE_SECRET_KEY || !env.SUPABASE_SECRET_KEY || !env.SUPABASE_URL || !env.RATE_LIMIT_SALT || !env.RATE_LIMITS) return response(503,'not_configured')
 const allowedHosts=(env.ALLOWED_HOSTS || '').split(',').map(x=>x.trim())
 if (!allowedHosts.includes(url.hostname)) return response(403,'invalid_host')
 if (!request.headers.get('content-type')?.startsWith('application/json')) return response(415,'invalid_content_type')
 // Count the actual streamed bytes, not a client-controlled Content-Length.
 let body=''; let size=0
 try {
  const reader=request.body?.getReader()
  if (!reader) return response(400,'invalid_body')
  const decoder=new TextDecoder()
  while(true) { const {done,value}=await reader.read(); if(done)break; size+=value.byteLength; if(size>20000) {await reader.cancel();return response(413,'too_large')} body+=decoder.decode(value,{stream:true}) }
  body+=decoder.decode()
  const input=JSON.parse(body)
  const lead=validateLead(input.lead)
  if(typeof input.token!=='string' || input.token.length>2048 || !input.token) return response(400,'invalid_token')
  const ip=request.headers.get('CF-Connecting-IP')
  if (!ip) return response(403,'missing_client_ip')
  const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(`${env.RATE_LIMIT_SALT}:${ip}`))
  const key=Array.from(new Uint8Array(digest),x=>x.toString(16).padStart(2,'0')).join('')
  const window=Math.floor(Date.now()/60000)
  const limit=await env.RATE_LIMITS.prepare('INSERT INTO request_limits(key,window,count) VALUES(?,?,1) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN window=excluded.window THEN count+1 ELSE 1 END,window=excluded.window RETURNING count').bind(key,window).first()
  if(!limit || limit.count>5) return response(429,'rate_limited')
  waitUntil(env.RATE_LIMITS.prepare('DELETE FROM request_limits WHERE window < ?').bind(window-1440).run())
  const verification=await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify',{method:'POST',body:new URLSearchParams({secret:env.TURNSTILE_SECRET_KEY,response:input.token,remoteip:ip}),signal:AbortSignal.timeout(10000)})
  if(!verification.ok) return response(503,'verification_unavailable')
  const verified=await verification.json()
  if(!verified.success || verified.hostname!==url.hostname || verified.action!=='lead') return response(403,'verification_failed')
  const database=new URL(env.SUPABASE_URL)
  if(database.protocol!=='https:' || !/^[a-z0-9]+\.supabase\.co$/.test(database.hostname)) return response(503,'not_configured')
  const headers={apikey:env.SUPABASE_SECRET_KEY,'Content-Type':'application/json',Prefer:'return=minimal'}
  if(!env.SUPABASE_SECRET_KEY.startsWith('sb_secret_')) headers.Authorization=`Bearer ${env.SUPABASE_SECRET_KEY}`
  const saved=await fetch(`${database.origin}/rest/v1/owner_leads`,{method:'POST',headers,body:JSON.stringify(lead),signal:AbortSignal.timeout(10000)})
  return saved.ok ? response(200) : response(503,'temporarily_unavailable')
 } catch { return response(400,'request_failed') }
}
