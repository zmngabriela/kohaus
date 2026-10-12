import { visitMessage } from './visitMessage'
export function buildVisitEmail(visit, property, client, language = 'pt') {
  const email = visit.contactEmail || client?.email
  const message = visitMessage(visit, property, client, language)
  if (!email || !message) return ''
  return `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(message.subject)}&body=${encodeURIComponent(message.body)}`
}
