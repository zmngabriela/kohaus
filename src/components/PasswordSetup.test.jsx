import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import PasswordSetup from './PasswordSetup'
import { readAuthCallback } from '../lib/authCallback'
afterEach(cleanup)
it('recognizes invitation and expired callback without storing tokens', () => {
 expect(readAuthCallback('https://example.com/#type=invite&access_token=secret')).toEqual({active:true,invalid:false})
 expect(readAuthCallback('https://example.com/#error=access_denied&error_code=otp_expired')).toEqual({active:true,invalid:true})
 expect(readAuthCallback('https://example.com/')).toEqual({active:false,invalid:false})
})
it('blocks expired links even when another session exists', () => {
 render(<PasswordSetup language="pt" invalid session={{user:{id:'test'}}} />)
 expect(screen.getByRole('alert')).toHaveTextContent('expirou')
 expect(screen.queryByLabelText('Nova senha')).toBeNull()
})
it('checks confirmation and saves through the authenticated SDK', async () => {
 const updateUser = vi.fn().mockResolvedValue({error:null})
 render(<PasswordSetup language="pt" client={{auth:{updateUser}}} session={{user:{id:'test'}}} />)
 fireEvent.change(screen.getByLabelText('Nova senha'),{target:{value:'example-password'}})
 fireEvent.change(screen.getByLabelText('Confirmar senha'),{target:{value:'another-password'}})
 fireEvent.click(screen.getByText('Salvar senha'))
 expect(updateUser).not.toHaveBeenCalled()
 expect(screen.getByRole('alert')).toHaveTextContent('iguais')
 fireEvent.change(screen.getByLabelText('Confirmar senha'),{target:{value:'example-password'}})
 fireEvent.click(screen.getByText('Salvar senha'))
 await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Senha salva'))
 expect(updateUser).toHaveBeenCalledWith({password:'example-password'})
})
it('shows a recoverable error when saving fails', async () => {
 render(<PasswordSetup language="pt" client={{auth:{updateUser:vi.fn().mockRejectedValue(new Error('network'))}}} session={{user:{id:'test'}}} />)
 for (const label of ['Nova senha','Confirmar senha']) fireEvent.change(screen.getByLabelText(label),{target:{value:'example-password'}})
 fireEvent.click(screen.getByText('Salvar senha'))
 await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Não foi possível'))
 expect(screen.getByText('Salvar senha')).not.toBeDisabled()
})
