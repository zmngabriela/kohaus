import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it } from 'vitest'
import CrmRecord from './CrmRecord'
it('keeps summary visible and opens management in a separate dialog', async () => {
 const user = userEvent.setup()
 render(<CrmRecord title="Client" meta="Contact" language="en"><p>Private notes</p></CrmRecord>)
 expect(screen.queryByText('Private notes')).toBeNull()
 await user.click(screen.getByRole('button', {name:'Manage'}))
 expect(screen.getByRole('dialog', { name: 'Client' })).toBeVisible()
 expect(screen.getByText('Private notes')).toBeVisible()
 await user.click(screen.getByRole('button', {name:'Close'}))
 expect(screen.queryByText('Private notes')).toBeNull()
})
