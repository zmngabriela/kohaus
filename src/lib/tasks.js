import { hasSupabaseConfig, supabase } from './supabase'

const KEY = 'kohaus-dashboard-tasks-v1'
export function localDate(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}
export function filterTasks(tasks, filter, today = localDate()) {
  return tasks.filter(t => filter === 'all' || (filter === 'completed' ? t.status === 'completed' :
    t.status === 'pending' && (filter === 'pending' || (filter === 'today' ? t.due_date === today : t.due_date < today))))
    .sort((a, b) => a.due_date.localeCompare(b.due_date) || ['high', 'medium', 'low'].indexOf(a.priority) - ['high', 'medium', 'low'].indexOf(b.priority))
}
export async function fetchTasks(database = supabase, enabled = hasSupabaseConfig) {
  if (!enabled) return JSON.parse(localStorage.getItem(KEY) || '[]')
  const { data, error } = await database.from('dashboard_tasks').select('*').order('due_date')
  if (error) throw error
  return data
}
export async function saveTask(task, database = supabase, enabled = hasSupabaseConfig) {
  const record = { ...task, title: task.title.trim() }
  if (!record.title) throw new Error('Title is required')
  if (!enabled) {
    const tasks = await fetchTasks(database, false)
    localStorage.setItem(KEY, JSON.stringify([...tasks.filter(t => t.id !== record.id), record]))
    return record
  }
  const { data, error } = await database.from('dashboard_tasks').upsert(record).select().single()
  if (error) throw error
  return data
}
