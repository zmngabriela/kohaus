import { hasSupabaseConfig, supabase } from './supabase'

export async function fetchCommercialActivity(id, client, database = supabase, enabled = hasSupabaseConfig) {
  if (!enabled) return []
  const { data, error } = await database.from('dashboard_activity_events').select('*')
    .contains(client ? 'client_ids' : 'property_ids', [id]).order('created_at', { ascending: false })
  if (error) throw error
  return data
}

const words = {
  pt: { visit: 'Visita', task: 'Tarefa', created: 'Criada', updated: 'Atualizada', deleted: 'Excluída', snapshot: 'Registro existente', pending: 'Pendente', completed: 'Concluída' },
  es: { visit: 'Visita', task: 'Tarea', created: 'Creada', updated: 'Actualizada', deleted: 'Eliminada', snapshot: 'Registro existente', pending: 'Pendiente', completed: 'Completada' },
  en: { visit: 'Visit', task: 'Task', created: 'Created', updated: 'Updated', deleted: 'Deleted', snapshot: 'Existing record', pending: 'Pending', completed: 'Completed' },
}
export function activityHistoryEntry(event, language, labels = {}) {
  const w = words[language] || words.es
  const data = event.after_data || event.before_data || {}
  const fields = ['title', 'status', 'scheduled_at', 'due_date', 'duration_minutes', 'priority', 'notes', 'location', 'client_id', 'property_id', 'lead_id']
  const display = value => labels[value] || w[value] || String(value ?? '')
  const changes = event.action === 'updated' ? fields.filter(field =>
    (event.before_data?.[field] ?? '') !== (event.after_data?.[field] ?? '')
  ).map(field => ({field, before: display(event.before_data?.[field]), after: display(event.after_data?.[field])})) : undefined
  return {id: event.id, createdAt: event.created_at,
    heading: [w[event.source_type], w[event.action], data.title].filter(Boolean).join(' · '),
    text: [display(data.status), data.scheduled_at || data.due_date, data.notes].filter(Boolean).join(' · '),
    changes, actorId: event.actor_id}
}
