import { canReply, normalizedPhone, supportedTemplates, templatePayload } from '../whatsapp-webhook/core.js'

export function createWhatsappHandler({db,env,fetcher=fetch}) { return async req => {
 const headers={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info','Access-Control-Allow-Methods':'POST, OPTIONS','Cache-Control':'no-store'}
 const reply=(data,status=200)=>Response.json(data,{status,headers})
 if(req.method==='OPTIONS')return new Response(null,{headers})
 if(req.method!=='POST')return reply({error:'METHOD'},405)
 let claimed=null
 try {
  const authorization=req.headers.get('Authorization') || ''
  const {data:{user},error:authError}=await db.auth.getUser(authorization.replace(/^Bearer /,''))
  if(authError || !user)return reply({error:'AUTH'},401)
  const {data:member,error:memberError}=await db.from('dashboard_users').select('role').eq('user_id',user.id).maybeSingle()
  if(memberError || !member)return reply({error:'FORBIDDEN'},403)
  const raw=await req.text();if(raw.length>20000)return reply({error:'TOO_LARGE'},413)
  const input=JSON.parse(raw)
  const token=env('WHATSAPP_ACCESS_TOKEN'),phoneId=env('WHATSAPP_PHONE_NUMBER_ID'),waba=env('WHATSAPP_BUSINESS_ACCOUNT_ID'),version=env('WHATSAPP_GRAPH_VERSION')
  const configured=Boolean(token && phoneId && waba && /^v\d+\.\d+$/.test(version || '') && env('WHATSAPP_APP_SECRET') && env('WHATSAPP_VERIFY_TOKEN'))
  const enabled=env('WHATSAPP_SEND_ENABLED')==='true'
  const graph=async(path,init={})=>fetcher(`https://graph.facebook.com/${version}/${path}`,{...init,headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},signal:AbortSignal.timeout(15000)})
  if(input.action==='status') {
   if(!configured)return reply({state:'unconfigured',canSend:false})
   const result=await graph(`${phoneId}?fields=display_phone_number,verified_name`)
   if(!result.ok)return reply({state:'error',canSend:false})
   const info=await result.json();return reply({state:enabled?'connected':'paused',canSend:enabled,number:info.display_phone_number,name:info.verified_name})
  }
  if(!configured)return reply({error:'UNCONFIGURED'},409)
  if(input.action==='templates') {
   const result=await graph(`${waba}/message_templates?status=APPROVED&limit=100`)
   if(!result.ok)return reply({error:'PROVIDER'},502)
   return reply({templates:supportedTemplates((await result.json()).data)})
  }
  if(input.action==='media') {
   const {data:m}=await db.from('crm_messages').select('media_id,media_name').eq('id',input.messageId).maybeSingle()
   if(!m?.media_id)return reply({error:'NOT_FOUND'},404)
   const result=await graph(m.media_id);if(!result.ok)return reply({error:'PROVIDER'},502)
   const meta=await result.json()
   if(!meta.url || meta.file_size>25*1024*1024)return reply({error:'MEDIA_TOO_LARGE'},413)
   const mediaUrl=new URL(meta.url)
   if(mediaUrl.protocol!=='https:' || !['lookaside.fbsbx.com','lookaside.facebook.com'].includes(mediaUrl.hostname))return reply({error:'MEDIA_HOST'},502)
   const media=await fetcher(mediaUrl,{headers:{Authorization:`Bearer ${token}`},signal:AbortSignal.timeout(15000),redirect:'error'})
   if(!media.ok)return reply({error:'PROVIDER'},502)
   const reader=media.body?.getReader();if(!reader)return reply({error:'MEDIA_EMPTY'},502)
   const chunks=[];let size=0;while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>25*1024*1024){await reader.cancel();return reply({error:'MEDIA_TOO_LARGE'},413)}chunks.push(value)}
   return new Response(new Blob(chunks),{headers:{...headers,'Content-Type':'application/octet-stream','Content-Disposition':'attachment','X-Content-Type-Options':'nosniff'}})
  }
  if(input.action!=='send')return reply({error:'ACTION'},400)
  if(!['admin','editor'].includes(member.role))return reply({error:'FORBIDDEN'},403)
  if(!enabled)return reply({error:'PAUSED'},409)
  if(!/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(input.messageId || '') || !/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(input.conversationId || ''))return reply({error:'INVALID'},400)
  const {data:existing,error:existingError}=await db.from('crm_messages').select('id,status,conversation_id,actor_id,direction,body,kind').eq('id',input.messageId).maybeSingle()
  if(existingError)throw existingError
  if(existing){
   if(existing.conversation_id!==input.conversationId || existing.actor_id!==user.id || existing.direction!=='outbound')return reply({error:'IDEMPOTENCY_CONFLICT'},409)
   if(existing.kind==='text' && existing.body!==String(input.body || '').trim())return reply({error:'IDEMPOTENCY_CONFLICT'},409)
   if(!['sent','delivered','read'].includes(existing.status))return reply({error:'CHECK_EXISTING_MESSAGE',messageId:existing.id,status:existing.status},409)
   return reply({message:{id:existing.id,status:existing.status},replayed:true})
  }
  const {data:c,error:ticketError}=await db.from('crm_conversations').select('*').eq('id',input.conversationId).single()
  if(ticketError || c.channel!=='whatsapp')return reply({error:'NOT_FOUND'},404)
  const phone=normalizedPhone(c.contact_phone)
  if(!phone)return reply({error:'PHONE'},400)
  let body=String(input.body || '').trim(),type='text',content={text:{body,preview_url:true}},template=null
  if(input.template) {
   const result=await graph(`${waba}/message_templates?name=${encodeURIComponent(input.template.name)}&limit=100`)
   if(!result.ok)return reply({error:'PROVIDER'},502)
   const match=supportedTemplates((await result.json()).data).find(t=>t.name===input.template.name && t.language===input.template.language)
   if(!match)return reply({error:'TEMPLATE'},400)
   template=templatePayload(match,input.template.values || [])
   body=match.body.replace(/\{\{(\d+)\}\}/g,(_,n)=>input.template.values[Number(n)-1] || '')
   type='template';content={template}
   // Explicit confirmation is required for proactive template contact.
   if(input.optInConfirmed!==true)return reply({error:'OPT_IN_REQUIRED'},400)
  } else if(!canReply(c.last_inbound_at))return reply({error:'WINDOW_CLOSED'},409)
  if(!body || body.length>4096)return reply({error:'BODY'},400)
  // Reserve a unique request ID before contacting Meta. A replay never sends twice.
  const {error:reserveError}=await db.from('crm_messages').insert({id:input.messageId,conversation_id:c.id,actor_id:user.id,direction:'outbound',kind:type,body,status:'sending',template_data:template})
  if(reserveError){if(reserveError.code==='23505')return reply({error:'ALREADY_PROCESSING'},409);throw reserveError}
  claimed=input.messageId
  const result=await graph(`${phoneId}/messages`,{method:'POST',body:JSON.stringify({messaging_product:'whatsapp',recipient_type:'individual',to:phone,type,...content,biz_opaque_callback_data:claimed})})
  const payload=await result.json()
  if(!result.ok || !payload.messages?.[0]?.id) {
   await db.from('crm_messages').update({status:'failed',error_code:String(payload.error?.code || result.status)}).eq('id',claimed).eq('status','sending')
   return reply({error:'PROVIDER_REJECTED',messageId:claimed},502)
  }
  const {error:receiptError}=await db.rpc('crm_whatsapp_receipt',{p_provider:payload.messages[0].id,p_local:claimed,p_status:'sent',p_at:new Date().toISOString()})
  if(receiptError)throw receiptError
  const now=new Date().toISOString()
  const {error:updateError}=await db.from('crm_conversations').update({last_message_at:now,first_response_at:c.first_response_at || now,updated_at:now}).eq('id',c.id)
  if(updateError)throw updateError
  return reply({message:{id:claimed,status:'sent'}})
 } catch {
  if(claimed)await db.from('crm_messages').update({status:'uncertain',error_code:'ACK_UNKNOWN'}).eq('id',claimed).eq('status','sending')
  return reply({error:claimed?'DELIVERY_UNCERTAIN':'REQUEST_FAILED'},502)
 }
}}
