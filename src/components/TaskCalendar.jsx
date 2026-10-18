import { useState } from 'react'
import { localDate } from '../lib/tasks'

export function taskCalendarLink(task) {
  const start = new Date(`${task.due_date}T12:00:00`)
  const end = new Date(start)
  end.setDate(end.getDate() + 1)
  return `https://calendar.google.com/calendar/render?${new URLSearchParams({
    action: 'TEMPLATE', text: task.title,
    dates: `${localDate(start).replaceAll('-', '')}/${localDate(end).replaceAll('-', '')}`,
    details: 'KOHAUS CRM',
  })}`
}

export default function TaskCalendar({ tasks, language, onEdit, disabled }) {
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1))
  const c = {
    pt: ['Calendário de tarefas', 'Mês anterior', 'Próximo mês', 'Hoje', 'Alta', 'Média', 'Baixa', 'Concluída'],
    es: ['Calendario de tareas', 'Mes anterior', 'Mes siguiente', 'Hoy', 'Alta', 'Media', 'Baja', 'Completada'],
    en: ['Task calendar', 'Previous month', 'Next month', 'Today', 'High', 'Medium', 'Low', 'Completed'],
  }[language] || []
  const offset = (month.getDay() + 6) % 7
  const count = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()
  const cells = Array.from({length: Math.ceil((offset + count) / 7) * 7}, (_, i) => new Date(month.getFullYear(), month.getMonth(), i - offset + 1))
  const shift = delta => setMonth(new Date(month.getFullYear(), month.getMonth() + delta, 1))
  return <section className="task-calendar" aria-label={c[0]}>
    <div className="task-calendar-head"><h3>{new Intl.DateTimeFormat(language, {month:'long', year:'numeric'}).format(month)}</h3><div>
      <button type="button" aria-label={c[1]} onClick={() => shift(-1)}>←</button>
      <button type="button" onClick={() => setMonth(new Date(new Date().getFullYear(), new Date().getMonth(), 1))}>{c[3]}</button>
      <button type="button" aria-label={c[2]} onClick={() => shift(1)}>→</button>
    </div></div>
    <div className="task-calendar-scroll"><table><caption>{c[0]}</caption><thead><tr>{Array.from({length:7}, (_, i) => <th key={i} scope="col">{new Intl.DateTimeFormat(language, {weekday:'short'}).format(new Date(2026, 0, 5 + i))}</th>)}</tr></thead>
      <tbody>{Array.from({length:cells.length / 7}, (_, week) => <tr key={week}>{cells.slice(week * 7, week * 7 + 7).map(date => {
        const day = localDate(date)
        return <td key={day} className={date.getMonth() !== month.getMonth() ? 'outside-month' : ''}><time dateTime={day} aria-current={day === localDate() ? 'date' : undefined}>{date.getDate()}</time>
          {tasks.filter(task => task.due_date === day).map(task => <button type="button" key={task.id} disabled={disabled} className={`task-calendar-event priority-${task.priority}${task.status === 'completed' ? ' is-complete' : ''}`} onClick={() => onEdit(task)}>
            <strong>{task.title}</strong>{' '}<small>{task.status === 'completed' ? c[7] : c[{high:4,medium:5,low:6}[task.priority]]}</small>
          </button>)}
        </td>
      })}</tr>)}</tbody>
    </table></div>
  </section>
}
