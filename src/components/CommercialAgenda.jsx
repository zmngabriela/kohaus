import { useEffect, useState } from 'react'
import { fetchTasks, filterTasks, localDate } from '../lib/tasks'

export const commercialText = {
 pt: { title:'Agenda comercial do dia', leads:'Leads sem primeiro contato', overdue:'Tarefas vencidas', today:'Tarefas de hoje', visits:'Visitas de hoje', empty:'Nenhum', follow:'Agendar próximo contato', task:'Próximo contato', clear:'Ver todas as oportunidades', error:'Não foi possível carregar as tarefas.', loading:'Carregando…' },
 es: { title:'Agenda comercial del día', leads:'Leads sin primer contacto', overdue:'Tareas vencidas', today:'Tareas de hoy', visits:'Visitas de hoy', empty:'Ninguno', follow:'Programar próximo contacto', task:'Próximo contacto', clear:'Ver todas las oportunidades', error:'No se pudieron cargar las tareas.', loading:'Cargando…' },
 en: { title:'Daily sales agenda', leads:'Leads awaiting first contact', overdue:'Overdue tasks', today:"Today’s tasks", visits:"Today’s visits", empty:'None', follow:'Schedule next contact', task:'Follow up', clear:'View all opportunities', error:'Could not load tasks.', loading:'Loading…' },
}

export default function CommercialAgenda({language, leads, visits, onLead, onTask, onVisit}) {
 const c = commercialText[language]
 const [tasks,setTasks] = useState(null)
 const [error,setError] = useState(false)
 const [today,setToday] = useState(localDate)
 useEffect(()=>{
   let active = true
   fetchTasks().then(rows=>{if(active)setTasks(rows)}).catch(()=>{if(active)setError(true)})
   const timer = setInterval(()=>setToday(localDate()),60000)
   return ()=>{active=false;clearInterval(timer)}
 },[])
 const date = value=>new Date(value).toLocaleDateString(language)
 const taskSection = (label,filter)=>({label,open:onTask,items:filterTasks(tasks || [],filter,today),name:t=>t.title,detail:t=>date(t.due_date+'T12:00:00'),message:error?c.error:tasks?null:c.loading})
 const groups = [
   {label:c.leads,open:onLead,items:leads.filter(l=>l.status==='nuevo'),name:l=>[l.name,l.surname].join(' '),detail:l=>date(l.createdAt)},
   taskSection(c.overdue,'overdue'), taskSection(c.today,'today'),
   {label:c.visits,open:onVisit,items:visits.filter(v=>['scheduled','confirmed'].includes(v.status) && localDate(new Date(v.scheduledAt))===today).sort((a,b)=>new Date(a.scheduledAt)-new Date(b.scheduledAt)),name:v=>v.contactName,detail:v=>new Date(v.scheduledAt).toLocaleTimeString(language,{hour:'2-digit',minute:'2-digit'})},
 ]
 return <section className="commercial-agenda"><h2>{c.title}</h2><div className="agenda-groups">{groups.map(g=><section key={g.label}>
   <h3>{g.label}</h3>{g.items.map(item=><button key={item.id} type="button" onClick={()=>g.open(item)}><strong>{g.name(item)}</strong><span>{g.detail(item)}</span></button>)}
   {!g.items.length && <p>{g.message || c.empty}</p>}
 </section>)}</div></section>
}
