export const SUPPORTED_LANGUAGES = ['es', 'en', 'pt']
export function preferredLanguage(languages = [], fallback = 'es') {
  return languages.map(value => String(value || '').toLowerCase().split('-')[0]).find(value => SUPPORTED_LANGUAGES.includes(value)) || fallback
}
export function recipientLanguage(client, lead, fallback = 'es') {
  return preferredLanguage([client?.language, lead?.language], fallback)
}

// Older visits can contain contact details without a client_id. Match only one
// unambiguous contact so that the CRM interface language never chooses theirs.
export function visitRecipient(visit, clients = [], leads = []) {
  const linked = clients.find(client => client.id === visit.clientId)
  if (linked) return linked
  const unique = predicate => { const matches = clients.filter(predicate); return matches.length === 1 ? matches[0] : null }
  const email = String(visit.contactEmail || '').trim().toLowerCase()
  const phone = String(visit.contactPhone || '').replace(/\D/g, '')
  const name = String(visit.contactName || '').trim().toLowerCase().replace(/\s+/g, ' ')
  return (email && unique(client => String(client.email || '').trim().toLowerCase() === email))
    || (phone && unique(client => String(client.phone || '').replace(/\D/g, '') === phone))
    || (name && unique(client => `${client.name || ''} ${client.surname || ''}`.trim().toLowerCase().replace(/\s+/g, ' ') === name))
    || leads.find(lead => lead.id === visit.leadId) || null
}

const replyMarkers = {
  en: new Set('hello hi thanks thank please would could looking interested viewing apartment property rent buy available availability about information the and with from you your'.split(' ')),
  es: new Set('hola gracias favor quisiera gustaría gustaría busco buscando interesado interesada piso inmueble vivienda alquiler alquilar comprar disponible información sobre visita estoy quiero buenos buenas con para una'.split(' ')),
  pt: new Set('olá oi obrigado obrigada gostaria procuro procurando imóvel imóveis aluguel alugar comprar interessado interessada disponível informações sobre visita estou quero bom boa com para uma vocês não pelo'.split(' ')),
}

export function replyLanguage(text, fallback) {
  const words = new Set(String(text || '').toLowerCase().match(/\p{L}+/gu) || [])
  const scores = Object.entries(replyMarkers).map(([language, markers]) => [
    language, [...words].filter(word => markers.has(word)).length,
  ]).sort((a, b) => b[1] - a[1])
  return scores[0][1] > scores[1][1] ? scores[0][0] : fallback
}
