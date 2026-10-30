import { expect, it } from 'vitest'
import { propertyNumericRules, portalNumericRules, clientNumericRules, validateNumericFields } from './numericFields'
it('rejects negative quantities and measurements across property and client fields', () => {
  for (const rules of [propertyNumericRules, portalNumericRules, clientNumericRules]) {
    for (const [field, rule] of Object.entries(rules)) {
      if (rule.min === 0) expect(() => validateNumericFields({[field]: '-1'}, rules)).toThrow()
    }
  }
})
it('allows zero, optional blanks, decimal areas and negative coordinates', () => {
  expect(() => validateNumericFields({rooms: 0, bathrooms: 0, surface: '80.5'}, propertyNumericRules)).not.toThrow()
  expect(() => validateNumericFields({latitude: '-27.1', longitude: '-48.5', usefulSurface: ''}, portalNumericRules)).not.toThrow()
})
it('rejects nonfinite values, fractional counts and out of range coordinates', () => {
  for (const value of ['NaN', 'Infinity', '1.5']) expect(() => validateNumericFields({rooms: value}, propertyNumericRules)).toThrow()
  expect(() => validateNumericFields({latitude: 91}, portalNumericRules)).toThrow()
  expect(() => validateNumericFields({longitude: -181}, portalNumericRules)).toThrow()
})
