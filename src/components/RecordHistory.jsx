import { commercialText } from './CommercialAgenda'
import { useEffect, useState } from 'react'
import { fetchCommercialActivity, activityHistoryEntry } from '../lib/commercialActivity'
import { fetchInboxHistory, inboxHistoryEntry } from '../lib/inboxHistory'
import { matchProperties } from '../lib/opportunities'

const words = {
 pt:['Histórico','Voltar','Ligação','Interesse em imóvel','Nota','Registrar atividade','Registrar','Imóvel','Oportunidades atuais','Cadastro atualizado','Antes','Depois','Nenhuma atividade registrada.','Descrição','Visita'],
 es:['Historial','Volver','Llamada','Interés en inmueble','Nota','Registrar actividad','Guardar','Inmueble','Oportunidades actuales','Ficha actualizada','Antes','Después','Sin actividad registrada.','Descripción','Visita'],
 en:['History','Back','Call','Property interest','Note','Log activity','Save','Property','Current matches','Record updated','Before','After','No activity recorded.','Description','Visit'],
}
export default function RecordHistory({record,client,properties,visits,language,labels,onBack,onActivity,onSchedule,userId}) {
 const [events,setEvents]=useState([])
 const [inboxEvents,setInboxEvents]=useState([])
 const [inboxError,setInboxError]=useState(false)
 useEffect(()=>{let active=true;fetchInboxHistory(record.id,client,userId,properties).then(rows=>{if(active)setInboxEvents(rows)}).catch(()=>{if(active)setInboxError(true)});return ()=>{active=false}},[record.id,client,userId,properties])
 const [loadError,setLoadError]=useState(false)
 useEffect(()=>{
   let active=true
   fetchCommercialActivity(record.id,client).then(data=>{if(active)setEvents(data)}).catch(()=>{if(active)setLoadError(true)})
   return ()=>{active=false}
 },[record.id,client])
 const [kind,setKind]=useState('call')
 const [busy,setBusy]=useState(false)
 const [error,setError]=useState('')
 const [history,back,call,interest,note,log,save,property,matches,updated,before,after,empty,description,visit]=words[language]
 const eventFields = {pt:{status:'Situação',title:'Título',scheduled_at:'Data da visita',due_date:'Prazo',duration_minutes:'Duração',priority:'Prioridade',notes:'Notas',location:'Local',client_id:'Cliente',property_id:'Imóvel',lead_id:'Lead'},es:{status:'Estado',title:'Título',scheduled_at:'Fecha de visita',due_date:'Vencimiento',duration_minutes:'Duración',priority:'Prioridad',notes:'Notas',location:'Lugar',client_id:'Cliente',property_id:'Inmueble',lead_id:'Lead'},en:{status:'Status',title:'Title',scheduled_at:'Visit date',due_date:'Due date',duration_minutes:'Duration',priority:'Priority',notes:'Notes',location:'Location',client_id:'Client',property_id:'Property',lead_id:'Lead'}}[language]
 const opportunity = {pt:'Oportunidade apresentada',es:'Oportunidad presentada',en:'Opportunity presented'}[language]
 const kinds={call,interest,opportunity,note}
 const entries=[...(record.history || []),...inboxEvents.map(e=>inboxHistoryEntry(e,language)),...events.map(event=>{const entry=activityHistoryEntry(event,language,labels); const refs=event.property_ids.map(id=>properties.find(p=>p.id===id)?.reference || id); return {...entry,text:[refs.join(' · '),entry.text].filter(Boolean).join(' · ')}})]
 for(const v of visits.filter(v=>(client ? v.clientId===record.id || properties.some(p=>p.id===v.propertyId && p.ownerClientId===record.id) : v.propertyId===record.id) && !events.some(e=>e.source_type==='visit' && e.source_id===v.id))) {
   const listing=properties.find(p=>p.id===v.propertyId)
   entries.push({id:'visit-'+v.id,createdAt:v.scheduledAt,text:[visit,listing?.reference,labels[v.status] || v.status].filter(Boolean).join(' · ')})
 }
 entries.sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt)))
 async function submit(event) {
   event.preventDefault()
   if(busy)return
   const form=event.currentTarget,data=new FormData(form)
   const text=String(data.get('note') || '').trim()
   if(!text && kind==='note')return
   setBusy(true);setError('')
   try {await onActivity({kind,text,propertyRef:String(data.get('property') || '')});form.reset();setKind('call')}
   catch(e){setError(e.message)}finally{setBusy(false)}
 }
 return <section className="dashboard-section record-history">
   <header><button type="button" className="outline-button" onClick={onBack}>{back}</button><p className="section-label">{history}</p><h2>{client ? [record.name,record.surname].join(' ') : record.reference+' · '+record.title}</h2></header>
   {client && <><div><button type="button" className="outline-button" onClick={onSchedule}>{commercialText[language].follow}</button></div><form onSubmit={submit} className="dashboard-property-filters activity-form"><label><span>{log}</span><select value={kind} onChange={e=>setKind(e.target.value)}>{Object.entries(kinds).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label>
   <label><span>{property}</span><select name="property" required={kind==='interest' || kind==='opportunity'}><option value="">—</option>{properties.map(p=><option key={p.id} value={p.reference}>{p.reference} · {p.title}</option>)}</select></label>
   <label><span>{description}</span><input name="note" required={kind==='note'} maxLength={2000}/></label><button disabled={busy} className="dashboard-property-edit">{save}</button>{error && <p role="alert">{error}</p>}</form>
   <details><summary>{matches}</summary><ul>{matchProperties(record,properties).map(p=><li key={p.id}>{p.reference} · {p.title}</li>)}</ul></details></>}
   {inboxError && <p role="status">{{pt:'Histórico de conversas ainda não disponível. Os registros de visitas e tarefas continuam abaixo.',es:'Historial de conversaciones no disponible. Las visitas y tareas aparecen abajo.',en:'Conversation history unavailable. Visits and tasks are shown below.'}[language]}</p>}
   {loadError && <p role="alert">{{pt:'Não foi possível carregar o histórico de visitas e tarefas. Tente novamente.',es:'No se pudo cargar el historial de visitas y tareas. Inténtalo de nuevo.',en:'Could not load visit and task history. Please try again.'}[language]}</p>}
   {!entries.length && <p>{empty}</p>}
   {entries.map(item=><article className="dashboard-history-item" key={item.id}>
    <time>{new Date(item.createdAt).toLocaleString(language)}</time>
    <h3>{item.heading || (item.changes ? updated : kinds[item.kind] || item.text)}</h3>
    {item.heading && <p>{item.text}</p>}
    {item.kind && <p>{[item.propertyRef,item.text].filter(Boolean).join(' · ')}</p>}
    {item.changes?.map(c=><div className="history-change" key={c.field}><strong>{c.field.split('.').map(k=>eventFields[k] || labels[k] || k).join(' · ')}</strong><span>{before}: {c.before || '—'}</span><span>{after}: {c.after || '—'}</span></div>)}
   </article>)}
 </section>
}
