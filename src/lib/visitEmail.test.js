import { buildVisitEmail } from './visitEmail'
it('prepares a client confirmation without exposing internal notes', () => {
  const link = buildVisitEmail({ contactName: 'Ana', scheduledAt: '2026-10-12T10:00:00', location: 'Rua A, 12', notes: 'Internal commission' }, null, { email: 'ana@example.com' })
  expect(link).toContain('mailto:ana%40example.com')
  const body = new URLSearchParams(link.split('?')[1]).get('body')
  expect(body).toContain('Olá, Ana!')
  expect(body).toContain('Rua A, 12')
  expect(body).toContain('cancelar ou remarcar')
  expect(body).not.toContain('Internal commission')
})
it('does not create a draft with missing recipient or invalid date', () => {
  expect(buildVisitEmail({ scheduledAt: '2026-10-12' })).toBe('')
  expect(buildVisitEmail({ contactEmail: 'a@example.com', scheduledAt: '' })).toBe('')
})
