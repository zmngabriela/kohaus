import { supabase, hasSupabaseConfig } from './supabase'
import { isLocalInbox, createInboxStore } from './inbox'
export async function fetchInboxHistory(id,client,userId,properties=[]) {
 if(isLocalInbox()) {
  const store=createInboxStore({local:true,userId}),tickets=await store.list()
  const matches=tickets.filter(t=>client ? t.client_id===id || properties.some(p=>p.id===t.property_id && p.ownerClientId===id) : t.property_id===id)
  return (await Promise.all(matches.map(t=>store.events(t.id)))).flat()
 }
 if(!hasSupabaseConfig)return []
 const {data,error}=await supabase.from('crm_inbox_events').select('*').contains(client?'client_ids':'property_ids',[id]).order('created_at',{ascending:false}).limit(200)
 if(error)throw error
 return data
}
export function inboxHistoryEntry(event,language='pt') {
 const w={pt:{ticket:'Atendimento',message:'Mensagem',insert:'Registrado',update:'Atualizado',open:'Em aberto',waiting:'Aguardando',resolved:'Resolvido',note:'Nota interna',sent:'Aceita pelo WhatsApp',delivered:'Entregue',read:'Lida',received:'Recebida',draft:'Teste local · não enviada'},es:{ticket:'Conversación',message:'Mensaje',insert:'Registrado',update:'Actualizado',open:'Abierto',waiting:'En espera',resolved:'Resuelto',note:'Nota interna',sent:'Aceptado por WhatsApp',delivered:'Entregado',read:'Leído',received:'Recibido',draft:'Prueba local · no enviada'},en:{ticket:'Ticket',message:'Message',insert:'Recorded',update:'Updated',open:'Open',waiting:'Waiting',resolved:'Resolved',note:'Internal note',sent:'Accepted by WhatsApp',delivered:'Delivered',read:'Read',received:'Received',draft:'Local test · not sent'}}[language]
 const [kind,action]=event.action.split('.'),after=event.after_data || {},before=event.before_data || {}
 const display=v=>w[v] || String(v ?? '')
 return {id:event.id,createdAt:event.created_at,heading:[w[kind],w[action]].filter(Boolean).join(' · '),text:[after.subject,display(after.status)].filter(Boolean).join(' · '),changes:action==='update'?['status','priority','assigned_to','client_id','lead_id','property_id','visit_id'].filter(k=>before[k]!==after[k]).map(field=>({field,before:display(before[field]),after:display(after[field])})):undefined}
}
