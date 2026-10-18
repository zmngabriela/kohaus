import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it, vi } from 'vitest'
import TaskCalendar, { taskCalendarLink } from './TaskCalendar'
import { localDate } from '../lib/tasks'

it('updates events from tasks and opens the selected task', async () => {
  const onEdit = vi.fn()
  const task = { id:'one', title:'Call client', due_date:localDate(), priority:'high', status:'pending' }
  const view = render(<TaskCalendar tasks={[task]} language="en" onEdit={onEdit} />)
  await userEvent.click(screen.getByRole('button', { name:'Call client High' }))
  expect(onEdit).toHaveBeenCalledWith(task)
  view.rerender(<TaskCalendar tasks={[{...task, title:'Updated call', status:'completed'}]} language="en" onEdit={onEdit} />)
  expect(screen.queryByText('Call client')).toBeNull()
  expect(screen.getByRole('button', { name:'Updated call Completed' })).toBeVisible()
  await userEvent.click(screen.getByRole('button', { name:'Next month' }))
  expect(screen.queryByText('Updated call')).toBeNull()
  await userEvent.click(screen.getByRole('button', { name:'Today' }))
  expect(screen.getByText('Updated call')).toBeVisible()
})

it('exports an all-day deadline with an exclusive end date across years', () => {
  const url = new URL(taskCalendarLink({title:'Call Ana & João', due_date:'2026-12-31'}))
  expect(url.searchParams.get('text')).toBe('Call Ana & João')
  expect(url.searchParams.get('dates')).toBe('20261231/20270101')
})
