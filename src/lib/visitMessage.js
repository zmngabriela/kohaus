export function visitMessage(visit, property, client, language = 'es') {
  const date = new Date(visit.scheduledAt)
  if (Number.isNaN(date.getTime())) return null
  const when = new Intl.DateTimeFormat(language, { dateStyle: 'long', timeStyle: 'short' }).format(date)
  const name = visit.contactName || client?.name || ''
  const place = property?.privateAddress || visit.location || property?.title || ''
  return {
    pt: { subject: 'Confirmação de visita | KOHAUS', body: `Olá${name ? `, ${name}` : ''}!\n\nConfirmamos sua visita para ${when}.${place ? `\nLocal: ${place}.` : ''}\n\nSerá um prazer receber você. Se precisar cancelar ou remarcar, por favor responda com antecedência.\n\nAté breve,\nEquipe KOHAUS` },
    es: { subject: 'Confirmación de visita | KOHAUS', body: `¡Hola${name ? `, ${name}` : ''}!\n\nConfirmamos tu visita para el ${when}.${place ? `\nLugar: ${place}.` : ''}\n\nSerá un placer recibirte. Si necesitas cancelar o cambiar la fecha, responde con antelación.\n\nHasta pronto,\nEquipo KOHAUS` },
    en: { subject: 'Viewing confirmation | KOHAUS', body: `Hello${name ? `, ${name}` : ''}!\n\nYour viewing is confirmed for ${when}.${place ? `\nLocation: ${place}.` : ''}\n\nWe look forward to welcoming you. If you need to cancel or reschedule, please reply in advance.\n\nSee you soon,\nThe KOHAUS team` },
  }[language]
}
