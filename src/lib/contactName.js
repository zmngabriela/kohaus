export function formatContactName(value) {
  return (value ?? '').trim().replace(/\s+/g, ' ').toLowerCase()
    .replace(/(^|[\s'’\-])(\p{L})/gu, (_, separator, initial) => separator + initial.toUpperCase())
}

export function formatContactNames(record) {
  return { ...record, name: formatContactName(record.name), surname: formatContactName(record.surname) }
}
