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
      if (reset) setForm(blank())
    } catch { setError(true) } finally { setBusy(false) }
  }
  const links = [['client_id', 'client', clients, person], ['lead_id', 'lead', leads, person], ['property_id', 'property', properties, p => `${p.reference || ''} ${p.title}`.trim()]]
  return <section className="dashboard-section tasks-section">
    <div className="dashboard-panel-head"><div><p className="section-label dashboard-label">{c.title}</p><h2>{c.intro}</h2></div></div>
    {error && <div role="alert" className="tasks-error">{c.error} <button type="button" onClick={() => { setLoading(true); setError(false); setRetry(n => n + 1) }} disabled={busy}>{c.retry}</button></div>}
    <form className="tasks-form" onSubmit={e => { e.preventDefault(); if (form.title.trim()) persist({ ...form, id: form.id || `task-${crypto.randomUUID()}` }, true) }}>
      <h3>{form.id ? c.edit : c.new}</h3>
      <fieldset disabled={loading || busy}>
        <label className="tasks-wide">{c.name}<input required maxLength={200} value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></label>
        <label>{c.due}<input type="date" required value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} /></label>
        <label>{c.priority}<select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}>{['low', 'medium', 'high'].map(v => <option key={v} value={v}>{c[v]}</option>)}</select></label>
        {links.map(([key, label, items, name]) => <label key={key}>{c[label]}<select value={form[key] || ''} onChange={e => setForm({ ...form, [key]: e.target.value || null })}><option value="">{c.none}</option>{items.map(item => <option key={item.id} value={item.id}>{name(item)}</option>)}</select></label>)}
        <div className="tasks-actions tasks-wide"><button type="submit" className="button button-primary">{c.save}</button>{form.id && <button type="button" onClick={() => setForm(blank())}>{c.cancel}</button>}</div>
      </fieldset>
    </form>
    <div className="tasks-filters" aria-label={c.title}>{['pending', 'today', 'overdue', 'completed', 'all'].map(value => <button type="button" key={value} aria-pressed={filter === value} onClick={() => setFilter(value)}>{c[value]} <span>{filterTasks(tasks, value).length}</span></button>)}</div>
    {loading ? <p role="status">{c.loading}</p> : <div className="tasks-list">{filterTasks(tasks, filter).map(task => <article className="task-card" key={task.id}>
      <div><div className="tasks-meta"><span data-priority={task.priority}>{c[task.priority]}</span><span>{c[task.status]}</span>{task.status === 'pending' && task.due_date < localDate() && <strong>{c.overdue}</strong>}</div><h3>{task.title}</h3><p>{c.due}: {new Intl.DateTimeFormat(language).format(new Date(`${task.due_date}T12:00:00`))}</p>
      {links.map(([key, label, items, name]) => { const item = items.find(i => i.id === task[key]); return item ? <p key={key}>{c[label]}: {name(item)}</p> : null })}</div>
      <div className="tasks-actions"><button disabled={busy} type="button" onClick={() => persist({ ...task, status: task.status === 'pending' ? 'completed' : 'pending' })}>{task.status === 'pending' ? c.complete : c.reopen}</button><button disabled={busy} type="button" onClick={() => { setForm(task); document.querySelector('.tasks-form')?.scrollIntoView?.({ behavior: 'smooth', block: 'start' }) }}>{c.edit}</button></div>
    </article>)}{!error && !filterTasks(tasks, filter).length && <p>{c.empty}</p>}</div>}
  </section>
}
