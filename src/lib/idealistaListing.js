// Spanish public listing URLs can include a language prefix and a photo-gallery suffix.
export function idealistaListingId(value) {
  try {
    const url = new URL(value)
    if (url.protocol !== 'https:' || !['idealista.com', 'www.idealista.com'].includes(url.hostname)) return ''
    return url.pathname.match(/^\/(?:[a-z]{2}\/)?inmueble\/(\d+)(?:\/|$)/)?.[1] || ''
  } catch {
    return ''
  }
}

// Partial preview of the operation block; legacy portal identifiers need confirmation at handover.
export function idealistaOperationPreview(property) {
  const operationType = { comprar: 'sale', alquilar: 'rent' }[property.operation]
  const operationPrice = Number(property.priceValue)
  if (!operationType || property.offMarket || property.status !== 'active' ||
      (property.currency || 'EUR') !== 'EUR' || !Number.isFinite(operationPrice) || operationPrice <= 0) return null
  return { propertyReference: property.reference, propertyOperation: { operationType, operationPrice } }
}
