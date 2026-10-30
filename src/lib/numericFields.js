// Coordinates and floor labels can legitimately be negative.
export const propertyNumericRules = {
  surface: { min: 0, step: 'any' }, rooms: { min: 0, step: 1 }, bathrooms: { min: 0, step: 1 },
}
export const portalNumericRules = {
  latitude: { min: -90, max: 90, step: 'any' },
  longitude: { min: -180, max: 180, step: 'any' },
  buildingYear: { min: 0, step: 1 }, numberOfFloors: { min: 0, step: 1 },
  usefulSurface: { min: 0, step: 'any' }, builtSurface: { min: 0, step: 'any' },
  energyConsumptionValue: { min: 0, step: 'any' }, energyEmissionsValue: { min: 0, step: 'any' },
}
export const clientNumericRules = {
  minRooms: { min: 0, step: 1 }, minBathrooms: { min: 0, step: 1 }, minSurface: { min: 0, step: 'any' },
}
export function validateNumericFields(values, rules, labels = {}, language = 'pt') {
  for (const [field, rule] of Object.entries(rules)) {
    const raw = values?.[field]
    if (raw == null || String(raw).trim() === '') continue
    const value = Number(raw)
    if (!Number.isFinite(value) || value < rule.min || (rule.max != null && value > rule.max) || (rule.step === 1 && !Number.isInteger(value))) {
      const message = { pt: 'Informe um valor válido no campo', es: 'Introduce un valor válido en el campo', en: 'Enter a valid value for' }
      throw new Error(`${message[language] || message.pt}: ${labels[field] || field}.`)
    }
  }
}
