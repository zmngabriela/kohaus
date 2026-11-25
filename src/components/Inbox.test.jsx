import { render,screen,within,waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach,it,expect,vi } from 'vitest'
import Inbox from './Inbox'
import { inboxDemo } from '../lib/inboxDemo'
beforeEach(()=>{localStorage.clear();sessionStorage.clear();Element.prototype.scrollIntoView=vi.fn()})
it('lets staff review a demo, add a note and save an explicitly unsent reply',async()=>{
 const user=userEvent.setup();render(<Inbox forceLocal userId="ui-test" {...inboxDemo}/>)
 await user.click(await screen.findByRole('button',{name:'Ver demonstração'}))
 await screen.findByRole('heading',{name:'Marina · Exemplo'})
 await user.type(screen.getByRole('textbox',{name:'Nota interna'}),'Ligar amanhã')
 await user.click(screen.getByRole('button',{name:'Salvar nota'}))
 await waitFor(()=>expect(within(screen.getByRole('region',{name:'Conversa'})).getByText('Ligar amanhã')).toBeVisible())
 await user.click(screen.getByRole('button',{name:'Resposta',exact:true}))
 await user.type(screen.getByRole('textbox',{name:'Resposta'}),'Olá, vamos conversar')
 await user.click(screen.getByRole('button',{name:'Salvar resposta de teste'}))
 expect(await screen.findByText('Teste local · não enviada')).toBeVisible()
 await user.click(screen.getByRole('tab',{name:'Eventos'}))
 expect(screen.getByText('Atendimento criado')).toBeVisible()
})
it('keeps viewers read-only',async()=>{
 const user=userEvent.setup();render(<Inbox forceLocal userId="viewer-test" role="viewer" {...inboxDemo}/>)
 await user.click(await screen.findByRole('button',{name:'Ver demonstração'}))
 await screen.findByRole('heading',{name:'Marina · Exemplo'})
 expect(screen.getByRole('button',{name:'Novo atendimento'})).toBeDisabled()
 expect(screen.getByRole('textbox',{name:'Nota interna'})).toBeDisabled()
 expect(screen.getByRole('button',{name:'Salvar nota'})).toBeDisabled()
})
