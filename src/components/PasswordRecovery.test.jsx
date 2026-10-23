import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import PasswordRecovery from './PasswordRecovery'
afterEach(cleanup)
it('requests recovery on the same environment and displays a neutral confirmation', async () => {
 const resetPasswordForEmail = vi.fn().mockResolvedValue({error:null})
 render(<PasswordRecovery language="pt" client={{auth:{resetPasswordForEmail}}} initialEmail="test@example.com" />)
 fireEvent.click(screen.getByText('Enviar link de recuperação'))
 await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Se este e-mail tiver uma conta'))
 expect(resetPasswordForEmail).toHaveBeenCalledWith('test@example.com',{redirectTo:`${location.origin}/?view=dashboard&lang=pt`})
 expect(screen.queryByText('Enviar link de recuperação')).toBeNull()
})
it('allows retry after a service error', async () => {
 render(<PasswordRecovery language="pt" client={{auth:{resetPasswordForEmail:vi.fn().mockResolvedValue({error:{message:'limit'}})}}} initialEmail="test@example.com" />)
 fireEvent.click(screen.getByText('Enviar link de recuperação'))
 await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy())
 expect(screen.getByText('Enviar link de recuperação')).not.toBeDisabled()
})
