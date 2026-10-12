export const normalizeTypes = types => [...new Set((types || []).map(type => type === 'piso' ? 'apartamento' : type))]

// Accept common EUR grouping formats without treating a thousands separator as decimals.
export function parseBudget(value) {
  const text = String(value ?? '').trim().replace(/[€\s\u00a0]/g, '')
  if (!text) return 0
  let normalized = text
  if (/^\d{1,3}([.,]\d{3})+([.,]\d{1,2})?$/.test(text)) {
    const decimal = text.match(/[.,](\d{1,2})$/)
    normalized = decimal ? text.slice(0, -decimal[0].length).replace(/[.,]/g, '') + '.' + decimal[1] : text.replace(/[.,]/g, '')
  } else if (/^\d+([.,]\d{1,2})?$/.test(text)) {
    normalized = text.replace(',', '.')
  } else throw new Error('Use um valor como 700000 ou 700.000,00.')
  const amount = Number(normalized)
  if (!Number.isFinite(amount) || amount < 0) throw new Error('Orçamento inválido.')
  return amount
}
