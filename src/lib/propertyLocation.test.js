import { expect, it } from 'vitest'
import { propertyCountry, propertyCity, countryLabel } from './propertyLocation'
it('uses the existing municipality and never treats a country as a city', () => {
 expect(propertyCity({destination:'portugal',portalData:{municipality:'Lisboa'}})).toBe('Lisboa')
 expect(propertyCity({destination:'portugal'})).toBe('')
 expect(propertyCountry({destination:'portugal'})).toBe('PT')
 expect(propertyCountry({destination:'Unknown place'})).toBe('')
 expect(propertyCountry({destination:'barcelona',country:'FR'})).toBe('FR')
 expect(countryLabel('PT','en')).toBe('Portugal')
})
