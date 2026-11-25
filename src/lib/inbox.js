import { supabase } from './supabase'
import { formatContactName } from './contactName'
import { canReply } from '../../supabase/functions/whatsapp-webhook/core'
export { canReply }
export const isLocalInbox = () => import.meta.env.DEV && typeof window !== 'undefined' && ['localhost','127.0.0.1','[::1]'].includes(window.location.hostname)
export const fullName = item => [item?.name,item?.surname].filter(Boolean).join(' ')
const displayContactName = name => /\S+@\S+/.test(name ?? '') ? name : formatContactName(name)
const withContactName = ticket => ({...ticket,contact_name:displayContactName(ticket.contact_name)})
const now = () => new Date().toISOString()
const empty = () => ({tickets:[],messages:[],events:[],reads:{}})
export function createInboxStore({local=false,userId='preview',database=supabase,storage=globalThis.localStorage}={}) {
 const key=`kohaus-inbox-preview-v1:${userId}`
 const read=()=>{try{return JSON.parse(storage.getItem(key)) || empty()}catch{return empty()}}
 const write=data=>{storage.setItem(key,JSON.stringify(data));globalThis.dispatchEvent?.(new Event('kohaus-inbox-change'))}
 const event=(data,ticket,action,before=null,messageId=null)=>data.events.push({id:crypto.randomUUID(),conversation_id:ticket.id,created_at:now(),actor_id:userId,action,before_data:before,after_data:{...ticket},message_id:messageId})
 async function unwrap(query) {const {data,error}=await query;if(error)throw error;return data}
 return {
  local,
  async list(){
   if(!local){
    const rows=await unwrap(database.from('crm_inbox').select('*').order('last_message_at',{ascending:false,nullsFirst:false}).limit(200))
    return rows.map(withContactName)
   }
   const data=read();return data.tickets.map(t=>{const messages=data.messages.filter(m=>m.conversation_id===t.id).sort((a,b)=>a.created_at.localeCompare(b.created_at));return {...withContactName(t),last_body:messages.at(-1)?.body || '',unread_count:messages.filter(m=>m.direction==='inbound' && m.created_at>(data.reads[t.id] || '')).length}}).sort((a,b)=>(b.last_message_at || b.created_at).localeCompare(a.last_message_at || a.created_at))
  },
  async messages(id,offset=0){
   if(!local){const rows=await unwrap(database.from('crm_messages').select('*').eq('conversation_id',id).order('created_at',{ascending:false}).order('id',{ascending:false}).range(offset,offset+99));return rows.reverse()}
   return read().messages.filter(m=>m.conversation_id===id).sort((a,b)=>a.created_at.localeCompare(b.created_at)).slice(Math.max(0,read().messages.filter(m=>m.conversation_id===id).length-offset-100),offset ? -offset : undefined)
  },
  async events(id){if(!local)return unwrap(database.from('crm_inbox_events').select('*').eq('conversation_id',id).order('created_at',{ascending:false}).limit(100));return read().events.filter(e=>e.conversation_id===id).reverse()},
  async save(id,changes){
   const patch=changes.contact_name===undefined ? changes : withContactName(changes)
   if(!local)return unwrap(database.rpc('crm_save_ticket',{p_id:id || null,p_data:patch}))
   const data=read(),before=data.tickets.find(t=>t.id===id)
   const t={id:id || crypto.randomUUID(),created_at:now(),channel:'whatsapp',subject:'',contact_name:'',contact_phone:'',contact_email:'',status:'open',priority:'normal',client_id:null,lead_id:null,property_id:null,visit_id:null,assigned_to:null,...before,...patch,updated_at:now()}
   if(!t.subject.trim())throw new Error('SUBJECT')
   if(patch.status==='resolved')t.resolved_at=now();else if(patch.status)t.resolved_at=null
   data.tickets=[...data.tickets.filter(c=>c.id!==t.id),t];event(data,t,before?'ticket.update':'ticket.insert',before);write(data);return t
  },
  async note(id,body,messageId=crypto.randomUUID()){
   if(!local)return unwrap(database.rpc('crm_add_note',{p_ticket:id,p_body:body,p_id:messageId}))
   const data=read(),t=data.tickets.find(c=>c.id===id);if(!t || !body.trim())throw new Error('NOTE')
   const existing=data.messages.find(m=>m.id===messageId);if(existing)return existing
   const m={id:messageId,conversation_id:id,created_at:now(),actor_id:userId,direction:'internal',kind:'note',body:body.trim(),status:'note'}
   data.messages.push(m);event(data,t,'message.insert',null,m.id);write(data);return m
  },
  async markRead(id){if(!local)return unwrap(database.rpc('crm_mark_read',{p_ticket:id}));const data=read();data.reads[id]=now();write(data)},
  async connection(){if(local)return {state:'local',canSend:false};return unwrap(database.functions.invoke('whatsapp-api',{body:{action:'status'}}))},
  async emailAttachment(messageId,index){
   if(local)throw new Error('LOCAL_ONLY')
   return unwrap(database.functions.invoke('spacemail',{body:{action:'attachment',messageId,index}}))
  },
  async syncEmail(mailbox){
   if(local)throw new Error('LOCAL_ONLY')
   return unwrap(database.functions.invoke('spacemail',{body:{action:'sync',mailbox,folder:'inbox'}}))
  },
  async emailConnection(){
   if(local)return {state:'local',canSend:false,mailboxes:[]}
   return unwrap(database.functions.invoke('spacemail',{body:{action:'status'}}))
  },
  async sendEmail(id,body,messageId,mailbox,files=[]){
   if(local){await this.save(id,{mailbox_email:mailbox});return this.send(id,body,messageId)}
   const data=await unwrap(database.functions.invoke('spacemail',{body:{action:'send',conversationId:id,body,messageId,mailbox,files}}))
   if(data.status!=='sent')throw new Error('EMAIL_UNCONFIRMED')
   return data
  },
  async templates(){if(local)return [];const data=await unwrap(database.functions.invoke('whatsapp-api',{body:{action:'templates'}}));return data.templates},
  async send(id,body,messageId,template,optInConfirmed){
   if(!local)return unwrap(database.functions.invoke('whatsapp-api',{body:{action:'send',conversationId:id,body,messageId,template,optInConfirmed}}))
   const data=read(),t=data.tickets.find(c=>c.id===id);if(!t)throw new Error('TICKET')
   if(data.messages.some(m=>m.id===messageId))return {replayed:true}
   const m={id:messageId,conversation_id:id,created_at:now(),actor_id:userId,direction:'outbound',kind:'text',body,status:'draft'}
   data.messages.push(m);t.last_message_at=now();event(data,t,'message.insert',null,m.id);write(data);return {message:m}
  },
  async media(id){if(local)throw new Error('LOCAL');return unwrap(database.functions.invoke('whatsapp-api',{body:{action:'media',messageId:id}}))},
  async importForms(leads){
   if(!local)throw new Error('LOCAL_ONLY')
   const data=read()
   for(const lead of leads){if(data.tickets.some(t=>t.lead_id===lead.id))continue
    const time=lead.createdAt || now(),id=crypto.randomUUID()
    const t={id,created_at:time,updated_at:time,channel:'form',subject:fullName(lead),contact_name:fullName(lead),contact_email:lead.email,contact_phone:lead.phone,lead_id:lead.id,status:'open',priority:'normal',last_inbound_at:time,last_message_at:time}
    data.tickets.push(t);data.messages.push({id:crypto.randomUUID(),conversation_id:id,created_at:time,direction:'inbound',kind:'text',body:[lead.comments,lead.city,lead.operation].filter(Boolean).join('\n'),status:'received'});event(data,t,'ticket.insert')
   }write(data)
  },
  async seedEmailDemo(){
   if(!local)throw new Error('LOCAL_ONLY')
   const data=read(),at=now()
   for(const mailbox of ['hola@kohausrealestate.com','guilherme@kohausrealestate.com']) {
    if(data.tickets.some(t=>t.demo && t.mailbox_email===mailbox))continue
    const id=crypto.randomUUID(),t={id,created_at:at,updated_at:at,channel:'email',mailbox_email:mailbox,subject:'Interesse na seleção KOHAUS · exemplo',contact_name:'Marina · exemplo',contact_email:'marina@example.test',status:'open',priority:'normal',last_inbound_at:at,last_message_at:at,demo:true}
    data.tickets.push(t);data.messages.push({id:crypto.randomUUID(),conversation_id:id,created_at:at,direction:'inbound',kind:'text',body:'Olá! Gostei da seleção de imóveis. Gostaria de saber mais sobre as opções em Barcelona. [Mensagem fictícia para avaliação]',status:'received'});event(data,t,'ticket.insert')
   }
   write(data)
  },
  async seedDemo(){
   if(!local)throw new Error('LOCAL_ONLY')
   const data=read();if(data.tickets.some(t=>t.demo))return
   const at=now(),id=crypto.randomUUID()
   const t={id,created_at:at,updated_at:at,channel:'whatsapp',subject:'Busca de apartamento em Barcelona',contact_name:'Marina · exemplo',contact_phone:'',contact_email:'',client_id:'demo-client',property_id:'demo-property',status:'open',priority:'high',last_inbound_at:at,last_message_at:at,demo:true}
   data.tickets.push(t);data.messages.push({id:crypto.randomUUID(),conversation_id:id,created_at:at,direction:'inbound',kind:'text',body:'Olá! Estou procurando um apartamento de dois quartos em Barcelona. Podemos conversar sobre as opções?',status:'received'});event(data,t,'ticket.insert');write(data)
  },
 }
}
export function filterInbox(tickets,{search='',status='active',channel='all',assigned='all',mailbox='all',context={}},userId){
 const needle=search.trim().normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()
 return tickets.filter(t=>(status==='resolved' ? t.status==='resolved' : t.status!=='resolved' &&
  (status==='active' || (status==='unread' ? Number(t.unread_count)>0 : t.status===status))) &&
  (channel==='all' || t.channel===channel) && (mailbox==='all' || t.mailbox_email===mailbox) && (assigned==='all' || (assigned==='mine'?t.assigned_to===userId:!t.assigned_to)) &&
  Object.entries(context).every(([key,value])=>!value || t[key]===value) &&
  [t.subject,t.contact_name,t.contact_phone,t.contact_email,t.last_body].join(' ').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().includes(needle))
}
export function propertyMessage(property,language='pt') {
 if(!property || property.offMarket || property.status!=='active')return ''
 const title=typeof property.title==='object' ? property.title[language] || property.title.es : property.title
 const url=new URL('https://kohausrealestate.com/')
 url.search=new URLSearchParams({view:'anuncio',id:property.id,lang:language}).toString()
 return [property.reference,title,property.priceLabel,`${property.rooms || '—'} ${language==='en'?'bedrooms':language==='es'?'habitaciones':'quartos'} · ${property.surface || '—'} m²`,url.href].filter(Boolean).join('\n')
}
