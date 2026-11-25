import { useEffect, useState } from 'react'
import { fetchTasks, filterTasks, localDate, updateTaskStatus } from '../lib/tasks'

export const commercialText = {
 pt: { title:'Agenda comercial do dia', leads:'Leads sem primeiro contato', tasks:'Tarefas', visits:'Visitas', empty:'Nenhum', follow:'Agendar próximo contato', task:'Próximo contato', clear:'Ver todas as oportunidades', error:'Não foi possível carregar as tarefas.', loading:'Carregando…' },
 es: { title:'Agenda comercial del día', leads:'Leads sin primer contacto', tasks:'Tareas', visits:'Visitas', empty:'Ninguno', follow:'Programar próximo contacto', task:'Próximo contacto', clear:'Ver todas las oportunidades', error:'No se pudieron cargar las tareas.', loading:'Cargando…' },
 en: { title:'Daily sales agenda', leads:'Leads awaiting first contact', tasks:'Tasks', visits:'Viewings', empty:'None', follow:'Schedule next contact', task:'Follow up', clear:'View all opportunities', error:'Could not load tasks.', loading:'Loading…' },
}

export default function CommercialAgenda({language, leads, visits, onLead, onTask, onVisit}) {
 const c = commercialText[language]
 const [tasks,setTasks] = useState(null)
 const [error,setError] = useState(false)
 const [statusError,setStatusError] = useState(false)
 const [savingTask,setSavingTask] = useState(null)
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
   pt:{today:'Hoje',week:'Semana da agenda',previous:'Semana anterior',next:'Próxima semana'},
   es:{today:'Hoy',week:'Semana de la agenda',previous:'Semana anterior',next:'Semana siguiente'},
   en:{today:'Today',week:'Agenda week',previous:'Previous week',next:'Next week'},
 }[language]
 const taskStatus = {
   pt:{label:'Status da tarefa',pending:'Pendente',completed:'Concluída',error:'Não foi possível atualizar a tarefa.'},
   es:{label:'Estado de la tarea',pending:'Pendiente',completed:'Completada',error:'No se pudo actualizar la tarea.'},
   en:{label:'Task status',pending:'Pending',completed:'Completed',error:'Could not update the task.'},
 }[language]
 const date = value=>new Date(value).toLocaleDateString(language)
 const upcomingVisits=visits.filter(v=>['scheduled','confirmed'].includes(v.status))
 const allTasks=filterTasks(tasks || [],'all')
 const scheduledDays=new Set([...allTasks.map(t=>t.due_date),...upcomingVisits.map(v=>localDate(new Date(v.scheduledAt)))])
 const groups = [
   {
     kind:'task',
     label:c.tasks,
     items:allTasks.filter(task=>task.due_date===activeDate),
     name:task=>task.title,
     open:onTask,
     empty:error ? c.error : tasks ? c.empty : c.loading,
   },
   {
     kind:'visit',
     label:c.visits,
     items:upcomingVisits.filter(visit=>localDate(new Date(visit.scheduledAt))===activeDate)
       .sort((a,b)=>new Date(a.scheduledAt)-new Date(b.scheduledAt)),
     name:visit=>visit.contactName,
     detail:visit=>new Date(visit.scheduledAt).toLocaleTimeString(language,{hour:'2-digit',minute:'2-digit'}),
     open:onVisit,
     empty:c.empty,
   },
   {
     kind:'lead',
     label:c.leads,
     items:leads.filter(lead=>lead.status==='nuevo'),
     name:lead=>[lead.name,lead.surname].filter(Boolean).join(' '),
     detail:lead=>date(lead.createdAt),
     open:onLead,
     empty:c.empty,
   },
 ]
 async function changeTaskStatus(task, status) {
   if (savingTask || task.status === status) return
   setSavingTask(task.id)
   setStatusError(false)
   try {
     const saved = await updateTaskStatus(task.id, status)
     setTasks(current=>current.map(item=>item.id===saved.id ? saved : item))
   } catch {
     setStatusError(true)
   } finally {
     setSavingTask(null)
   }
 }
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
   {groups.map(group=><section className="agenda-activity" key={group.kind} aria-label={group.label}>
     <h3>{group.label}<span>{group.items.length}</span></h3>
     {group.items.map(item=>group.kind==='task' ? <div className="agenda-task-row" key={item.id}>
       <button className="agenda-activity-row" type="button" onClick={()=>group.open(item)}><strong>{group.name(item)}</strong></button>
       <select aria-label={`${taskStatus.label}: ${item.title}`} value={item.status} disabled={Boolean(savingTask)}
         onChange={event=>changeTaskStatus(item,event.target.value)}>
         <option value="pending">{taskStatus.pending}</option>
         <option value="completed">{taskStatus.completed}</option>
       </select>
     </div> : <button className={`agenda-activity-row${group.kind==='visit'?' agenda-visit-row':''}`} type="button" key={item.id} onClick={()=>group.open(item)}>
       {group.kind==='visit' && <time dateTime={item.scheduledAt}>{group.detail(item)}</time>}
       <strong>{group.name(item)}</strong>
       {group.kind==='lead' && <span>{group.detail(item)}</span>}
     </button>)}
     {!group.items.length && <p>{group.empty}</p>}
     {group.kind==='task' && statusError && <p role="alert">{taskStatus.error}</p>}
   </section>)}
 </section>
}
