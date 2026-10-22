import { fireEvent, render, screen, cleanup } from '@testing-library/react'
import { afterEach, beforeEach, expect, it } from 'vitest'
import CookieConsent from './CookieConsent'
import { readConsent } from '../lib/analytics'
beforeEach(() => localStorage.clear())
afterEach(cleanup)
it('allows refusal and reopening preferences without preselecting analytics', () => {
 render(<CookieConsent language="pt" view="home" />)
 fireEvent.click(screen.getByText('Recusar opcionais'))
 expect(readConsent().analytics).toBe(false)
 expect(screen.queryByRole('complementary')).toBeNull()
 fireEvent.click(screen.getByText('Configurar cookies'))
 expect(screen.getByRole('dialog')).toBeTruthy()
 const boxes=screen.getAllByRole('checkbox')
 expect(boxes[0]).toBeDisabled(); expect(boxes[1]).not.toBeChecked()
 fireEvent.click(boxes[1]); fireEvent.click(screen.getByText('Salvar preferências'))
 expect(readConsent().analytics).toBe(true)
 expect(screen.queryByRole('dialog')).toBeNull()
})
