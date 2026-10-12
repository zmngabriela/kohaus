import { parseBudget } from './clientCriteria'

// Existing listings may only have a visible price. Interpret exact amounts only;
// prose, ranges and abbreviated prices remain unknown rather than guessed.
export function propertyPrice(property) {
  const numeric = property.priceValue
  if (numeric != null && Number.isFinite(Number(numeric)) && Number(numeric) > 0) return Number(numeric)
  try {
    const visible = parseBudget(property.priceLabel)
    return visible > 0 ? visible : null
  } catch {
    return null
  }
}

export function priceFields(value, currency = 'EUR') {
  const priceValue = String(value ?? '').trim() ? parseBudget(value) : null
  return {
    priceValue,
    priceLabel: priceValue == null ? '' : new Intl.NumberFormat('es-ES', { style: 'currency', currency, maximumFractionDigits: 2 }).format(priceValue),
  }
}

export const CURRENCIES = ['EUR', 'BRL', 'USD']
