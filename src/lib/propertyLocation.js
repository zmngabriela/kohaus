// Municipality is the city. destination remains a compatibility key for existing filters.
export function propertyCountry(property = {}) {
 if (property.country) return property.country
 const place = String(property.destination || '').trim().toLowerCase()
 if (['portugal'].includes(place)) return 'PT'
 if (['brasil','brazil','itapema','balneario camboriu','balneário camboriú'].includes(place)) return 'BR'
 if (['barcelona','costa-brava','costa brava'].includes(place)) return 'ES'
 return ''
}
export function countryLabel(country, language = 'es') {
 if (!country) return ''
 if (!/^[A-Z]{2}$/.test(country)) return country
 try { return new Intl.DisplayNames([language], {type:'region'}).of(country) } catch { return country }
}
export function propertyCity(property = {}) {
 const municipality = property.portalData?.municipality || property.portal_data?.municipality
 if (municipality?.trim()) return municipality.trim()
 const destination = property.destination || ''
 return ['portugal','brasil','brazil'].includes(destination.toLowerCase()) ? '' : destination
}
