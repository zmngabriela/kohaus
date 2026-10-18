import TaskCalendar, { taskCalendarLink } from './TaskCalendar'
import EditorDialog from './EditorDialog'
import CrmRecord from './CrmRecord'
import { useEffect, useState } from 'react'
import { fetchTasks, filterTasks, localDate, saveTask } from '../lib/tasks'
import './Tasks.css'

const texts = {
  pt: { title: 'Tarefas', intro: 'Organize os próximos passos e acompanhe seus prazos.', new: 'Nova tarefa', edit: 'Editar tarefa', name: 'Título', due: 'Prazo', priority: 'Prioridade', low: 'Baixa', medium: 'Média', high: 'Alta', client: 'Cliente', lead: 'Lead', property: 'Imóvel', none: 'Sem vínculo', save: 'Salvar tarefa', cancel: 'Cancelar', pending: 'Pendentes', today: 'Hoje', overdue: 'Atrasadas', completed: 'Concluídas', all: 'Todas', empty: 'Nenhuma tarefa nesta lista.', complete: 'Concluir', reopen: 'Reabrir', loading: 'Carregando tarefas…', error: 'Não foi possível acessar ou salvar as tarefas. Tente novamente. Se o problema persistir, verifique a configuração da tabela de tarefas.', retry: 'Tentar novamente' },
  es: { title: 'Tareas', intro: 'Organiza los próximos pasos y controla tus plazos.', new: 'Nueva tarea', edit: 'Editar tarea', name: 'Título', due: 'Fecha límite', priority: 'Prioridad', low: 'Baja', medium: 'Media', high: 'Alta', client: 'Cliente', lead: 'Lead', property: 'Inmueble', none: 'Sin vínculo', save: 'Guardar tarea', cancel: 'Cancelar', pending: 'Pendientes', today: 'Hoy', overdue: 'Atrasadas', completed: 'Completadas', all: 'Todas', empty: 'No hay tareas en esta lista.', complete: 'Completar', reopen: 'Reabrir', loading: 'Cargando tareas…', error: 'No se pudieron cargar o guardar las tareas. Inténtalo de nuevo. Si el problema persiste, revisa la configuración de la tabla de tareas.', retry: 'Reintentar' },
  en: { title: 'Tasks', intro: 'Organize next steps and keep track of deadlines.', new: 'New task', edit: 'Edit task', name: 'Title', due: 'Due date', priority: 'Priority', low: 'Low', medium: 'Medium', high: 'High', client: 'Client', lead: 'Lead', property: 'Property', none: 'Unlinked', save: 'Save task', cancel: 'Cancel', pending: 'Pending', today: 'Today', overdue: 'Overdue', completed: 'Completed', all: 'All', empty: 'No tasks in this list.', complete: 'Complete', reopen: 'Reopen', loading: 'Loading tasks…', error: 'Could not load or save tasks. Try again. If the problem persists, check the tasks table configuration.', retry: 'Retry' },
}
const blank = () => ({ title: '', due_date: localDate(), priority: 'medium', status: 'pending', client_id: null, lead_id: null, property_id: null })
const person = item => [item.name, item.surname].filter(Boolean).join(' ')
export default function Tasks({ language, clients, leads, properties }) {
  const c = texts[language] || texts.es
  const [tasks, setTasks] = useState([])
  const [form, setForm] = useState(blank)
  const [editorOpen, setEditorOpen] = useState(false)
  const [filter, setFilter] = useState('pending')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(false)
  const [retry, setRetry] = useState(0)
  useEffect(() => {
    let active = true
    fetchTasks().then(data => { if (active) setTasks(data) }).catch(() => { if (active) setError(true) }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [retry])
  async function persist(task, reset = false) {
    setBusy(true)
    setError(false)
    try {
      const saved = await saveTask(task)
      setTasks(current => [...current.filter(t => t.id !== saved.id), saved])
      if (reset) { setForm(blank()); setEditorOpen(false) }
    } catch { setError(true) } finally { setBusy(false) }
  }
  const links = [['client_id', 'client', clients, person], ['lead_id', 'lead', leads, person], ['property_id', 'property', properties, p => `${p.reference || ''} ${p.title}`.trim()]]
  return <section className="dashboard-section tasks-section">
    <div className="dashboard-properties-head"><div><p className="section-label dashboard-label">{c.title}</p><h2>{c.intro}</h2></div></div>
    {error && <div role="alert" className="tasks-error">{c.error} <button type="button" onClick={() => { setLoading(true); setError(false); setRetry(n => n + 1) }} disabled={busy}>{c.retry}</button></div>}
    <div className="dashboard-property-panel"><p>{c.intro}</p><button type="button" className="dashboard-property-cta" onClick={() => { setForm(blank()); setEditorOpen(true) }}>{c.new}</button></div>
    {editorOpen && <EditorDialog title={form.id ? c.edit : c.new} closeLabel={c.cancel} busy={busy} onClose={() => { setForm(blank()); setEditorOpen(false) }}>
    {error && <p role="alert">{c.error}</p>}
    <form className="tasks-form" onSubmit={e => { e.preventDefault(); if (form.title.trim()) persist({ ...form, status: e.nativeEvent.submitter?.value === 'complete' ? 'completed' : form.status, id: form.id || `task-${crypto.randomUUID()}` }, true) }}>
      <fieldset disabled={loading || busy}>
        <label className="tasks-wide">{c.name}<input required maxLength={200} value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></label>
        <label>{c.due}<input type="date" required value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} /></label>
        <label>{c.priority}<select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}>{['low', 'medium', 'high'].map(v => <option key={v} value={v}>{c[v]}</option>)}</select></label>
        {links.map(([key, label, items, name]) => <label key={key}>{c[label]}<select value={form[key] || ''} onChange={e => setForm({ ...form, [key]: e.target.value || null })}><option value="">{c.none}</option>{items.map(item => <option key={item.id} value={item.id}>{name(item)}</option>)}</select></label>)}
        <div className="tasks-actions tasks-wide">{form.title.trim() && form.due_date && <a className="task-calendar-link" href={taskCalendarLink(form)} target="_blank" rel="noreferrer">{{pt:'Adicionar ao Google Agenda',es:'Añadir a Google Calendar',en:'Add to Google Calendar'}[language]}</a>}<button type="submit" className="button button-primary">{c.save}</button>{form.id && form.status !== 'completed' && <button type="submit" name="action" value="complete">{c.complete}</button>}<button type="button" onClick={() => { setForm(blank()); setEditorOpen(false) }}>{c.cancel}</button></div>
      </fieldset>
    </form></EditorDialog>}
    <TaskCalendar tasks={tasks} language={language} disabled={busy} onEdit={task => { setForm(task); setEditorOpen(true) }} />
    <p className="task-calendar-hint">{{pt:'O calendário acompanha as tarefas automaticamente. Adicionar ao Google Agenda abre um evento para salvar; alterações posteriores não são sincronizadas.',es:'El calendario refleja las tareas automáticamente. Añadir a Google Calendar abre un evento para guardar; los cambios posteriores no se sincronizan.',en:'This calendar updates with your tasks. Adding to Google Calendar opens an event to save; later changes are not synced.'}[language]}</p>
    <div className="tasks-filters" aria-label={c.title}>{['pending', 'today', 'overdue', 'completed', 'all'].map(value => <button type="button" key={value} aria-pressed={filter === value} onClick={() => setFilter(value)}>{c[value]} <span>{filterTasks(tasks, value).length}</span></button>)}</div>
    {loading ? <p role="status">{c.loading}</p> : <div className="tasks-list">{filterTasks(tasks, filter).map(task => <CrmRecord key={task.id} language={language} title={task.title}
      meta={<span className="task-emphasis"><strong className={task.status === 'pending' && task.due_date < localDate() ? 'task-deadline is-overdue' : 'task-deadline'}>{c.due}: {new Intl.DateTimeFormat(language).format(new Date(`${task.due_date}T12:00:00`))}</strong><span className={`task-priority priority-${task.priority}`}>{c.priority}: {c[task.priority]}</span></span>}
      status={task.status === 'pending' && task.due_date < localDate() ? c.overdue : c[task.status]}
      fields={links.map(([key, label, items, name]) => ({ label: c[label], value: items.find(item => item.id === task[key]) ? name(items.find(item => item.id === task[key])) : c.none }))}
      editLabel={c.edit} disabled={busy} onEdit={() => { setForm(task); setEditorOpen(true) }}
      actions={<><a href={taskCalendarLink(task)} target="_blank" rel="noreferrer">{{pt:"Adicionar ao Google Agenda",es:"Añadir a Google Calendar",en:"Add to Google Calendar"}[language]}</a><button disabled={busy} type="button" className="dashboard-property-edit" onClick={() => persist({ ...task, status: task.status === 'pending' ? 'completed' : 'pending' })}>{task.status === 'pending' ? c.complete : c.reopen}</button></>}>
</CrmRecord>)}{!error && !filterTasks(tasks, filter).length && <p>{c.empty}</p>}</div>}
  </section>
}
