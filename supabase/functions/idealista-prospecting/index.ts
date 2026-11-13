import { createClient } from 'npm:@supabase/supabase-js@2.118.0'
import { privateListings } from './listings.js'

const centers = { barcelona:'41.3874,2.1686', palamos:'41.8495,3.1291', roses:'42.2629,3.1748' }
Deno.serve(async req => {
  const headers = { 'Access-Control-Allow-Origin':'*', 'Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info', 'Access-Control-Allow-Methods':'POST, OPTIONS', 'Cache-Control':'no-store' }
  const reply = (data:unknown,status=200) => Response.json(data,{status,headers})
  if (req.method==='OPTIONS') return new Response(null,{headers})
  if (req.method!=='POST') return reply({},405)
  try {
    const auth=req.headers.get('Authorization') || ''
    const db=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_ANON_KEY')!,{global:{headers:{Authorization:auth}}})
    const {data:{user}}=await db.auth.getUser(auth.replace(/^Bearer /,''))
    if (!user) return reply({},401)
    const {data:member}=await db.from('dashboard_users').select('role').eq('user_id',user.id).maybeSingle()
    if (!member) return reply({},403)
    const {zone,operation,page}=await req.json()
    if (!Object.hasOwn(centers,zone) || !['sale','rent'].includes(operation) || !Number.isInteger(page) || page<1 || page>100) return reply({},400)
    const key=Deno.env.get('IDEALISTA_SEARCH_KEY'), secret=Deno.env.get('IDEALISTA_SEARCH_SECRET')
    if (!key || !secret) return reply({state:'unconfigured'})
    const token=await fetch('https://api.idealista.com/oauth/token',{method:'POST',headers:{Authorization:'Basic '+btoa(key+':'+secret)},body:new URLSearchParams({grant_type:'client_credentials',scope:'read'}),signal:AbortSignal.timeout(10000)})
    if (!token.ok) return reply({},502)
    const {access_token}=await token.json()
    const result=await fetch('https://api.idealista.com/3.5/es/search',{method:'POST',headers:{Authorization:'Bearer '+access_token},body:new URLSearchParams({center:centers[zone as keyof typeof centers],distance:'15000',country:'es',operation,propertyType:'homes',maxItems:'50',numPage:String(page),language:'es'}),signal:AbortSignal.timeout(15000)})
    if (!result.ok) return reply({},result.status===429?429:502)
    const payload=await result.json()
    if (!Array.isArray(payload.elementList)) return reply({},502)
    return reply({items:privateListings(payload.elementList),more:page<Math.min(100,payload.totalPages)})
  } catch { return reply({},502) }
})
