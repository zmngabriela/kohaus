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
 const [selectedDate,setSelectedDate] = useState(null)
 useEffect(()=>{
   let active = true
   fetchTasks().then(rows=>{if(active)setTasks(rows)}).catch(()=>{if(active)setError(true)})
   const timer = setInterval(()=>setToday(localDate()),60000)
   return ()=>{active=false;clearInterval(timer)}
 },[])
 const activeDate = selectedDate || today
 const activeDay = new Date(activeDate+'T12:00:00')
 const weekStart = new Date(activeDay)
 weekStart.setDate(activeDay.getDate() - (activeDay.getDay()+6)%7)
 const days = Array.from({length:7},(_,offset)=>{
   const day = new Date(weekStart)
   day.setDate(weekStart.getDate()+offset)
   return day
 })
 const ui = {
   pt:{today:'Hoje',week:'Semana da agenda',previous:'Semana anterior',next:'Próxima semana',empty:'Sem visitas ou tarefas para este dia.',task:'Tarefa',visit:'Visita',pending:'Pendências'},
   es:{today:'Hoy',week:'Semana de la agenda',previous:'Semana anterior',next:'Semana siguiente',empty:'Sin visitas ni tareas para este día.',task:'Tarea',visit:'Visita',pending:'Pendientes'},
   en:{today:'Today',week:'Agenda week',previous:'Previous week',next:'Next week',empty:'No visits or tasks for this day.',task:'Task',visit:'Viewing',pending:'Needs attention'},
 }[language]
 const date = value=>new Date(value).toLocaleDateString(language)
 const upcomingVisits=visits.filter(v=>['scheduled','confirmed'].includes(v.status))
 const pendingTasks=filterTasks(tasks || [],'pending')
 const scheduledDays=new Set([...pendingTasks.map(t=>t.due_date),...upcomingVisits.map(v=>localDate(new Date(v.scheduledAt)))])
 const dailyItems=[
   ...upcomingVisits.filter(v=>localDate(new Date(v.scheduledAt))===activeDate)
     .sort((a,b)=>new Date(a.scheduledAt)-new Date(b.scheduledAt))
     .map(v=>({id:`visit:${v.id}`,name:v.contactName,kind:ui.visit,detail:new Date(v.scheduledAt).toLocaleTimeString(language,{hour:'2-digit',minute:'2-digit'}),open:()=>onVisit(v)})),
   ...pendingTasks.filter(t=>t.due_date===activeDate)
     .map(t=>({id:`task:${t.id}`,name:t.title,kind:ui.task,open:()=>onTask(t)})),
 ]
 const pendingGroups = [
   {label:c.overdue,items:filterTasks(tasks || [],'overdue',today),name:t=>t.title,detail:t=>date(t.due_date+'T12:00:00'),open:onTask},
   {label:c.leads,items:leads.filter(l=>l.status==='nuevo'),name:l=>[l.name,l.surname].join(' '),detail:l=>date(l.createdAt),open:onLead},
 ]
 function moveWeek(delta){
   const next = new Date(activeDay)
   next.setDate(next.getDate()+delta*7)
   setSelectedDate(localDate(next))
 }
 return <section className="commercial-agenda" aria-label={ui.week}>
   <div className="agenda-calendar">
     <div className="agenda-calendar-head">
       <h3>{activeDay.toLocaleDateString(language,{weekday:'long',day:'numeric',month:'long'})}</h3>
       <div className="agenda-week-actions">
         <button type="button" onClick={()=>moveWeek(-1)} aria-label={ui.previous}>‹</button>
         <button type="button" onClick={()=>setSelectedDate(null)}>{ui.today}</button>
         <button type="button" onClick={()=>moveWeek(1)} aria-label={ui.next}>›</button>
       </div>
     </div>
     <div className="agenda-week" role="group" aria-label={ui.week}>{days.map(day=>{
       const key=localDate(day)
       return <button key={key} type="button" aria-label={day.toLocaleDateString(language,{dateStyle:'full'})}
         aria-pressed={key===activeDate} aria-current={key===today?'date':undefined}
         className={scheduledDays.has(key)?'has-activity':undefined} onClick={()=>setSelectedDate(key)}>
         <span>{day.toLocaleDateString(language,{weekday:'short'})}</span><strong>{day.getDate()}</strong>
       </button>
     })}</div>
   </div>
   <div className="agenda-activity">
     {dailyItems.map(item=><button className="agenda-activity-row" type="button" key={item.id} onClick={item.open}>
       <span><small>{item.kind}</small><strong>{item.name}</strong></span>{item.detail&&<time>{item.detail}</time>}
     </button>)}
     {!dailyItems.length && <p>{error?c.error:tasks?ui.empty:c.loading}</p>}
     {dailyItems.length>0 && error && <p role="status">{c.error}</p>}
   </div>
   <div className="agenda-pending" aria-label={ui.pending}>{pendingGroups.map(group=><section className="agenda-pending-group" key={group.label}>
     <h3><span>{group.label}</span><strong>{group.items.length}</strong></h3>
     {group.items.map(item=><button className="agenda-pending-card" type="button" key={item.id} onClick={()=>group.open(item)}>
       <strong>{group.name(item)}</strong><span>{group.detail(item)}</span>
     </button>)}
     {!group.items.length && <p>{group.label===c.overdue && error?c.error:group.label===c.overdue && !tasks?c.loading:c.empty}</p>}
   </section>)}</div>
 </section>
}
