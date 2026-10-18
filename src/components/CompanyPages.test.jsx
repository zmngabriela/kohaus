import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { ContactPage } from './CompanyPages'

describe('general contact', () => {
 it('stores a general enquiry with its language, without a property or newsletter subscription', async () => {
  const save = vi.fn().mockResolvedValue([])
  const user = userEvent.setup()
  render(<ContactPage language="pt" onSubmit={save} />)
  for (const [label,value] of [['Nome','Ana'],['Sobrenome','Silva'],['E-mail','ana@example.com'],['Telefone','123456789'],['Mensagem','Gostaria de conversar.']]) await user.type(screen.getByLabelText(label,{exact:true}),value)
  await user.click(screen.getByRole('checkbox'))
  await user.click(screen.getByRole('button',{name:'Enviar mensagem'}))
  await waitFor(()=>expect(save).toHaveBeenCalledWith(expect.objectContaining({language:'pt',operation:'contact',source:'website-contact',comments:'Gostaria de conversar.',newsletterAccepted:false})))
  expect(await screen.findByRole('status')).toHaveTextContent('Mensagem recebida')
 })
 it('shows a failure instead of confirming a message that was not saved', async () => {
  const user = userEvent.setup()
  render(<ContactPage language="en" onSubmit={vi.fn().mockRejectedValue(new Error('offline'))} />)
  for (const [label,value] of [['First name','Ana'],['Last name','Silva'],['Email','ana@example.com'],['Phone','123456789'],['Message','Hello']]) await user.type(screen.getByLabelText(label,{exact:true}),value)
  await user.click(screen.getByRole('checkbox'))
  await user.click(screen.getByRole('button',{name:'Send message'}))
  expect(await screen.findByRole('alert')).toHaveTextContent('Could not send')
  expect(screen.getByLabelText('Message',{exact:true})).toHaveValue('Hello')
 })
})
