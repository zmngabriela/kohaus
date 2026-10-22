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
 expect(screen.queryByRole('dialog')).toBeNull()
 expect(screen.getByRole('complementary')).toBeTruthy()
 const boxes=screen.getAllByRole('checkbox')
 expect(boxes[0]).toBeDisabled(); expect(boxes[1]).not.toBeChecked()
 fireEvent.click(boxes[2]); fireEvent.click(screen.getByText('Salvar preferências'))
 expect(readConsent().analytics).toBe(true)
 expect(screen.queryByRole('dialog')).toBeNull()
})

it('stores language only with preferences consent and removes it on refusal', () => {
 render(<CookieConsent language="pt" view="home" />)
 fireEvent.click(screen.getByText('Aceitar todos'))
 expect(localStorage.getItem('kohaus-preferred-language')).toBe('pt')
 fireEvent.click(screen.getByText('Configurar cookies'))
 expect(screen.getByLabelText('Preferências e funcionalidades')).toBeChecked()
 fireEvent.click(screen.getByText('Recusar opcionais'))
 expect(localStorage.getItem('kohaus-preferred-language')).toBeNull()
 expect(readConsent().preferences).toBe(false)
})
it('allows preferences independently of analytics', () => {
 render(<CookieConsent language="es" view="home" />)
 fireEvent.click(screen.getByText('Rechazar opcionales'))
 fireEvent.click(screen.getByText('Configurar cookies'))
 fireEvent.click(screen.getByLabelText('Preferencias y funcionalidades'))
 fireEvent.click(screen.getByText('Guardar preferencias'))
 expect(readConsent().preferences).toBe(true)
 expect(readConsent().analytics).toBe(false)
 expect(localStorage.getItem('kohaus-preferred-language')).toBe('es')
})
