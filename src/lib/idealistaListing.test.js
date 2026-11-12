import { expect, it } from 'vitest'
import { idealistaListingId, idealistaOperationPreview } from './idealistaListing'

it('recognizes the same Spanish listing across languages and gallery links', () => {
  expect(idealistaListingId('https://www.idealista.com/inmueble/12345/')).toBe('12345')
  expect(idealistaListingId('https://idealista.com/en/inmueble/12345/foto/2/?x=1')).toBe('12345')
})

it('ignores agency URLs, unrelated domains and malformed links', () => {
  for (const url of ['', 'KH0115', 'https://idealista.com/agencia/12345', 'https://idealista.com.example.com/inmueble/12345']) {
    expect(idealistaListingId(url)).toBe('')
  }
})

it('reflects a price edit in the same reference and excludes off-market properties', () => {
  const property = { reference:'KH0115', operation:'comprar', status:'active', priceValue:'300000' }
  expect(idealistaOperationPreview(property)?.propertyOperation.operationPrice).toBe(300000)
  expect(idealistaOperationPreview({ ...property, priceValue:310000 })).toEqual({
    propertyReference:'KH0115', propertyOperation:{ operationType:'sale', operationPrice:310000 },
  })
  expect(idealistaOperationPreview({ ...property, offMarket:true })).toBeNull()
})
