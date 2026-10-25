import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import Tasks from './Tasks'
import { filterTasks, saveTask } from '../lib/tasks'

beforeEach(() => localStorage.clear())
it('creates, persists, edits, completes and reopens a linked task', async () => {
  const user = userEvent.setup()
  const props = { language: 'pt', clients: [{ id: 'c1', name: 'Ana' }], leads: [], properties: [] }
  const view = render(<Tasks {...props} />)
  await user.click(screen.getByRole('button', { name: 'Nova tarefa' }))
  await waitFor(() => expect(screen.getByLabelText('Título')).toBeEnabled())
  await user.type(screen.getByLabelText('Título'), 'Ligar para Ana')
  await user.selectOptions(screen.getByLabelText('Cliente'), 'c1')
  await user.click(screen.getByRole('button', { name: 'Salvar tarefa' }))
  expect(await screen.findByRole('heading', { name: 'Ligar para Ana' })).toBeInTheDocument()
  expect(screen.getByText('Ana')).toBeVisible()
  expect(screen.queryByRole('button', { name: 'Ver detalhes' })).toBeNull()
  await user.click(screen.getByRole('button', { name: 'Editar tarefa' }))
  await user.type(screen.getByLabelText('Título'), ' amanhã')
  await user.click(screen.getByRole('button', { name: 'Salvar tarefa' }))
  await user.click(screen.getByRole('button', { name: 'Concluir' }))
  await user.click(screen.getByRole('button', { name: /Concluídas/ }))
  await user.click(screen.getByRole('button', { name: 'Reabrir' }))
  view.unmount()
  render(<Tasks {...props} />)
  expect(await screen.findByRole('heading', { name: 'Ligar para Ana amanhã' })).toBeInTheDocument()
})
it('separates overdue and today by calendar date, excluding completed tasks', () => {
  const tasks = [
    { id: 1, due_date: '2026-10-09', status: 'pending', priority: 'high' },
    { id: 2, due_date: '2026-10-10', status: 'pending', priority: 'low' },
    { id: 3, due_date: '2026-10-08', status: 'completed', priority: 'high' },
  ]
  expect(filterTasks(tasks, 'overdue', '2026-10-10').map(t => t.id)).toEqual([1])
  expect(filterTasks(tasks, 'today', '2026-10-10').map(t => t.id)).toEqual([2])
})
it('propagates database write failures without local fallback', async () => {
  const database = { from: () => ({ upsert: () => ({ select: () => ({ single: async () => ({ error: new Error('denied') }) }) }) }) }
  await expect(saveTask({ title: 'Call' }, database, true)).rejects.toThrow('denied')
  expect(localStorage.length).toBe(0)
})

it('saves edits and completes a task opened from the calendar', async () => {
  const user = userEvent.setup()
  const today = new Date()
  const day = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`
  await saveTask({id:'calendar-task', title:'Calendar task', due_date:day, priority:'high', status:'pending'})
  render(<Tasks language="pt" clients={[]} leads={[]} properties={[]} />)
  await user.click(await screen.findByRole('button', {name:'Calendar task Alta'}))
  expect(within(screen.getByRole('dialog')).getByRole('link', {name:'Adicionar ao Google Agenda'})).toHaveAttribute('href', expect.stringContaining('calendar.google.com'))
  await user.clear(screen.getByLabelText('Título'))
  await user.type(screen.getByLabelText('Título'), 'Updated calendar task')
  await user.click(within(screen.getByRole('dialog')).getByRole('button', {name:'Concluir'}))
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  expect(screen.getByRole('button', {name:'Updated calendar task Concluída'})).toBeVisible()
  await user.click(screen.getByRole('button', {name:/Concluídas/}))
  expect(screen.getByRole('heading', {name:'Updated calendar task'})).toBeVisible()
})

it('confirms task deletion and removes it from local storage and the dashboard', async () => {
  const user = userEvent.setup()
  await saveTask({ id: 'delete-task', title: 'Task to remove', due_date: '2026-10-25', priority: 'medium', status: 'pending' })
  const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)
  render(<Tasks language="pt" clients={[]} leads={[]} properties={[]} />)
  expect(await screen.findByRole('heading', { name: 'Task to remove' })).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Excluir tarefa' })).not.toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Editar tarefa' }))
  const editor = screen.getByRole('dialog')
  await user.click(within(editor).getByRole('button', { name: 'Excluir tarefa' }))
  await waitFor(() => expect(screen.queryByRole('heading', { name: 'Task to remove' })).not.toBeInTheDocument())
  expect(JSON.parse(localStorage.getItem('kohaus-dashboard-tasks-v1'))).toEqual([])
  expect(confirm).toHaveBeenCalled()
  confirm.mockRestore()
})
