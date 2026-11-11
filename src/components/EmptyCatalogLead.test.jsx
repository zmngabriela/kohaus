import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it, vi } from 'vitest'
import EmptyCatalogLead from './EmptyCatalogLead'

it('keeps the search criteria in a CRM lead even without an additional message', async () => {
  const save = vi.fn().mockResolvedValue([])
  const user = userEvent.setup()
  const criteria = 'Alugar · Barcelona · Preço ≤ 2000 EUR · Quartos: 2+'
  render(<EmptyCatalogLead language="pt" operation="alquilar" city="Barcelona" criteria={criteria} onSubmit={save} />)
  await user.click(screen.getByRole('button', {name:'Avise-me quando receber algo assim'}))
  for (const [label, value] of [['Nome','Ana'], ['Sobrenome','Silva'], ['E-mail','ana@example.com'], ['Telefone','123456789']]) {
    await user.type(screen.getByLabelText(label, {exact:true}), value)
  }
  await user.click(screen.getByRole('checkbox'))
  await user.click(screen.getByRole('button', {name:'Enviar mensagem'}))
  expect(await screen.findByRole('status')).toHaveTextContent('Busca registrada')
  expect(save).toHaveBeenCalledWith(expect.objectContaining({source:'catalog-alert', operation:'alquilar', comments:criteria, language:'pt', legalAccepted:true, newsletterAccepted:false}))
})

