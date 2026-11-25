import { createClient } from 'npm:@supabase/supabase-js@2.118.0'
import { parseWebhook, verifySignature } from './core.js'

Deno.serve(async req => {
 const headers={'Cache-Control':'no-store'}
 const url=new URL(req.url), token=Deno.env.get('WHATSAPP_VERIFY_TOKEN')
 if(req.method==='GET') {
  if(!token || url.searchParams.get('hub.mode')!=='subscribe' || url.searchParams.get('hub.verify_token')!==token) return new Response('Forbidden',{status:403,headers})
  return new Response(url.searchParams.get('hub.challenge') || '',{headers})
 }
 if(req.method!=='POST') return new Response('',{status:405,headers})
 try {
  // Stream with a hard limit even when Content-Length is absent.
  const reader=req.body?.getReader(); if(!reader)return new Response('',{status:400})
  const chunks:Uint8Array[]=[];let size=0
  while(true){const {value,done}=await reader.read();if(done)break;size+=value.length;if(size>1048576){await reader.cancel();return new Response('',{status:413})}chunks.push(value)}
  const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length}
  const raw=new TextDecoder().decode(bytes)
  if(!await verifySignature(raw,req.headers.get('x-hub-signature-256'),Deno.env.get('WHATSAPP_APP_SECRET'))) return new Response('Forbidden',{status:403,headers})
  const phoneId=Deno.env.get('WHATSAPP_PHONE_NUMBER_ID')
  if(!phoneId)return new Response('Not configured',{status:503,headers})
  const {messages,receipts}=parseWebhook(JSON.parse(raw),phoneId)
  const db=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false}})
  for(const message of messages){const {error}=await db.rpc('crm_receive_whatsapp',{p_message:message});if(error)throw error}
  for(const receipt of receipts){const {error}=await db.rpc('crm_whatsapp_receipt',{p_provider:receipt.provider_id,p_local:receipt.local_id,p_status:receipt.status,p_at:receipt.at,p_error:receipt.error});if(error)throw error}
  return new Response('OK',{headers})
 } catch { return new Response('Processing failed',{status:500,headers}) }
})
