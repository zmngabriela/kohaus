import { Buffer } from 'node:buffer'
import { signedEmail } from './signature.mjs'
import { mailboxes } from './normalize.mjs'
const uuid = value => typeof value==='string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
const result=(status,body)=>({status,body})
// Receives only the authenticated token and ticket/body. Recipient and headers come from the database.
export function createMailApi({db,accounts=[],enabled=false,makeTransport}) {
 return async function handle({token,input={}}) {
  if(!token) return result(401,{error:'AUTH_REQUIRED'})
  const {data:auth,error:authError}=await db.auth.getUser(token)
  if(authError || !auth?.user) return result(401,{error:'AUTH_REQUIRED'})
  const {data:member,error:memberError}=await db.from('dashboard_users').select('role').eq('user_id',auth.user.id).maybeSingle()
  if(memberError || !member) return result(403,{error:'FORBIDDEN'})
  const configured=accounts.filter(a=>mailboxes.includes(a.email) && a.password)
  if(input.action==='status') return result(200,{state:enabled && configured.length?'configured':'unconfigured',canSend:enabled && configured.length>0 && ['admin','editor'].includes(member.role),mailboxes:configured.map(a=>a.email)})
  if(!['admin','editor'].includes(member.role)) return result(403,{error:'FORBIDDEN'})
  if(input.action!=='send') return result(400,{error:'INVALID_ACTION'})
  if(!enabled) return result(409,{error:'SENDING_DISABLED'})
  const account=configured.find(a=>a.email===input.mailbox)
  if(!account || !uuid(input.conversationId) || !uuid(input.messageId) || typeof input.body!=='string' || !input.body.trim() || input.body.length>10000) return result(400,{error:'INVALID_MESSAGE'})
  const files = input.files ?? []
  if (!Array.isArray(files) || files.length > 5) return result(400,{error:'INVALID_ATTACHMENTS'})
  const attachments = []
  let totalSize = 0
  for (const file of files) {
   if (!file || typeof file.name !== 'string' || typeof file.content !== 'string' || file.content.length > 4_194_304 ||
       !/^[A-Za-z0-9+/]+={0,2}$/.test(file.content) || file.content.length % 4 !== 0) return result(400,{error:'INVALID_ATTACHMENTS'})
   const content = Buffer.from(file.content,'base64')
   totalSize += content.length
   if (!content.length || totalSize > 3 * 1024 * 1024) return result(413,{error:'ATTACHMENTS_TOO_LARGE'})
   const name = file.name.replace(/[\/\\\u0000-\u001f\u007f]/g,'_').trim().slice(0,160) || 'anexo'
   attachments.push({name, content:file.content, size:content.length})
  }
  const {data:reserved,error}=await db.rpc('crm_reserve_email',{p_actor:auth.user.id,p_ticket:input.conversationId,p_id:input.messageId,p_body:input.body,p_mailbox:account.email})
  if(error || !reserved) return result(409,{error:'RESERVATION_REJECTED'})
  if(reserved.replayed) return result(200,{replayed:true,status:reserved.status})
  let status='uncertain',transport
  try {
   if (attachments.length) {
    const {error} = await db.rpc('crm_store_sent_email_files',{p_id:input.messageId,p_files:attachments})
    if (error) {
     await db.rpc('crm_finish_email',{p_id:input.messageId,p_status:'failed'})
     return result(502,{error:'ATTACHMENT_STORAGE_FAILED'})
    }
   }
   const signed = signedEmail(reserved.body)
   transport=makeTransport(account)
   const sent=await transport.sendMail({from:{name:'KOHAUS',address:reserved.mailbox_email},replyTo:reserved.mailbox_email,to:{address:reserved.recipient},subject:reserved.subject.replace(/[\r\n]/g,' '),...signed,attachments:[...signed.attachments,...attachments.map(file=>({filename:file.name,content:Buffer.from(file.content,'base64'),contentType:'application/octet-stream'}))],messageId:reserved.message_id,references:reserved.references_ids,inReplyTo:reserved.references_ids.at(-1),disableFileAccess:true,disableUrlAccess:true})
   status=sent.accepted?.length?'sent':'failed'
  } catch(error) {
   // A network failure can happen AFTER acceptance. Never retry automatically.
   status=['EAUTH','EENVELOPE','EDNS','ECONNECTION'].includes(error.code) || Number(error.responseCode)>=400 ? 'failed':'uncertain'
  } finally { transport?.close?.() }
  const {error:finishError}=await db.rpc('crm_finish_email',{p_id:input.messageId,p_status:status})
  if(finishError) return result(503,{error:'SEND_STATUS_UNCONFIRMED'})
  return result(status==='sent'?200:502,{status,error:status==='sent'?undefined:'SEND_NOT_CONFIRMED'})
 }
}
