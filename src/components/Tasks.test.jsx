import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Tasks from './Tasks'
import { filterTasks, saveTask } from '../lib/tasks'

beforeEach(() => localStorage.clear())
it('creates, persists, edits, completes and reopens a linked task', async () => {
  const user = userEvent.setup()
  const props = { language: 'pt', clients: [{ id: 'c1', name: 'Ana' }], leads: [], properties: [] }
  const view = render(<Tasks {...props} />)
  await waitFor(() => expect(screen.getByLabelText('Título')).toBeEnabled())
  await user.type(screen.getByLabelText('Título'), 'Ligar para Ana')
  await user.selectOptions(screen.getByLabelText('Cliente'), 'c1')
  await user.click(screen.getByRole('button', { name: 'Salvar tarefa' }))
  expect(await screen.findByText('Ligar para Ana')).toBeInTheDocument()
  expect(screen.getByText('Cliente: Ana')).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Editar tarefa' }))
  await user.type(screen.getByLabelText('Título'), ' amanhã')
  await user.click(screen.getByRole('button', { name: 'Salvar tarefa' }))
  await user.click(screen.getByRole('button', { name: 'Concluir' }))
  await user.click(screen.getByRole('button', { name: /Concluídas/ }))
  await user.click(screen.getByRole('button', { name: 'Reabrir' }))
  view.unmount()
  render(<Tasks {...props} />)
  expect(await screen.findByText('Ligar para Ana amanhã')).toBeInTheDocument()
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
