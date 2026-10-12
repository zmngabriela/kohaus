import { parseBudget, normalizeTypes } from './clientCriteria'
import { matchProperties } from './opportunities'
it('parses grouped EUR budgets and decimals without losing thousands', () => {
  for (const value of ['700.000', '700,000', '700000', '700.000,00', '700,000.00', '700 000 €']) expect(parseBudget(value)).toBe(700000)
  expect(parseBudget('1400,50')).toBe(1400.5)
  expect(parseBudget('')).toBe(0)
  expect(() => parseBudget('invalid')).toThrow()
})
it('unifies both apartment identifiers for existing profiles and properties', () => {
  expect(normalizeTypes(['piso', 'apartamento', 'casa'])).toEqual(['apartamento', 'casa'])
  const property = { status: 'active', operation: 'comprar', type: 'piso', priceValue: 650000, rooms: 2, bathrooms: 2, surface: 100 }
  expect(matchProperties({ operation: 'comprar', types: ['apartamento'], budgetMax: parseBudget('700.000'), minRooms: 2, minBathrooms: 2, minSurface: 100 }, [property])).toEqual([property])
})
