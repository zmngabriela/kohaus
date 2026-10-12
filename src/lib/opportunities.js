import { propertyPrice } from './propertyPrice'
import { normalizeTypes } from './clientCriteria'
export function propertyExtras(property) {
  return property.portalData?.extras ?? property.extras ?? []
}
export function matchProperties(client, properties) {
  if (client.status === 'closed') return []
  return properties.filter(property => {
    if ((client.budgetMin || client.budgetMax) && (client.currency || 'EUR') !== (property.currency || 'EUR')) return false
    const price = propertyPrice(property)
    if (property.status !== 'active' || property.operation !== client.operation) return false
    if (client.destinations?.length && !client.destinations.includes(property.destination)) return false
    if (client.types?.length && !normalizeTypes(client.types).includes(normalizeTypes([property.type])[0])) return false
    if ((client.budgetMin || client.budgetMax) && (price == null)) return false
    if (client.budgetMin && price < client.budgetMin) return false
    if (client.budgetMax && price > client.budgetMax) return false
    for (const [criterion, field] of [['minRooms', 'rooms'], ['minBathrooms', 'bathrooms'], ['minSurface', 'surface']]) {
      if (client[criterion] && (property[field] == null || !Number.isFinite(Number(property[field])) || Number(property[field]) < Number(client[criterion]))) return false
    }
    return (client.requiredExtras || []).every(extra => propertyExtras(property).includes(extra))
  })
}
export function contactLinks(client) {
  const phone = (client.phone || '').replace(/[^\d+]/g, '')
  const international = phone.startsWith('+') ? phone.slice(1) : phone.startsWith('00') ? phone.slice(2) : ''
  return { phone: /\d{5,}/.test(phone) ? `tel:${phone}` : null, whatsapp: /^\d{7,15}$/.test(international) ? `https://wa.me/${international}` : null, email: client.email ? `mailto:${encodeURIComponent(client.email)}` : null }
}
