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
