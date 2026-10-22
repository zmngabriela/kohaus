import { beforeEach, describe, expect, it } from 'vitest'
import { CONSENT_KEY, CONSENT_TTL, readConsent, storeConsent, syncAnalytics } from './analytics'
beforeEach(() => { localStorage.clear(); document.getElementById('kohaus-analytics')?.remove(); window.dataLayer = [] })
describe('cookie consent', () => {
 it('requires a valid, unexpired explicit choice', () => {
  expect(readConsent()).toBeNull()
  storeConsent(false); expect(readConsent().analytics).toBe(false)
  storeConsent(true); expect(readConsent().analytics).toBe(true)
  localStorage.setItem(CONSENT_KEY, JSON.stringify({version:1, analytics:true, at:Date.now()-CONSENT_TTL-1}))
  expect(readConsent()).toBeNull()
  localStorage.setItem(CONSENT_KEY, 'broken'); expect(readConsent()).toBeNull()
 })
 it('does not load Google before consent or in development or CRM', () => {
  syncAnalytics(false, 'home', 'pt', true)
  syncAnalytics(true, 'home', 'pt', false)
  syncAnalytics(true, 'dashboard', 'pt', true)
  expect(document.getElementById('kohaus-analytics')).toBeNull()
  expect(window.dataLayer).toEqual([])
 })
 it('clears analytics cookies on refusal, preserving unrelated cookies', () => {
  document.cookie='_ga=test; path=/'
  document.cookie='other=test; path=/'
  syncAnalytics(false, 'home', 'pt', false)
  expect(document.cookie).not.toContain('_ga=')
  expect(document.cookie).toContain('other=test')
 })
})

it('loads once after permission, deduplicates pageviews and blocks CRM', async () => {
 const { vi } = await import('vitest')
 vi.resetModules()
 vi.stubGlobal('location', {hostname:'www.example.com', origin:'https://www.example.com'})
 delete window.gtag
 const { syncAnalytics: sync } = await import('./analytics')
 try {
  sync(false, 'home', 'pt', true)
  expect(document.getElementById('kohaus-analytics')).toBeNull()
  sync(true, 'home', 'pt', true)
  sync(true, 'home', 'pt', true)
  expect(document.querySelectorAll('#kohaus-analytics')).toHaveLength(1)
  expect(window.dataLayer.filter(args => args[0] === 'event')).toHaveLength(1)
  sync(true, 'contact', 'pt', true)
  expect(window.dataLayer.filter(args => args[0] === 'event')).toHaveLength(2)
  sync(true, 'dashboard', 'pt', true)
  expect(window['ga-disable-G-YZZQDVVQLX']).toBe(true)
  expect(window.dataLayer.filter(args => args[0] === 'event')).toHaveLength(2)
  sync(false, 'home', 'pt', true)
  expect(window['ga-disable-G-YZZQDVVQLX']).toBe(true)
 } finally { vi.unstubAllGlobals() }
})
