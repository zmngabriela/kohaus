import { propertyPrice } from './propertyPrice'
import { matchProperties } from './opportunities'
it('matches EIX056 using its actual visible price when the numeric column is empty', () => {
  const property = { status: 'active', operation: 'comprar', type: 'piso', destination: 'barcelona', priceValue: null, priceLabel: '1 235 000', rooms: 3, bathrooms: 2, surface: 110 }
  const client = { operation: 'comprar', types: ['apartamento'], budgetMax: 1500000, minRooms: 2, minBathrooms: 2, minSurface: 100 }
  expect(propertyPrice(property)).toBe(1235000)
  expect(matchProperties(client, [property])).toEqual([property])
  expect(matchProperties({ ...client, budgetMax: 700000 }, [property])).toEqual([])
})
it('handles legacy zeroes but does not invent prices from prose or abbreviations', () => {
  expect(propertyPrice({ priceValue: 0, priceLabel: '470000' })).toBe(470000)
  expect(propertyPrice({ priceValue: 500000, priceLabel: '470000' })).toBe(500000)
  for (const priceLabel of ['', 'Sob consulta', '1.2M', '400000–500000']) expect(propertyPrice({ priceLabel })).toBeNull()
})

it('derives both stored fields from one input and clears the old price when blank', async () => {
  const { priceFields } = await import('./propertyPrice')
  expect(priceFields('1.235.000').priceValue).toBe(1235000)
  expect(priceFields('1.235.000').priceLabel).toContain('1.235.000')
  expect(priceFields('')).toEqual({ priceValue: null, priceLabel: '' })
  expect(() => priceFields('abc')).toThrow()
})

it('formats the selected currency and prevents mismatched currency budgets', async () => {
  const { priceFields } = await import('./propertyPrice')
  expect(priceFields('700.000', 'BRL').priceLabel).toContain('BRL')
  const property = { status: 'active', operation: 'comprar', priceValue: 500000, currency: 'BRL' }
  expect(matchProperties({ operation: 'comprar', budgetMax: 700000, currency: 'EUR' }, [property])).toEqual([])
  expect(matchProperties({ operation: 'comprar', budgetMax: 700000, currency: 'BRL' }, [property])).toEqual([property])
})
