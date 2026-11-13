import { expect, it } from 'vitest'
import { privateListings } from '../../supabase/functions/idealista-prospecting/listings'
it('only returns identified private listings with canonical links and no contact data', () => {
  const privateAd={propertyCode:1234,contactInfo:{userType:'private',phone:'hidden'},price:400000}
  const result=privateListings([privateAd,privateAd,{propertyCode:456},{propertyCode:789,contactInfo:{userType:'professional'}}])
  expect(result).toHaveLength(1)
  expect(result[0].url).toBe('https://www.idealista.com/inmueble/1234/')
  expect(JSON.stringify(result)).not.toContain('hidden')
})
