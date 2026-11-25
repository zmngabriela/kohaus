export default function DashboardGrowth({ language, leads, properties }) {
  const labels = {
    pt: { leads: 'Novos leads', properties: 'Imóveis cadastrados', period: 'Últimos 6 meses' },
    es: { leads: 'Nuevos leads', properties: 'Inmuebles registrados', period: 'Últimos 6 meses' },
    en: { leads: 'New leads', properties: 'Properties added', period: 'Last 6 months' },
  }[language]
  const today = new Date()
  const monthFormat = new Intl.DateTimeFormat(language, { month: 'short' })
  const fullDateFormat = new Intl.DateTimeFormat(language, { month: 'long', year: 'numeric' })
  const months = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(today.getFullYear(), today.getMonth() + index - 5, 1)
    return { date, leads: 0, properties: 0 }
  })
  for (const [key, records] of [['leads', leads], ['properties', properties]]) {
    for (const record of records) {
      if (!record.createdAt) continue
      const date = new Date(record.createdAt)
      const index = (date.getFullYear() - today.getFullYear()) * 12 + date.getMonth() - today.getMonth() + 5
      if (months[index] && date <= today) months[index][key] += 1
    }
  }
  const max = Math.max(1, ...months.flatMap(month => [month.leads, month.properties]))

  return <div className="dashboard-growth">
    <p>{labels.period}</p>
    {['leads', 'properties'].map(key => (
      <figure className={`dashboard-growth-chart is-${key}`} key={key}>
        <figcaption>{labels[key]}</figcaption>
        <ol aria-label={labels[key]}>
          {months.map(month => <li key={month.date.getTime()}>
            <div className="dashboard-growth-track" aria-hidden="true">
              <span style={{ '--bar-height': `${100 * month[key] / max}%` }}>
                {month[key] > 0 && <b>{month[key]}</b>}
              </span>
            </div>
            <span aria-hidden="true">{monthFormat.format(month.date)}</span>
            <span className="sr-only">{fullDateFormat.format(month.date)} · {month[key]}</span>
          </li>)}
        </ol>
      </figure>
    ))}
  </div>
}
